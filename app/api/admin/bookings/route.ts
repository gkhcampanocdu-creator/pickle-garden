import { adminList } from '@/lib/booking-service'
import { supabaseStore } from '@/lib/supabase-store'
import { isAdmin } from '@/lib/admin-session'
import { courtNow } from '@/lib/booking-rules'
import { json } from '@/lib/api'

/** All live bookings from the court's today onward. Admin session required. */
export async function GET() {
  const result = await adminList(supabaseStore, isAdmin, courtNow().dateStr)
  if (result.ok) return json({ bookings: result.data, today: courtNow().dateStr })
  return json({ error: result.error }, result.error === 'unauthorized' ? 401 : 500)
}
