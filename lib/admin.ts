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
  status: string
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
      .neq('status', 'cancelled')
      .order('booking_date', { ascending: true })
      .order('start_hour', { ascending: true })

    if (error) throw error
    return data ?? []
  } catch (err) {
    console.error('[admin] fetchAllBookings error:', err)
    throw err
  }
}

// Writes go through server-side API routes (bypasses RLS with service role key).
// The adminToken is the admin password, verified server-side against ADMIN_PASSWORD.

async function adminPost(path: string, body: object, adminToken: string): Promise<void> {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`)
  }
}

/** Flips the is_paid flag for a single booking. */
export async function updatePaymentStatus(id: string, isPaid: boolean, adminToken: string): Promise<void> {
  await adminPost('/api/admin/update-payment', { id, isPaid }, adminToken)
}

/** Soft-deletes a booking by setting status = 'cancelled'. */
export async function cancelBooking(id: string, adminToken: string): Promise<void> {
  await adminPost('/api/admin/cancel', { id }, adminToken)
}
