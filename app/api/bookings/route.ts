import { after } from 'next/server'
import { createBooking } from '@/lib/booking-service'
import { supabaseStore } from '@/lib/supabase-store'
import { courtNow } from '@/lib/booking-rules'
import { sendConfirmationEmail } from '@/lib/notifications'
import { json, limited, readJson } from '@/lib/api'

const STATUS = { invalid: 400, conflict: 409, duplicate_ref: 409, error: 500 } as const

/** Creates a booking. Price, hours and dates are validated and computed here, not trusted from the browser. */
export async function POST(request: Request) {
  const tooMany = limited(request, 'bookings', 10)
  if (tooMany) return tooMany

  const result = await createBooking(supabaseStore, await readJson(request), courtNow())
  if (!result.ok) return json({ error: result.error, fieldErrors: result.fieldErrors }, STATUS[result.error])

  const booking = result.data
  after(() => sendConfirmationEmail(booking))
  return json({ ref: booking.ref, total: booking.total }, 201)
}
