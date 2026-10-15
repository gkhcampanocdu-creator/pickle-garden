import {
  validateBooking, normalizePhone, isValidDateStr, occupiedHours, priceFor, splitPrice,
  bookingRef, refPrefix, pad,
  type BookingInput, type BookingErrors, type CourtNow,
} from './booking-rules'

/**
 * Booking business logic, independent of Next.js and Supabase so it can be unit-tested.
 * Route handlers in app/api/* wire it to the Supabase store and the admin session.
 *
 * Data model: one row per booked hour. Rows sharing gcash_ref + booking_date + phone
 * form one booking; its reference comes from the id of its earliest row.
 */

export type Result<T, E extends string> =
  | { ok: true; data: T }
  | { ok: false; error: E; fieldErrors?: BookingErrors }

export interface BookingRow {
  id: string
  guest_name: string
  phone: string
  email: string | null
  booking_date: string
  start_hour: number
  duration: number
  total_price: number
  gcash_ref: string
  is_paid: boolean
  status: string | null
  created_at: string
}

export interface CreateGroupArgs {
  guest_name: string
  phone: string
  email: string
  booking_date: string
  hours: number[]   // sorted ascending
  prices: number[]  // one per hour, sums to the booking total
  gcash_ref: string
}

/** All reads exclude cancelled rows. */
export interface BookingStore {
  bookedSlots(date: string): Promise<{ start_hour: number; duration: number }[]>
  /** Books every hour or none (atomic in the database). Returns row ids in hour order. */
  createGroup(args: CreateGroupArgs): Promise<{ ids: string[] } | { error: 'conflict' | 'duplicate_ref' }>
  findByPrefix(prefix: string): Promise<BookingRow[]>
  groupOf(row: BookingRow): Promise<BookingRow[]>
  /** Returns the number of rows cancelled. */
  cancelRows(ids: string[]): Promise<number>
  listFrom(date: string): Promise<BookingRow[]>
  /** Returns the number of rows changed. */
  setPaid(id: string, paid: boolean): Promise<number>
}

const CANCEL_CUTOFF_MS = 2 * 60 * 60 * 1000

// ── Availability ──────────────────────────────────────────────────────────────

