import 'server-only'
import { cookies } from 'next/headers'
import { signToken, verifyToken, safeEqual } from './session-token'

const COOKIE_NAME = 'pg_admin'
const SESSION_MS = 12 * 60 * 60 * 1000 // 12 hours

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? ''
}

export function adminLoginConfigured() {
  return !!process.env.ADMIN_PASSWORD && sessionSecret().length >= 32
}

/** Constant-time password check against server-only env. Fails closed when not configured. */
export function checkAdminPassword(password: unknown) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || typeof password !== 'string') return false
  return safeEqual(password, expected)
}

export async function createAdminSession() {
  const expires = Date.now() + SESSION_MS
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, signToken(expires, sessionSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: new Date(expires),
  })
}

export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function isAdmin() {
  const cookieStore = await cookies()
  return verifyToken(cookieStore.get(COOKIE_NAME)?.value, sessionSecret(), Date.now())
}
