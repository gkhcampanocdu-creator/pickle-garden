import 'server-only'
import { NextResponse } from 'next/server'
import { rateLimit, getIp } from './rate-limit'

/** JSON response that is never cached (booking data changes constantly). */
export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}

/** Returns a 429 response when the caller's IP is over the limit for this route, else null. */
export function limited(request: Request, route: string, max: number, windowMs = 60_000) {
  const { ok, retryAfterSeconds } = rateLimit(`${route}:${getIp(request)}`, { max, windowMs })
  return ok ? null : json(
    { error: 'Too many requests. Please wait a moment and try again.' },
    429, { 'Retry-After': String(retryAfterSeconds) },
  )
}

export async function readJson(request: Request): Promise<unknown> {
  try { return await request.json() } catch { return null }
}
