import { describe, it, expect } from 'vitest'
import {
  getAvailability, createBooking, lookupBooking, cancelBookingByGuest,
  adminList, adminSetPaid, adminCancel,
  type BookingStore, type BookingRow, type CreateGroupArgs,
} from './booking-service'

const NOW = { dateStr: '2026-10-17', hour: 10 }
// 2026-10-18 06:00 Manila = 2026-10-17T22:00Z
const NOW_MS = Date.parse('2026-10-17T22:00:00Z')

const input = {
  firstName: ' Maria ', lastName: 'Santos', phone: '+639171234567', email: 'maria@example.com',
  date: '2026-10-18', hours: [14, 10], gcashRef: '1234567890123',
}

let idSeq = 0
function row(overrides: Partial<BookingRow>): BookingRow {
  idSeq++
  return {
    id: `${String(idSeq).padStart(6, '0')}aa-0000-0000-0000-000000000000`,
    guest_name: 'Ana Cruz', phone: '09170000000', email: '', booking_date: '2026-10-18',
    start_hour: 9, duration: 1, total_price: 300, gcash_ref: '9999999999999',
    is_paid: false, status: 'confirmed', created_at: '', ...overrides,
  }
}

/** In-memory stand-in for Supabase + create_booking_group: all-or-nothing, overlap- and ref-checked. */
function memoryStore(initial: BookingRow[] = []) {
  const rows = [...initial]
  const groups: CreateGroupArgs[] = []
  const live = () => rows.filter(r => r.status !== 'cancelled')
  const store: BookingStore = {
    async bookedSlots(date) { return live().filter(r => r.booking_date === date) },
    async createGroup(args) {
      groups.push(args)
      if (live().some(r => r.gcash_ref === args.gcash_ref)) return { error: 'duplicate_ref' }
      const taken = live().filter(r => r.booking_date === args.booking_date).map(r => r.start_hour)
      if (args.hours.some(h => taken.includes(h))) return { error: 'conflict' }
      const ids = args.hours.map((h, i) => {
        const r = row({
          guest_name: args.guest_name, phone: args.phone, email: args.email,
          booking_date: args.booking_date, start_hour: h, total_price: args.prices[i], gcash_ref: args.gcash_ref,
        })
        rows.push(r)
        return r.id
      })
      return { ids }
    },
    async findByPrefix(prefix) { return live().filter(r => r.id.startsWith(prefix)) },
    async groupOf(r) {
      return live().filter(x => x.gcash_ref === r.gcash_ref && x.booking_date === r.booking_date && x.phone === r.phone)
    },
    async cancelRows(ids) {
      let n = 0
      for (const r of rows) if (ids.includes(r.id) && r.status !== 'cancelled') { r.status = 'cancelled'; n++ }
      return n
    },
    async listFrom(date) { return live().filter(r => r.booking_date >= date) },
    async setPaid(id, paid) {
      const r = live().find(x => x.id === id)
      if (!r) return 0
      r.is_paid = paid
      return 1
    },
  }
  return { store, rows, groups }
}

describe('getAvailability', () => {
  it('returns booked hours only for a valid date', async () => {
    const { store } = memoryStore([row({ start_hour: 9 }), row({ start_hour: 15, status: 'cancelled' })])
    expect(await getAvailability(store, '2026-10-18')).toEqual({ ok: true, data: [9] })
  })

  it('rejects a malformed date', async () => {
    const { store } = memoryStore()
    expect(await getAvailability(store, '2026-10-18; drop')).toMatchObject({ ok: false, error: 'invalid' })
  })
})

