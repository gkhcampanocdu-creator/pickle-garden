import type { PendingBookingEntry } from '@/types/booking'

const STORAGE_KEY = 'pg_pending_booking'
const TTL_MS = 30 * 60 * 1000 // 30 minutes

export function savePendingBooking(entry: Omit<PendingBookingEntry, 'savedAt'>): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...entry, savedAt: Date.now() })
    )
  } catch {
    // localStorage unavailable (private browsing quota exceeded) — non-fatal
  }
}

export function clearPendingBooking(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // non-fatal
  }
}

export function getPendingBooking(): PendingBookingEntry | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as PendingBookingEntry
    if (Date.now() - entry.savedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    // Discard entries saved under the old startHour/duration schema
    if (!Array.isArray(entry.selectedHours) || entry.selectedHours.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return entry
  } catch {
    return null
  }
}
