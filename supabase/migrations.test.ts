import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'

const sql = (name: string) => readFileSync(fileURLToPath(new URL(`./migrations/${name}`, import.meta.url)), 'utf8')
const M001 = sql('001_create_booking_rpc.sql')
const M002 = sql('002_secure_booking.sql')
const M003 = sql('003_lock_down_public_access.sql')

/** Approximation of production today: Supabase roles, the table, migration 001, and the AUDIT_REPORT policies. */
const PRODUCTION_TODAY = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create table public.bookings (
    id uuid primary key default gen_random_uuid(),
    guest_name text not null,
    phone text not null,
    email text,
    booking_date date not null,
    start_hour int not null,
    duration int not null default 1,
    total_price numeric not null,
    gcash_ref text not null,
    is_paid boolean not null default false,
    status text default 'confirmed',
    created_at timestamptz not null default now()
  );
  grant all on public.bookings to anon, authenticated, service_role;
  alter table public.bookings enable row level security;
  create policy "Allow public bookings insert" on public.bookings for insert to anon with check (true);
  create policy "Allow public availability read" on public.bookings for select to anon using (status != 'cancelled');
`

async function freshDb(seed = '') {
  const db = await PGlite.create({ extensions: { btree_gist } })
  await db.exec(PRODUCTION_TODAY)
  await db.exec(M001)
  if (seed) await db.exec(seed)
  return db
}

async function as<T>(db: PGlite, role: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${role}`)
  try { return await fn() } finally { await db.exec('reset role') }
}

async function failure(p: Promise<unknown>) {
  try { await p } catch (e) { return { code: (e as { code?: string }).code, message: (e as Error).message } }
  return { code: 'none', message: 'no error' }
}

function bookGroup(db: PGlite, date: string, hours: number[], ref: string, phone = '09171234567') {
  return db.query<{ ids: string[] }>(
    `select public.create_booking_group($1, $2, $3, $4::date, $5::int[], $6::numeric[], $7) as ids`,
    ['Maria Santos', phone, '', date, hours, hours.map(() => 300), ref],
  )
}

const count = async (db: PGlite, where = 'true') =>
  Number((await db.query<{ n: number }>(`select count(*)::int as n from public.bookings where ${where}`)).rows[0].n)

describe('002_secure_booking (run before deploying the new code)', () => {
  let db: PGlite
  beforeAll(async () => {
    db = await freshDb()
    await db.exec(M002)
  })

  it('is safe to re-run', async () => {
    await expect(db.exec(M002)).resolves.toBeDefined()
  })

  it('keeps the old site working until the new code is live', async () => {
    await as(db, 'anon', () => db.query(
      `select create_booking('A B', '09170000000', '', '2026-11-01', 9, 1, 300, '1111111111111')`))
    expect(await as(db, 'anon', () => count(db, `booking_date = '2026-11-01'`))).toBe(1)
  })

  it('books every chosen hour in one call and returns ids in hour order', async () => {
    const { rows } = await as(db, 'service_role', () => bookGroup(db, '2026-11-02', [10, 14, 15], '2222222222222'))
    expect(rows[0].ids).toHaveLength(3)
    const hours = await db.query<{ start_hour: number }>(
      `select start_hour from bookings where id = any($1::uuid[]) order by array_position($1::uuid[], id)`, [rows[0].ids])
    expect(hours.rows.map(r => r.start_hour)).toEqual([10, 14, 15])
  })

  it('books nothing when any one hour is taken', async () => {
    await as(db, 'service_role', () => bookGroup(db, '2026-11-03', [12], '3333333333333'))
    const err = await failure(as(db, 'service_role', () => bookGroup(db, '2026-11-03', [10, 12], '3333333333334')))
    expect(err.message).toContain('SLOT_CONFLICT')
    expect(await count(db, `booking_date = '2026-11-03'`)).toBe(1)
  })

  it('treats cancelled rows as free', async () => {
    await as(db, 'service_role', () => bookGroup(db, '2026-11-04', [9], '4444444444444'))
    await db.exec(`update bookings set status = 'cancelled' where booking_date = '2026-11-04'`)
    await expect(as(db, 'service_role', () => bookGroup(db, '2026-11-04', [9], '4444444444445'))).resolves.toBeDefined()
  })

  it('rejects a GCash reference already used by a live booking', async () => {
    await as(db, 'service_role', () => bookGroup(db, '2026-11-05', [9], '5555555555555'))
    const err = await failure(as(db, 'service_role', () => bookGroup(db, '2026-11-06', [9], '5555555555555')))
    expect(err.message).toContain('DUPLICATE_REF')
  })

  it('rejects invalid hours, counts, phones and refs', async () => {
    for (const [hours, ref, phone] of [
      [[7], '6666666666661', '09171234567'],
      [[21], '6666666666662', '09171234567'],
      [[9, 9], '6666666666663', '09171234567'],
      [[8, 9, 10, 11, 12], '6666666666664', '09171234567'],
      [[9], '12', '09171234567'],
      [[9], '6666666666665', '12345'],
    ] as const) {
      const err = await failure(as(db, 'service_role', () => bookGroup(db, '2026-11-07', [...hours], ref, phone)))
      expect(err.message).toContain('INVALID_BOOKING')
    }
    expect(await count(db, `booking_date = '2026-11-07'`)).toBe(0)
  })

  it('cannot be called by the public roles', async () => {
    for (const role of ['anon', 'authenticated']) {
      const err = await failure(as(db, role, () => bookGroup(db, '2026-11-08', [9], '7777777777777')))
      expect(err.code).toBe('42501')
    }
  })

  it('makes the database itself reject overlapping live rows', async () => {
    await as(db, 'service_role', () => bookGroup(db, '2026-11-09', [10], '8888888888888'))
    const err = await failure(db.query(
      `insert into bookings (guest_name, phone, booking_date, start_hour, duration, total_price, gcash_ref)
       values ('X', '09170000000', '2026-11-09', 9, 2, 600, '8888888888889')`))
    expect(err.code).toBe('23P01')
  })
})

