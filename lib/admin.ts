import type { AdminBooking } from '@/types/booking'

export type { AdminBooking }

/**
 * Browser-side admin helpers. Every call goes to the site's own API routes, which
 * check the signed, httpOnly admin session cookie. No password or token is kept in
 * the browser, and the browser never talks to Supabase directly.
 */

export class UnauthorizedError extends Error {
  constructor() {
    super('Admin session expired. Please sign in again.')
    this.name = 'UnauthorizedError'
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { cache: 'no-store', ...init })
  if (res.status === 401) throw new UnauthorizedError()
  const body = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`)
  return body
}

function post<T>(path: string, body?: object) {
  return call<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

export async function checkSession(): Promise<boolean> {
  return (await call<{ authed: boolean }>('/api/admin-auth')).authed
}

/** Signs in. Resolves to an error message, or null on success. */
export async function signIn(password: string): Promise<string | null> {
  const res = await fetch('/api/admin-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (res.ok) return null
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  if (res.status === 401) return 'Incorrect password. Please try again.'
  return body.error ?? 'Could not sign in. Please try again.'
}

export async function signOut(): Promise<void> {
  await fetch('/api/admin-auth', { method: 'DELETE' })
}

/** Bookings from the court's today onward, plus the court's date for today (Asia/Manila). */
export async function fetchAllBookings(): Promise<{ bookings: AdminBooking[]; today: string }> {
  return call('/api/admin/bookings')
}

export async function updatePaymentStatus(id: string, isPaid: boolean): Promise<void> {
  await post('/api/admin/update-payment', { id, isPaid })
}

/** Soft-deletes a booking row by setting status = 'cancelled'. */
export async function cancelBooking(id: string): Promise<void> {
  await post('/api/admin/cancel', { id })
}
