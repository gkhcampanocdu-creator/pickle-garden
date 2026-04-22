import { supabase } from './supabase'

export interface AdminBooking {
  id: string
  guest_name: string
  phone: string
  email: string
  booking_date: string  // YYYY-MM-DD
  start_hour: number
  duration: number
  total_price: number
  gcash_ref: string
  is_paid: boolean
  confirmed: boolean
  created_at: string
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Fetches all bookings from today onward, sorted by date then start_hour. */
export async function fetchAllBookings(): Promise<AdminBooking[]> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .gte('booking_date', todayStr())
      .order('booking_date', { ascending: true })
      .order('start_hour', { ascending: true })

    if (error) throw error
    return data ?? []
  } catch (err) {
    console.log('Supabase Error Detail:', err)
    throw err
  }
}

/** Flips the is_paid flag for a single booking. */
export async function updatePaymentStatus(id: string, isPaid: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ is_paid: isPaid })
      .eq('id', id)

    if (error) throw error
  } catch (err) {
    console.log('Supabase Error Detail:', err)
    throw err
  }
}
