import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'

/** Records every request supabase-js sends and replies with a canned response. */
const calls: { method: string; url: URL; body: unknown }[] = []
let reply: { status: number; body: unknown } = { status: 200, body: [] }

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key'
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    calls.push({ method: init?.method ?? 'GET', url, body: init?.body ? JSON.parse(String(init.body)) : undefined })
    return new Response(JSON.stringify(reply.body), {
      status: reply.status, headers: { 'Content-Type': 'application/json' },
    })
  })
})

beforeEach(() => {
  calls.length = 0
  reply = { status: 200, body: [] }
})

const store = async () => (await import('./supabase-store')).supabaseStore
const NOT_CANCELLED = '(status.is.null,status.neq.cancelled)'

describe('supabaseStore', () => {
  it('reads availability for one date, excluding cancelled rows, with the service key', async () => {
    reply.body = [{ start_hour: 9, duration: 1 }]
    expect(await (await store()).bookedSlots('2026-10-18')).toEqual([{ start_hour: 9, duration: 1 }])
    const { url } = calls[0]
    expect(url.pathname).toBe('/rest/v1/bookings')
    expect(url.searchParams.get('select')).toBe('start_hour,duration')
    expect(url.searchParams.get('booking_date')).toBe('eq.2026-10-18')
    expect(url.searchParams.get('or')).toBe(NOT_CANCELLED)
  })

  it('books a group through the create_booking_group function', async () => {
    reply.body = ['id-1', 'id-2']
    const result = await (await store()).createGroup({
      guest_name: 'Maria Santos', phone: '09171234567', email: '', booking_date: '2026-10-18',
      hours: [10, 14], prices: [300, 300], gcash_ref: '1234567890123',
    })
    expect(result).toEqual({ ids: ['id-1', 'id-2'] })
    expect(calls[0].method).toBe('POST')
    expect(calls[0].url.pathname).toBe('/rest/v1/rpc/create_booking_group')
    expect(calls[0].body).toMatchObject({ p_hours: [10, 14], p_prices: [300, 300], p_gcash_ref: '1234567890123' })
  })

  it('maps database errors from the booking function', async () => {
    const s = await store()
    const args = {
      guest_name: 'A B', phone: '09171234567', email: '', booking_date: '2026-10-18',
      hours: [10], prices: [300], gcash_ref: '1234567890123',
    }
    reply = { status: 400, body: { code: 'P0001', message: 'SLOT_CONFLICT' } }
    expect(await s.createGroup(args)).toEqual({ error: 'conflict' })
    reply = { status: 409, body: { code: '23P01', message: 'conflicting key value violates exclusion constraint' } }
    expect(await s.createGroup(args)).toEqual({ error: 'conflict' })
    reply = { status: 400, body: { code: 'P0001', message: 'DUPLICATE_REF' } }
    expect(await s.createGroup(args)).toEqual({ error: 'duplicate_ref' })
    reply = { status: 400, body: { code: '22023', message: 'INVALID_BOOKING' } }
    await expect(s.createGroup(args)).rejects.toThrow()
  })

  it('finds a booking by reference using an id range, not LIKE on a uuid', async () => {
    await (await store()).findByPrefix('a1b2c3')
    const params = calls[0].url.searchParams
    expect(params.getAll('id')).toEqual([
      'gte.a1b2c300-0000-0000-0000-000000000000', 'lte.a1b2c3ff-ffff-ffff-ffff-ffffffffffff',
    ])
    expect(params.get('or')).toBe(NOT_CANCELLED)
  })

  it('cancels rows with a filtered update and counts the rows changed', async () => {
    reply.body = [{ id: 'a' }, { id: 'b' }]
    expect(await (await store()).cancelRows(['a', 'b'])).toBe(2)
    const { method, url, body } = calls[0]
    expect(method).toBe('PATCH')
    expect(url.searchParams.get('id')).toBe('in.(a,b)')
    expect(url.searchParams.get('or')).toBe(NOT_CANCELLED)
    expect(body).toEqual({ status: 'cancelled' })
  })

  it('reports zero when a payment update matched no row', async () => {
    reply.body = []
    expect(await (await store()).setPaid('missing', true)).toBe(0)
    expect(calls[0].method).toBe('PATCH')
    expect(calls[0].url.searchParams.get('id')).toBe('eq.missing')
  })
})
