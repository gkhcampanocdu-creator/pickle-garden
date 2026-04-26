import { NextResponse } from 'next/server'

// In-memory rate limiting: 5 failed attempts per IP within 5 minutes triggers lockout.
// Note: in serverless environments each cold start resets this map — it still prevents
// rapid brute-force bursts within a single function instance lifetime.
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 5 * 60 * 1000 // 5 minutes

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const now = Date.now()
  const entry = attempts.get(ip)

  if (entry && now < entry.resetAt && entry.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { ok: false, error: 'Too many attempts. Try again in 5 minutes.' },
      { status: 429 }
    )
  }

  try {
    const { password } = await request.json()

    if (password === process.env.ADMIN_PASSWORD) {
      attempts.delete(ip)
      return NextResponse.json({ ok: true })
    }

    const existing = entry && now < entry.resetAt ? entry : { count: 0, resetAt: now + WINDOW_MS }
    attempts.set(ip, { count: existing.count + 1, resetAt: existing.resetAt })

    return NextResponse.json({ ok: false }, { status: 401 })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
