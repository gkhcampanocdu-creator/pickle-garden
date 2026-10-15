import { after } from 'next/server'
import { cancelBookingByGuest } from '@/lib/booking-service'
import { supabaseStore } from '@/lib/supabase-store'
import { sendCancellationEmail } from '@/lib/notifications'
import { json, limited, readJson } from '@/lib/api'

const MESSAGES = {
  invalid: ['Invalid booking reference or phone number.', 400],
  not_found: ['No booking found with that reference.', 404],
  phone_mismatch: ['Phone number does not match our records.', 403],
  too_late: ['Cancellations must be made at least 2 hours before the booking start time.', 400],
  error: ['Failed to cancel booking. Please try again.', 500],
} as const

export async function POST(request: Request) {
  const tooMany = limited(request, 'cancel', 10)
  if (tooMany) return tooMany

  const body = (await readJson(request)) as { ref?: unknown; phone?: unknown } | null
  const result = await cancelBookingByGuest(supabaseStore, body?.ref, body?.phone, Date.now())
  if (!result.ok) {
    const [error, status] = MESSAGES[result.error]
    return json({ error }, status)
  }

  const cancelled = result.data
  after(() => sendCancellationEmail(cancelled))
  return json({ ok: true })
}
