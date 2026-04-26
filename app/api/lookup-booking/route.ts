import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rateLimit, getIp } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const { ok, retryAfterSeconds } = rateLimit(getIp(request), { max: 20, windowMs: 60_000 })
  if (!ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
    )
  }

  const raw = request.nextUrl.searchParams.get('ref') ?? ''
  // Accept formats: #PB1A2B3C, PB1A2B3C, 1A2B3C
  const sixChars = raw.toUpperCase().replace(/^#?PB/, '')

  if (!/^[A-F0-9]{6}$/i.test(sixChars)) {
    return NextResponse.json({ error: 'Invalid reference format. Expected format: #PB followed by 6 characters.' }, { status: 400 })
  }

  // UUID range query: avoids ILIKE on UUID type (unsupported in PostgreSQL).
  // The booking ref is the first 6 hex chars of the UUID string, so we bound
  // the search between <prefix>00-0000-... and <prefix>ff-ffff-...
  const prefix = sixChars.toLowerCase()
  const lower = `${prefix}00-0000-0000-0000-000000000000`
  const upper = `${prefix}ff-ffff-ffff-ffff-ffffffffffff`

  const { data, error } = await supabase
    .from('bookings')
    .select('id, guest_name, phone, booking_date, start_hour, duration, total_price, status, is_paid')
    .gte('id', lower)
    .lte('id', upper)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (error) {
    console.error('[lookup] supabase error:', error.message, error.code, error.details, error.hint)
    return NextResponse.json({ error: 'Lookup failed. Please try again.' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'No booking found with that reference.' }, { status: 404 })
  }

  // Return masked phone — never expose full phone publicly
  const p = data.phone as string
  const maskedPhone = p.slice(0, 4) + '****' + p.slice(-3)

  return NextResponse.json({
    id: data.id,
    ref: `#PB${(data.id as string).slice(0, 6).toUpperCase()}`,
    guestName: data.guest_name,
    phone: maskedPhone,
    bookingDate: data.booking_date,
    startHour: data.start_hour,
    duration: data.duration,
    totalPrice: data.total_price,
    isPaid: data.is_paid as boolean,
  })
}
