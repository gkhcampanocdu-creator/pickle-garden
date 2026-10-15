import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Minimal signed session token: "<expiryMs>.<hmac-sha256(expiryMs)>".
 * Pure functions so they can be unit-tested; cookie handling lives in admin-session.ts.
 */

const MIN_SECRET_LENGTH = 32

function hmac(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

/** Constant-time string comparison (hash first so differing lengths don't throw or leak). */
export function safeEqual(a: string, b: string) {
  const ha = createHmac('sha256', 'cmp').update(a).digest()
  const hb = createHmac('sha256', 'cmp').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function signToken(expiresAtMs: number, secret: string) {
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`Session secret must be at least ${MIN_SECRET_LENGTH} characters`)
  }
  const payload = String(expiresAtMs)
  return `${payload}.${hmac(payload, secret)}`
}

export function verifyToken(token: string | undefined, secret: string, nowMs: number) {
  if (!token || !secret || secret.length < MIN_SECRET_LENGTH) return false
  const [payload, sig, ...rest] = token.split('.')
  if (!payload || !sig || rest.length > 0 || !/^\d+$/.test(payload)) return false
  if (!safeEqual(sig, hmac(payload, secret))) return false
  return Number(payload) > nowMs
}
