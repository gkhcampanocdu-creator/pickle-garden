import {
  adminLoginConfigured, checkAdminPassword, createAdminSession, clearAdminSession, isAdmin,
} from '@/lib/admin-session'
import { getIp } from '@/lib/rate-limit'
import { json, readJson } from '@/lib/api'

// Lockout after 5 failed attempts per IP within 5 minutes.
// In-memory: resets on serverless cold starts, but stops rapid brute-force bursts.
const failures = new Map<string, { count: number; resetAt: number }>()
const MAX_FAILURES = 5
const WINDOW_MS = 5 * 60 * 1000

/** Whether the current browser has a valid admin session. */
export async function GET() {
  return json({ authed: await isAdmin() })
}

/** Log in: checks the password on the server and sets a signed httpOnly session cookie. */
export async function POST(request: Request) {
  if (!adminLoginConfigured()) {
    return json({ error: 'Admin login is not set up on the server yet.' }, 503)
  }

  const ip = getIp(request)
  const now = Date.now()
  const entry = failures.get(ip)
  if (entry && now < entry.resetAt && entry.count >= MAX_FAILURES) {
    return json({ error: 'Too many attempts. Try again in 5 minutes.' }, 429,
      { 'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)) })
  }

  const body = (await readJson(request)) as { password?: unknown } | null
  if (!checkAdminPassword(body?.password)) {
    const current = entry && now < entry.resetAt ? entry : { count: 0, resetAt: now + WINDOW_MS }
    failures.set(ip, { count: current.count + 1, resetAt: current.resetAt })
    return json({ error: 'Incorrect password.' }, 401)
  }

  failures.delete(ip)
  await createAdminSession()
  return json({ ok: true })
}

/** Log out. */
export async function DELETE() {
  await clearAdminSession()
  return json({ ok: true })
}