export async function getAvailability(store: BookingStore, date: unknown): Promise<Result<number[], 'invalid' | 'error'>> {
  if (typeof date !== 'string' || !isValidDateStr(date)) return { ok: false, error: 'invalid' }
  try {
    return { ok: true, data: occupiedHours(await store.bookedSlots(date)) }
  } catch {
    return { ok: false, error: 'error' }
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreatedBooking {
  ref: string
  guestName: string
  email: string
  date: string
  hours: number[]
  total: number
  gcashRef: string
}

/** Route handlers receive untrusted JSON: check the shape before validating values. */
function asBookingInput(raw: unknown): BookingInput | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const strings = ['firstName', 'lastName', 'phone', 'email', 'date', 'gcashRef'] as const
  if (strings.some(k => typeof r[k] !== 'string')) return null
  if (!Array.isArray(r.hours) || r.hours.some(h => typeof h !== 'number')) return null
  return {
    firstName: r.firstName as string, lastName: r.lastName as string,
    phone: r.phone as string, email: r.email as string,
    date: r.date as string, hours: r.hours as number[], gcashRef: r.gcashRef as string,
  }
}

export async function createBooking(
  store: BookingStore, raw: unknown, now: CourtNow,
): Promise<Result<CreatedBooking, 'invalid' | 'conflict' | 'duplicate_ref' | 'error'>> {
  const input = asBookingInput(raw)
  if (!input) return { ok: false, error: 'invalid' }

  const fieldErrors = validateBooking(input, now)
  if (Object.keys(fieldErrors).length > 0) return { ok: false, error: 'invalid', fieldErrors }

  const hours = [...input.hours].sort((a, b) => a - b)
  const total = priceFor(hours.length)
  const guestName = `${input.firstName.trim()} ${input.lastName.trim()}`
  const email = input.email.trim()

  try {
    const result = await store.createGroup({
      guest_name: guestName,
      phone: normalizePhone(input.phone),
      email,
      booking_date: input.date,
      hours,
      prices: splitPrice(total, hours.length),
      gcash_ref: input.gcashRef,
    })
    if ('error' in result) return { ok: false, error: result.error }
    return {
      ok: true,
      data: { ref: bookingRef(result.ids[0]), guestName, email, date: input.date, hours, total, gcashRef: input.gcashRef },
    }
  } catch {
    console.error('[bookings] createGroup failed')
    return { ok: false, error: 'error' }
  }
}

// ── Guest lookup & cancellation ───────────────────────────────────────────────

async function findGroup(
  store: BookingStore, rawRef: unknown,
): Promise<{ error: 'invalid' | 'not_found' } | { match: BookingRow; rows: BookingRow[] }> {
  const prefix = typeof rawRef === 'string' ? refPrefix(rawRef) : null
  if (!prefix) return { error: 'invalid' }
  const matches = await store.findByPrefix(prefix)
  if (matches.length === 0) return { error: 'not_found' }
  const rows = (await store.groupOf(matches[0])).sort((a, b) => a.start_hour - b.start_hour)
  return { match: matches[0], rows: rows.length > 0 ? rows : [matches[0]] }
}

function hoursOf(rows: BookingRow[]) {
  return rows.flatMap(r => occupiedHours([r])).sort((a, b) => a - b)
}

export interface BookingSummary {
  ref: string
  guestName: string
  phone: string // masked
  bookingDate: string
  hours: number[]
  totalPrice: number
  isPaid: boolean
}

export async function lookupBooking(
  store: BookingStore, rawRef: unknown,
): Promise<Result<BookingSummary, 'invalid' | 'not_found' | 'error'>> {
  try {
    const found = await findGroup(store, rawRef)
    if ('error' in found) return { ok: false, error: found.error }
    const { match, rows } = found
    return {
      ok: true,
      data: {
        ref: bookingRef(match.id),
        guestName: match.guest_name,
        phone: match.phone.slice(0, 4) + '****' + match.phone.slice(-3),
        bookingDate: match.booking_date,
        hours: hoursOf(rows),
        totalPrice: rows.reduce((sum, r) => sum + Number(r.total_price), 0),
        isPaid: rows.every(r => r.is_paid),
      },
    }
  } catch {
    return { ok: false, error: 'error' }
  }
}

export interface CancelledBooking {
  ref: string
  guestName: string
  email: string | null
  bookingDate: string
  hours: number[]
}

export async function cancelBookingByGuest(
  store: BookingStore, rawRef: unknown, rawPhone: unknown, nowMs: number,
): Promise<Result<CancelledBooking, 'invalid' | 'not_found' | 'phone_mismatch' | 'too_late' | 'error'>> {
  if (typeof rawPhone !== 'string' || !/^09\d{9}$/.test(normalizePhone(rawPhone))) {
    return { ok: false, error: 'invalid' }
  }
  try {
    const found = await findGroup(store, rawRef)
    if ('error' in found) return { ok: false, error: found.error }
    const { match, rows } = found
    if (match.phone !== normalizePhone(rawPhone)) return { ok: false, error: 'phone_mismatch' }

    const hours = hoursOf(rows)
    // The court is in Asia/Manila (UTC+8, no daylight saving)
    const firstStart = Date.parse(`${match.booking_date}T${pad(hours[0])}:00:00+08:00`)
    if (nowMs > firstStart - CANCEL_CUTOFF_MS) return { ok: false, error: 'too_late' }

    await store.cancelRows(rows.map(r => r.id))
    return {
      ok: true,
      data: { ref: bookingRef(match.id), guestName: match.guest_name, email: match.email, bookingDate: match.booking_date, hours },
    }
  } catch {
    return { ok: false, error: 'error' }
  }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

type AuthCheck = () => Promise<boolean>
export type AdminError = 'unauthorized' | 'invalid' | 'not_found' | 'error'

function isId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 64
}

export async function adminList(store: BookingStore, isAdmin: AuthCheck, fromDate: string): Promise<Result<BookingRow[], AdminError>> {
  if (!(await isAdmin())) return { ok: false, error: 'unauthorized' }
  try {
    return { ok: true, data: await store.listFrom(fromDate) }
  } catch {
    return { ok: false, error: 'error' }
  }
}

export async function adminSetPaid(store: BookingStore, isAdmin: AuthCheck, id: unknown, paid: unknown): Promise<Result<null, AdminError>> {
  if (!(await isAdmin())) return { ok: false, error: 'unauthorized' }
  if (!isId(id) || typeof paid !== 'boolean') return { ok: false, error: 'invalid' }
  try {
    return (await store.setPaid(id, paid)) > 0 ? { ok: true, data: null } : { ok: false, error: 'not_found' }
  } catch {
    return { ok: false, error: 'error' }
  }
}

export async function adminCancel(store: BookingStore, isAdmin: AuthCheck, id: unknown): Promise<Result<null, AdminError>> {
  if (!(await isAdmin())) return { ok: false, error: 'unauthorized' }
  if (!isId(id)) return { ok: false, error: 'invalid' }
  try {
    return (await store.cancelRows([id])) > 0 ? { ok: true, data: null } : { ok: false, error: 'not_found' }
  } catch {
    return { ok: false, error: 'error' }
  }
}
