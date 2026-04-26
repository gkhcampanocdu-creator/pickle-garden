/**
 * In-memory rate limiter for Next.js API routes.
 *
 * Caveat: state resets on serverless cold starts. This still blocks rapid
 * burst attacks within a single function instance lifetime, which covers the
 * most common automated abuse patterns. For persistent rate limiting, swap
 * the store for an Upstash Redis client.
 */

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

export interface RateLimitResult {
  ok: boolean
  retryAfterSeconds: number
}

export function rateLimit(
  key: string,
  opts: { max: number; windowMs: number }
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (entry && now < entry.resetAt) {
    if (entry.count >= opts.max) {
      return { ok: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) }
    }
    store.set(key, { count: entry.count + 1, resetAt: entry.resetAt })
  } else {
    store.set(key, { count: 1, resetAt: now + opts.windowMs })
  }

  return { ok: true, retryAfterSeconds: 0 }
}

/** Extract the best available IP from standard proxy headers. */
export function getIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}
