import { supabase } from './supabase'

export interface BookingPayload {
  guestName: string
  phone: string
  email: string
  date: string      // YYYY-MM-DD
  startHour: number // 8–21  (integer)
  duration: number  // 1–4   (integer)
  totalPrice: number
  gcashRef: string
}

export class SlotConflictError extends Error {
  readonly code = 'SLOT_CONFLICT' as const
  constructor() {
    super('That time slot was just booked by someone else.')
    this.name = 'SlotConflictError'
  }
}

/** Returns every occupied hour number for a given date (e.g. [10, 11] for a 2h booking at 10). */
export async function fetchBookedHours(date: string): Promise<number[]> {
  console.log('[bookings] fetchBookedHours →', { date })
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('start_hour, duration')
      .eq('booking_date', date)

    if (error) throw error

    console.log('[bookings] fetchBookedHours rows', data)

    const occupied: number[] = []
    for (const row of data ?? []) {
      for (let h = row.start_hour; h < row.start_hour + row.duration; h++) {
        occupied.push(h)
      }
    }
    return occupied
  } catch (err) {
    console.log('Supabase Error Detail:', err)
    throw err
  }
}

/**
 * Submits a booking to Supabase.
 * Re-fetches availability first to catch concurrent bookings, then inserts.
 * Throws SlotConflictError if the slot is taken (either pre-check or DB unique violation).
 * Returns the booking reference string on success.
 */
export async function submitBooking(payload: BookingPayload): Promise<string> {
  // Optimistic conflict check — catches most races without relying solely on DB constraints
  const bookedHours = await fetchBookedHours(payload.date)
  for (let h = payload.startHour; h < payload.startHour + payload.duration; h++) {
    if (bookedHours.includes(h)) throw new SlotConflictError()
  }

  const insertRow = {
    guest_name: payload.guestName,
    phone: payload.phone,
    email: payload.email,
    booking_date: payload.date,          // string  'YYYY-MM-DD'
    start_hour: payload.startHour,       // integer
    duration: payload.duration,          // integer
    total_price: payload.totalPrice,
    gcash_ref: payload.gcashRef,
  }
  console.log('[bookings] submitBooking insert →', insertRow)

  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert(insertRow)
      .select('id')
      .single()

    if (error) {
      // PostgreSQL unique-violation — slot taken in the narrow race window
      if (error.code === '23505') throw new SlotConflictError()
      throw error
    }

    return `#PB${(data.id as string).slice(0, 6).toUpperCase()}`
  } catch (err) {
    if (err instanceof SlotConflictError) throw err
    console.log('Supabase Error Detail:', err)
    throw err
  }
}
