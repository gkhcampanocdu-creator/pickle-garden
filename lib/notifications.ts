import 'server-only'
import { Resend } from 'resend'
import { buildConfirmationEmail, buildCancellationEmail } from './email'
import { h12, humanDate } from './booking-rules'
import type { CreatedBooking, CancelledBooking } from './booking-service'

/**
 * Booking emails are only ever sent by the server, for bookings it just created or
 * cancelled — there is no public endpoint that sends arbitrary email.
 */

function resend() {
  const key = process.env.RESEND_API_KEY
  return key ? new Resend(key) : null
}

const from = () => `Pickle Garden <${process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'}>`
const timeList = (hours: number[]) => hours.map(h12).join(', ')
const durationText = (n: number) => `${n} hour${n > 1 ? 's' : ''}`

export async function sendConfirmationEmail(b: CreatedBooking) {
  const client = resend()
  if (!client || !b.email) return
  const { error } = await client.emails.send({
    from: from(),
    to: b.email,
    subject: `Your booking request ${b.ref} – Pickle Garden`,
    html: buildConfirmationEmail({
      guestName: b.guestName,
      bookingRef: b.ref,
      date: humanDate(b.date),
      time: timeList(b.hours),
      duration: durationText(b.hours.length),
      price: `₱${b.total.toLocaleString('en-PH')}`,
      gcashRef: b.gcashRef,
    }),
  })
  if (error) console.error('[email] confirmation failed:', error.name)
}

export async function sendCancellationEmail(b: CancelledBooking) {
  const client = resend()
  if (!client || !b.email) return
  const { error } = await client.emails.send({
    from: from(),
    to: b.email,
    subject: `Your booking ${b.ref} has been cancelled`,
    html: buildCancellationEmail({
      guestName: b.guestName,
      bookingRef: b.ref,
      date: humanDate(b.bookingDate),
      time: timeList(b.hours),
      duration: durationText(b.hours.length),
    }),
  })
  if (error) console.error('[email] cancellation failed:', error.name)
}