describe('createBooking', () => {
  it('books every hour with server-computed, exactly-summing prices and normalised details', async () => {
    const { store, groups } = memoryStore()
    const result = await createBooking(store, { ...input, hours: [14, 10, 11, 12], totalPrice: 1 }, NOW)
    expect(result.ok).toBe(true)
    expect(groups[0]).toEqual({
      guest_name: 'Maria Santos', phone: '09171234567', email: 'maria@example.com',
      booking_date: '2026-10-18', hours: [10, 11, 12, 14], prices: [250, 250, 250, 250],
      gcash_ref: '1234567890123',
    })
    if (result.ok) {
      expect(result.data.ref).toMatch(/^#PB[0-9A-F]{6}$/)
      expect(result.data.total).toBe(1000)
      expect(result.data.hours).toEqual([10, 11, 12, 14])
    }
  })

  it('rejects malformed payloads and invalid values without touching the store', async () => {
    const { store, groups } = memoryStore()
    expect(await createBooking(store, null, NOW)).toMatchObject({ ok: false, error: 'invalid' })
    expect(await createBooking(store, { ...input, hours: '10' }, NOW)).toMatchObject({ ok: false, error: 'invalid' })
    expect(await createBooking(store, { ...input, hours: [3] }, NOW))
      .toMatchObject({ ok: false, error: 'invalid', fieldErrors: { time: expect.any(String) } })
    expect(groups).toHaveLength(0)
  })

  it('rejects hours that already started at the court even if the device thinks otherwise', async () => {
    const { store } = memoryStore()
    expect(await createBooking(store, { ...input, date: '2026-10-17', hours: [9] }, NOW))
      .toMatchObject({ ok: false, error: 'invalid' })
  })

  it('reports a conflict and books nothing when any chosen hour is taken', async () => {
    const { store, rows } = memoryStore([row({ start_hour: 14 })])
    expect(await createBooking(store, input, NOW)).toMatchObject({ ok: false, error: 'conflict' })
    expect(rows).toHaveLength(1)
  })

  it('reports a reused GCash reference', async () => {
    const { store } = memoryStore([row({ start_hour: 18, gcash_ref: input.gcashRef })])
    expect(await createBooking(store, input, NOW)).toMatchObject({ ok: false, error: 'duplicate_ref' })
  })

  it('maps store failures to a generic error', async () => {
    const broken: BookingStore = { ...memoryStore().store, createGroup: async () => { throw new Error('down') } }
    expect(await createBooking(broken, input, NOW)).toMatchObject({ ok: false, error: 'error' })
  })
})

describe('lookupBooking', () => {
  it('returns every hour of a multi-hour booking with a masked phone', async () => {
    const { store } = memoryStore()
    const created = await createBooking(store, input, NOW)
    if (!created.ok) throw new Error('setup failed')
    const result = await lookupBooking(store, created.data.ref.toLowerCase())
    expect(result).toEqual({
      ok: true,
      data: {
        ref: created.data.ref, guestName: 'Maria Santos', phone: '0917****567',
        bookingDate: '2026-10-18', hours: [10, 14], totalPrice: 600, isPaid: false,
      },
    })
  })

  it('rejects bad formats and reports unknown refs', async () => {
    const { store } = memoryStore()
    expect(await lookupBooking(store, 'hello')).toMatchObject({ ok: false, error: 'invalid' })
    expect(await lookupBooking(store, '#PBABCDEF')).toMatchObject({ ok: false, error: 'not_found' })
  })
})

describe('cancelBookingByGuest', () => {
  it('cancels every hour of the booking when the phone matches', async () => {
    const { store, rows } = memoryStore()
    const created = await createBooking(store, input, NOW)
    if (!created.ok) throw new Error('setup failed')
    const result = await cancelBookingByGuest(store, created.data.ref, '09171234567', NOW_MS)
    expect(result).toMatchObject({ ok: true, data: { hours: [10, 14] } })
    expect(rows.every(r => r.status === 'cancelled')).toBe(true)
  })

  it('refuses a wrong phone', async () => {
    const { store, rows } = memoryStore()
    const created = await createBooking(store, input, NOW)
    if (!created.ok) throw new Error('setup failed')
    expect(await cancelBookingByGuest(store, created.data.ref, '09170000001', NOW_MS))
      .toMatchObject({ ok: false, error: 'phone_mismatch' })
    expect(rows.some(r => r.status === 'cancelled')).toBe(false)
  })

  it('enforces the 2-hour window from the earliest hour', async () => {
    const { store } = memoryStore()
    const created = await createBooking(store, { ...input, hours: [8, 14] }, NOW)
    if (!created.ok) throw new Error('setup failed')
    // 06:00 Manila is exactly 2h before 08:00 → still allowed; 06:01 is too late
    expect(await cancelBookingByGuest(store, created.data.ref, '09171234567', NOW_MS + 60_000))
      .toMatchObject({ ok: false, error: 'too_late' })
    expect(await cancelBookingByGuest(store, created.data.ref, '09171234567', NOW_MS))
      .toMatchObject({ ok: true })
  })
})

describe('admin operations', () => {
  const yes = async () => true
  const no = async () => false

  it('refuse everything without an admin session', async () => {
    const { store, rows } = memoryStore([row({})])
    expect(await adminList(store, no, '2026-10-17')).toEqual({ ok: false, error: 'unauthorized' })
    expect(await adminSetPaid(store, no, rows[0].id, true)).toEqual({ ok: false, error: 'unauthorized' })
    expect(await adminCancel(store, no, rows[0].id)).toEqual({ ok: false, error: 'unauthorized' })
    expect(rows[0]).toMatchObject({ is_paid: false, status: 'confirmed' })
  })

  it('lists from a date, marks paid and cancels', async () => {
    const { store, rows } = memoryStore([row({ booking_date: '2026-10-16' }), row({})])
    const list = await adminList(store, yes, '2026-10-17')
    expect(list.ok && list.data.map(b => b.id)).toEqual([rows[1].id])
    expect(await adminSetPaid(store, yes, rows[1].id, true)).toEqual({ ok: true, data: null })
    expect(rows[1].is_paid).toBe(true)
    expect(await adminCancel(store, yes, rows[1].id)).toEqual({ ok: true, data: null })
    expect(rows[1].status).toBe('cancelled')
  })

  it('reports not_found for zero-row changes and invalid for bad input', async () => {
    const { store } = memoryStore()
    expect(await adminSetPaid(store, yes, 'missing', true)).toEqual({ ok: false, error: 'not_found' })
    expect(await adminCancel(store, yes, 'missing')).toEqual({ ok: false, error: 'not_found' })
    expect(await adminSetPaid(store, yes, 'x', 'yes' as never)).toEqual({ ok: false, error: 'invalid' })
  })
})
