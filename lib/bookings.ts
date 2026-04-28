import { supabase } from './supabase'
import type { BookingPayload } from '@/types/booking'

export class SlotConflictError extends Error {
  readonly code = 'SLOT_CONFLICT' as const
  constructor() {
    super('That time slot was just booked by someone else.')
    this.name = 'SlotConflictError'
  }
}

/** Returns every occupied hour number for a given date (e.g. [10, 11] for a 2h booking at 10). */
export async function fetchBookedHours(date: string): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('start_hour, duration')
      .eq('booking_date', date)
      .neq('status', 'cancelled')

    if (error) throw error

    const occupied: number[] = []
    for (const row of data ?? []) {
      for (let h = row.start_hour; h < row.start_hour + row.duration; h++) {
        occupied.push(h)
      }
    }
    return occupied
  } catch (err) {
    console.error('[bookings] fetchBookedHours error:', err)
    throw err
  }
}

/**
 * Submits a booking via the atomic `create_booking` Supabase RPC.
 * The RPC acquires a pg_advisory_xact_lock per date so the conflict check
 * and INSERT are serialised — eliminating the race window entirely.
 *
 * Falls back to the legacy manual check+insert path if the RPC doesn't exist
 * yet (PGRST202 = function not found), so the app stays functional before the
 * migration has been applied.
 *
 * Throws SlotConflictError if the slot is taken.
 * Returns the booking reference string on success.
 */
export async function submitBooking(payload: BookingPayload): Promise<string> {
  // --- Primary path: atomic RPC ---
  const { data: rpcData, error: rpcError } = await supabase.rpc('create_booking', {
    p_guest_name:   payload.guestName,
    p_phone:        payload.phone,
    p_email:        payload.email,
    p_booking_date: payload.date,
    p_start_hour:   payload.startHour,
    p_duration:     payload.duration,
    p_total_price:  payload.totalPrice,
    p_gcash_ref:    payload.gcashRef,
  })

  if (!rpcError) {
    return `#PB${(rpcData as string).slice(0, 6).toUpperCase()}`
  }

  // SLOT_CONFLICT raised inside the function
  if (rpcError.message?.includes('SLOT_CONFLICT')) {
    throw new SlotConflictError()
  }

  // PGRST202 = RPC function not found (migration not yet applied) — use legacy path
  if (rpcError.code !== 'PGRST202') {
    console.error('[bookings] RPC error:', rpcError)
    throw rpcError
  }

  // --- Legacy fallback path ---
  console.warn('[bookings] create_booking RPC not found, falling back to manual insert')

  const bookedHours = await fetchBookedHours(payload.date)
  for (let h = payload.startHour; h < payload.startHour + payload.duration; h++) {
    if (bookedHours.includes(h)) throw new SlotConflictError()
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        guest_name:   payload.guestName,
        phone:        payload.phone,
        email:        payload.email,
        booking_date: payload.date,
        start_hour:   payload.startHour,
        duration:     payload.duration,
        total_price:  payload.totalPrice,
        gcash_ref:    payload.gcashRef,
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') throw new SlotConflictError()
      throw error
    }

    return `#PB${(data.id as string).slice(0, 6).toUpperCase()}`
  } catch (err) {
    if (err instanceof SlotConflictError) throw err
    console.error('[bookings] submitBooking fallback error:', err)
    throw err
  }
}
