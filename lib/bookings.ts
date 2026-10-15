import type { BookingPayload } from '@/types/booking'
import type { BookingErrors } from './booking-rules'

/**
 * Browser-side helpers. The browser never talks to Supabase directly — these call
 * the site's own API routes, which validate everything on the server.
 */

export class SlotConflictError extends Error {
  readonly code = 'SLOT_CONFLICT' as const
  constructor() {
    super('That time slot was just booked by someone else.')
    this.name = 'SlotConflictError'
  }
}

export class DuplicateRefError extends Error {
  constructor() {
    super('That GCash reference number was already used for another booking.')
    this.name = 'DuplicateRefError'
  }
}

export class BookingValidationError extends Error {
  constructor(readonly fieldErrors: BookingErrors) {
    super('Some booking details are not valid.')
    this.name = 'BookingValidationError'
  }
}

/** Returns every booked hour for a date (e.g. [10, 11]). */
export async function fetchBookedHours(date: string): Promise<number[]> {
  const res = await fetch(`/api/availability?date=${encodeURIComponent(date)}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Availability request failed (${res.status})`)
  const body = (await res.json()) as { bookedHours: number[] }
  return body.bookedHours
}

/** Submits a booking. Returns the booking reference (e.g. "#PB1A2B3C"). */
export async function submitBooking(payload: BookingPayload): Promise<string> {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = (await res.json().catch(() => ({}))) as { ref?: string; error?: string; fieldErrors?: BookingErrors }
  if (res.ok && body.ref) return body.ref
  if (body.error === 'conflict') throw new SlotConflictError()
  if (body.error === 'duplicate_ref') throw new DuplicateRefError()
  if (body.error === 'invalid') throw new BookingValidationError(body.fieldErrors ?? {})
  throw new Error(body.error ?? `Booking failed (${res.status})`)
}
