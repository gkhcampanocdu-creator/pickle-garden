/**
 * Booking rules shared by the browser (instant feedback) and the server (enforcement).
 * Keep this module free of browser- or server-only imports.
 */
import { pad, h12 } from './utils'

export { pad, h12 }

export const H_START = 8            // first slot starts 8:00 AM
export const H_END = 21             // closing time 9:00 PM; last slot starts 8:00 PM
export const MAX_SLOTS = 4
export const MAX_ADVANCE_DAYS = 60
export const PRICE_PER_HOUR = parseInt(process.env.NEXT_PUBLIC_PRICE_PER_HOUR ?? '300', 10)
export const FOUR_HOUR_PRICE = 1000 // discounted bundle
export const COURT_TZ = 'Asia/Manila'

const NAME_MAX = 60
const EMAIL_MAX = 254
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface CourtNow {
  dateStr: string // YYYY-MM-DD at the court
  hour: number    // 0–23 at the court
}

export interface ContactInput {
  firstName: string
  lastName: string
  phone: string
  email: string
}

export interface BookingInput extends ContactInput {
  date: string     // YYYY-MM-DD
  hours: number[]  // one-hour slots, need not be contiguous
  gcashRef: string
}

export type BookingErrors = Partial<Record<
  'firstName' | 'lastName' | 'phone' | 'email' | 'date' | 'time' | 'gcashRef',
  string
>>

// ── Time ──────────────────────────────────────────────────────────────────────

/** Current date and hour at the court, independent of the visitor's device clock and zone. */
export function courtNow(at: Date = new Date()): CourtNow {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: COURT_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(at)
  const get = (type: string) => parts.find(p => p.type === type)!.value
  return { dateStr: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) }
}

export function isValidDateStr(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

export function addDays(dateStr: string, n: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

export function humanDate(s: string) {
  const [y, m, d] = s.split('-')
  return `${MONTHS[+m - 1]} ${+d}, ${y}`
}

// ── Money ─────────────────────────────────────────────────────────────────────

export function priceFor(slots: number) {
  return slots === MAX_SLOTS ? FOUR_HOUR_PRICE : slots * PRICE_PER_HOUR
}

/** Splits a total across n rows (one per hour) so the parts add up exactly. */
export function splitPrice(total: number, n: number): number[] {
  const base = Math.floor(total / n)
  return Array.from({ length: n }, (_, i) => base + (i < total - base * n ? 1 : 0))
}

// ── References ────────────────────────────────────────────────────────────────

/** Guest-facing reference: "#PB" + first 6 hex chars of the booking's first row id. */
export function bookingRef(id: string) {
  return `#PB${id.slice(0, 6).toUpperCase()}`
}

/** Parses "#PB1A2B3C", "PB1A2B3C" or "1A2B3C" into the lowercase 6-char id prefix, or null. */
export function refPrefix(raw: string): string | null {
  const six = raw.trim().toUpperCase().replace(/^#?PB/, '')
  return /^[A-F0-9]{6}$/.test(six) ? six.toLowerCase() : null
}

// ── Availability ──────────────────────────────────────────────────────────────

export function occupiedHours(rows: { start_hour: number; duration: number }[]): number[] {
  const hours: number[] = []
  for (const row of rows) {
    for (let h = row.start_hour; h < row.start_hour + row.duration; h++) hours.push(h)
  }
  return hours
}

// ── Validation ────────────────────────────────────────────────────────────────

/** Converts +639XXXXXXXXX to 09XXXXXXXXX and trims; other input passes through. */
export function normalizePhone(raw: string) {
  const t = raw.trim()
  return /^\+639\d{9}$/.test(t) ? '0' + t.slice(3) : t // "+63" + "9…" → "09…"
}

export function validateContact(input: ContactInput): BookingErrors {
  const errors: BookingErrors = {}
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  const email = input.email.trim()

  if (!firstName) errors.firstName = 'Required'
  else if (firstName.length > NAME_MAX) errors.firstName = `Max ${NAME_MAX} characters`
  if (!lastName) errors.lastName = 'Required'
  else if (lastName.length > NAME_MAX) errors.lastName = `Max ${NAME_MAX} characters`

  if (!/^09\d{9}$/.test(normalizePhone(input.phone))) errors.phone = 'Use format: 09171234567 or +639171234567'
  // Length cap first and a pattern without overlapping quantifiers, so huge input can't stall the server
  if (email && (email.length > EMAIL_MAX || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email))) {
    errors.email = 'Enter a valid email address'
  }
  return errors
}

export function validateBooking(input: BookingInput, now: CourtNow): BookingErrors {
  const errors = validateContact(input)
  if (!/^\d{13}$/.test(input.gcashRef)) errors.gcashRef = 'Must be exactly 13 numeric digits'

  if (!isValidDateStr(input.date)) errors.date = 'Invalid date'
  else if (input.date < now.dateStr) errors.date = 'That date has passed'
  else if (input.date > addDays(now.dateStr, MAX_ADVANCE_DAYS)) errors.date = `Book up to ${MAX_ADVANCE_DAYS} days ahead`

  const hours = input.hours
  if (!Array.isArray(hours) || hours.length < 1 || hours.length > MAX_SLOTS) {
    errors.time = `Choose 1 to ${MAX_SLOTS} time slots`
  } else if (new Set(hours).size !== hours.length) {
    errors.time = 'Each time slot can only be chosen once'
  } else if (hours.some(h => !Number.isInteger(h) || h < H_START || h >= H_END)) {
    errors.time = 'Outside opening hours'
  } else if (input.date === now.dateStr && hours.some(h => h <= now.hour)) {
    errors.time = 'One of those times has already started'
  }
  return errors
}
