import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { supabaseServer } from '@/lib/supabase-server'
import { buildCancellationEmail, h12, formatDate } from '@/lib/email'
import { rateLimit, getIp } from '@/lib/rate-limit'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { ok, retryAfterSeconds } = rateLimit(getIp(request), { max: 10, windowMs: 60_000 })
  if (!ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
    )
  }

  let body: { ref?: string; phone?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { ref = '', phone = '' } = body
  const sixChars = ref.toUpperCase().replace(/^#?PB/, '')

  if (!/^[A-F0-9]{6}$/i.test(sixChars)) {
    return NextResponse.json({ error: 'Invalid booking reference.' }, { status: 400 })
  }
  if (!/^09\d{9}$/.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone number format.' }, { status: 400 })
  }

  // UUID range query — same approach as lookup-booking (ILIKE unsupported on UUID type)
  const prefix = sixChars.toLowerCase()
  const lower = `${prefix}00-0000-0000-0000-000000000000`
  const upper = `${prefix}ff-ffff-ffff-ffff-ffffffffffff`

  const { data, error } = await supabase
    .from('bookings')
    .select('id, phone, email, guest_name, booking_date, start_hour, duration')
    .gte('id', lower)
    .lte('id', upper)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Lookup failed. Please try again.' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'No booking found with that reference.' }, { status: 404 })
  }

  // Verify phone matches
  if (data.phone !== phone) {
    return NextResponse.json({ error: 'Phone number does not match our records.' }, { status: 403 })
  }

  // Enforce 2-hour cancellation window
  const bookingStart = new Date(
    `${data.booking_date}T${String(data.start_hour).padStart(2, '0')}:00:00+08:00`
  )
  if (Date.now() > bookingStart.getTime() - 2 * 60 * 60 * 1000) {
    return NextResponse.json(
      { error: 'Cancellations must be made at least 2 hours before the booking start time.' },
      { status: 400 }
    )
  }

  // Cancel the booking
  const { error: cancelError } = await supabaseServer
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', data.id)

  if (cancelError) {
    return NextResponse.json({ error: 'Failed to cancel booking. Please try again.' }, { status: 500 })
  }

  // Fire-and-forget cancellation confirmation email
  if (data.email) {
    const bookingRef = `#PB${(data.id as string).slice(0, 6).toUpperCase()}`
    const html = buildCancellationEmail({
      guestName: data.guest_name as string,
      bookingRef,
      date: formatDate(data.booking_date as string),
      time: `${h12(data.start_hour as number)} – ${h12((data.start_hour as number) + (data.duration as number))}`,
      duration: `${data.duration} hour${data.duration > 1 ? 's' : ''}`,
    })
    resend.emails.send({
      from: `Pickle Garden <${process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'}>`,
      to: data.email as string,
      subject: `Your booking ${bookingRef} has been cancelled`,
      html,
    }).catch(() => {/* silent — cancellation already succeeded */})
  }

  return NextResponse.json({ ok: true })
}