describe('002 on data that already contains overlaps', () => {
  it('still applies (skipping only the overlap constraint) so the rollout is not blocked', async () => {
    const db = await freshDb(`
      insert into bookings (guest_name, phone, booking_date, start_hour, duration, total_price, gcash_ref) values
        ('A', '09170000000', '2026-11-10', 10, 1, 300, '1000000000001'),
        ('B', '09170000001', '2026-11-10', 10, 1, 300, '1000000000002');`)
    await expect(db.exec(M002)).resolves.toBeDefined()
    const fn = await db.query(`select 1 from pg_proc where proname = 'create_booking_group'`)
    expect(fn.rows).toHaveLength(1)
  })
})

describe('003_lock_down_public_access (run after the new code is live)', () => {
  let db: PGlite
  beforeAll(async () => {
    db = await freshDb()
    await db.exec(M002)
    await as(db, 'service_role', () => bookGroup(db, '2026-11-11', [9], '9000000000001'))
    await db.exec(M003)
  })

  it('is safe to re-run', async () => {
    await expect(db.exec(M003)).resolves.toBeDefined()
  })

  it('removes all public access to the bookings table', async () => {
    for (const role of ['anon', 'authenticated']) {
      await as(db, role, async () => {
        expect((await failure(db.query('select * from public.bookings'))).code).toBe('42501')
        expect((await failure(db.query(`insert into public.bookings (guest_name, phone, booking_date, start_hour, total_price, gcash_ref)
          values ('X', '09170000000', '2026-11-12', 9, 1, '9000000000002')`))).code).toBe('42501')
        expect((await failure(db.query(`update public.bookings set is_paid = true`))).code).toBe('42501')
      })
    }
    expect((await db.query(`select 1 from pg_policies where tablename = 'bookings'`)).rows).toHaveLength(0)
  })

  it('removes the old public booking function', async () => {
    const err = await failure(as(db, 'anon', () => db.query(
      `select create_booking('A B', '09170000000', '', '2026-11-13', 9, 1, 1, '9000000000003')`)))
    expect(err.code).toBe('42883')
  })

  it('leaves the server (service_role) fully working', async () => {
    await expect(as(db, 'service_role', () => bookGroup(db, '2026-11-14', [9, 10], '9000000000004'))).resolves.toBeDefined()
    expect(await as(db, 'service_role', () => count(db))).toBe(3)
  })
})
