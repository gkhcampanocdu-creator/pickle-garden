import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { buildConfirmationEmail, type ConfirmationEmailData } from '@/lib/email'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  let body: Partial<ConfirmationEmailData & { to: string }>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { to, guestName, bookingRef, date, time, duration, price, gcashRef } = body

  if (!to || !guestName || !bookingRef || !date || !time || !duration || !price || !gcashRef) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  // Basic email format guard
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
  }

  const html = buildConfirmationEmail({ guestName, bookingRef, date, time, duration, price, gcashRef })

  const { error } = await resend.emails.send({
    from: `Pickle Garden <${process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'}>`,
    to,
    subject: `Your booking is confirmed – ${bookingRef}`,
    html,
  })

  if (error) {
    console.error('[send-confirmation] Resend error:', error)
    return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
