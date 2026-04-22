'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, LogOut, CalendarX2 } from 'lucide-react'
import { fetchAllBookings, updatePaymentStatus, type AdminBooking } from '@/lib/admin'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? 'pickleball'
const SESSION_KEY = 'pg_admin_auth'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function pad(n: number) { return String(n).padStart(2, '0') }
function getDateStr(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function h12(h: number) { return `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}` }
function shortDate(s: string) {
  const [, m, d] = s.split('-')
  return `${MONTHS[+m - 1]} ${+d}`
}

// ── Password Gate ─────────────────────────────────────────────────────────────

function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1')
      onAuth()
    } else {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 450)
    }
  }

  return (
    <div className="min-h-dvh bg-[#FAF8F5] flex items-center justify-center px-5">
      <div className={`w-full max-w-sm bg-white rounded-2xl shadow-[0_4px_32px_rgba(0,0,0,0.08)] p-8 ${shake ? 'animate-shake' : ''}`}>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F3EE] border border-[#C8DDD5] flex items-center justify-center mx-auto mb-4">
            <span className="font-serif font-bold text-[#006241] text-xl">PG</span>
          </div>
          <h1 className="font-serif text-xl font-semibold text-stone-900 leading-snug">Admin Access</h1>
          <p className="text-xs text-stone-400 mt-1 tracking-wide">Pickle Garden · Bookings Dashboard</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="pw" className="block text-[0.68rem] font-semibold uppercase tracking-widest text-stone-400 mb-2">
              Password
            </label>
            <input
              id="pw"
              type="password"
              value={pw}
              onChange={e => { setPw(e.target.value); setError(false) }}
              placeholder="Enter admin password"
              autoFocus
              autoComplete="current-password"
              className={`w-full border rounded-xl px-4 py-3.5 text-sm text-stone-900 outline-none transition-all duration-200 ${
                error
                  ? 'border-red-300 ring-2 ring-red-100 bg-red-50'
                  : 'border-stone-200 focus:border-[#006241] focus:ring-2 focus:ring-[#006241]/15'
              }`}
            />
            {error && (
              <p className="text-xs text-red-500 mt-2" role="alert">
                Incorrect password. Please try again.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-[#006241] hover:bg-[#004d32] text-white font-semibold text-sm rounded-xl py-3.5 transition-colors duration-200 cursor-pointer"
          >
            Sign In →
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Payment Toggle ────────────────────────────────────────────────────────────

function PaymentToggle({
  isPaid, loading, onToggle,
}: {
  isPaid: boolean
  loading: boolean
  onToggle: () => void
}) {
  return (
    <button
      role="switch"
      aria-checked={isPaid}
      aria-label={isPaid ? 'Mark as unpaid' : 'Mark as paid'}
      onClick={onToggle}
      disabled={loading}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006241] disabled:opacity-50 ${
        isPaid ? 'bg-[#006241]' : 'bg-stone-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
          isPaid ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ── Booking Card ──────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  showDate,
  onTogglePaid,
}: {
  booking: AdminBooking
  showDate: boolean
  onTogglePaid: (id: string, newVal: boolean) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    await onTogglePaid(booking.id, !booking.is_paid)
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 space-y-3 animate-fade-up">

      {/* Row 1 — name + toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-stone-900 text-sm leading-snug truncate">{booking.guest_name}</p>
          <p className="text-xs text-stone-400 mt-0.5 tabular-nums">{booking.phone}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <PaymentToggle isPaid={booking.is_paid} loading={loading} onToggle={handleToggle} />
          <span className={`text-[0.6rem] font-bold uppercase tracking-widest transition-colors duration-200 ${
            booking.is_paid ? 'text-[#006241]' : 'text-stone-400'
          }`}>
            {booking.is_paid ? 'Paid' : 'Pending'}
          </span>
        </div>
      </div>

      {/* Row 2 — date/time + price */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#006241] flex-shrink-0" />
          {showDate && <span className="text-stone-400 font-normal">{shortDate(booking.booking_date)} ·</span>}
          {h12(booking.start_hour)} – {h12(booking.start_hour + booking.duration)}
        </span>
        <span className="text-xs text-stone-400">
          {booking.duration} hr{booking.duration > 1 ? 's' : ''}
          {' · '}
          <span className="font-semibold text-[#006241] tabular-nums">₱{booking.total_price.toLocaleString()}</span>
        </span>
      </div>

      {/* Row 3 — GCash ref */}
      <div className="flex items-center gap-2 bg-stone-50 border border-stone-100 rounded-lg px-3 py-2">
        <span className="text-[0.6rem] font-bold text-stone-400 uppercase tracking-widest flex-shrink-0">GCash</span>
        <span className="font-mono text-xs text-stone-700 tracking-wider tabular-nums">{booking.gcash_ref}</span>
      </div>
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  title, subtitle, showDate, bookings, onTogglePaid,
}: {
  title: string
  subtitle?: string
  showDate: boolean
  bookings: AdminBooking[]
  onTogglePaid: (id: string, newVal: boolean) => void
}) {
  if (bookings.length === 0) return null

  return (
    <section>
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="font-serif text-base font-semibold text-stone-900">{title}</h2>
        {subtitle && <span className="text-xs text-stone-400">{subtitle}</span>}
        <div className="ml-auto bg-[#E8F3EE] text-[#006241] text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
          {bookings.length} slot{bookings.length !== 1 ? 's' : ''}
        </div>
      </div>
      <div className="space-y-3">
        {bookings.map(b => (
          <BookingCard key={b.id} booking={b} showDate={showDate} onTogglePaid={onTogglePaid} />
        ))}
      </div>
    </section>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 space-y-3 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-4 w-36 bg-stone-100 rounded-lg animate-pulse" />
              <div className="h-3 w-24 bg-stone-100 rounded-lg animate-pulse" />
            </div>
            <div className="h-7 w-12 bg-stone-100 rounded-full animate-pulse" />
          </div>
          <div className="h-3 w-44 bg-stone-100 rounded-lg animate-pulse" />
          <div className="h-9 bg-stone-50 rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const TODAY = getDateStr(0)
  const TOMORROW = getDateStr(1)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      setBookings(await fetchAllBookings())
    } catch {
      setError('Could not load bookings. Check your connection and try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Optimistic toggle with revert on failure
  async function handleTogglePaid(id: string, newVal: boolean) {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, is_paid: newVal } : b))
    try {
      await updatePaymentStatus(id, newVal)
    } catch {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, is_paid: !newVal } : b))
    }
  }

  const grouped = {
    today:    bookings.filter(b => b.booking_date === TODAY),
    tomorrow: bookings.filter(b => b.booking_date === TOMORROW),
    future:   bookings.filter(b => b.booking_date > TOMORROW),
  }
  const pendingCount = bookings.filter(b => !b.is_paid).length

  return (
    <div className="min-h-dvh bg-[#FAF8F5]">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-100 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center justify-between">
          <div className="leading-none">
            <p className="font-serif text-base font-semibold text-stone-900">Pickle Garden</p>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[#006241] mt-0.5">Admin Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              aria-label="Refresh bookings"
              className="w-9 h-9 rounded-xl border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50 transition-colors duration-150 cursor-pointer disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[#006241]"
            >
              <RefreshCw className={`w-[1.05rem] h-[1.05rem] ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onLogout}
              aria-label="Log out"
              className="w-9 h-9 rounded-xl border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#006241]"
            >
              <LogOut className="w-[1.05rem] h-[1.05rem]" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-7">

        {/* ── Stats bar ── */}
        {!loading && !error && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Today',    value: grouped.today.length,    accent: false },
              { label: 'Tomorrow', value: grouped.tomorrow.length,  accent: false },
              { label: 'Unpaid',   value: pendingCount,             accent: pendingCount > 0 },
            ].map(({ label, value, accent }) => (
              <div key={label} className="bg-white rounded-xl p-3.5 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-100">
                <p className={`text-2xl font-bold font-serif tabular-nums leading-none ${accent ? 'text-amber-500' : 'text-stone-900'}`}>
                  {value}
                </p>
                <p className="text-[0.6rem] font-bold uppercase tracking-widest text-stone-400 mt-1.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && <Skeleton />}

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <p className="text-sm text-red-600 leading-relaxed">{error}</p>
            <button
              onClick={() => load()}
              className="mt-3 text-xs font-semibold text-red-500 underline underline-offset-2 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Booking groups ── */}
        {!loading && !error && (
          <>
            <Section
              title="Today"
              subtitle={shortDate(TODAY)}
              showDate={false}
              bookings={grouped.today}
              onTogglePaid={handleTogglePaid}
            />
            <Section
              title="Tomorrow"
              subtitle={shortDate(TOMORROW)}
              showDate={false}
              bookings={grouped.tomorrow}
              onTogglePaid={handleTogglePaid}
            />
            <Section
              title="Future"
              showDate
              bookings={grouped.future}
              onTogglePaid={handleTogglePaid}
            />

            {bookings.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-stone-300">
                <CalendarX2 className="w-12 h-12 mb-4 opacity-40" strokeWidth={1.5} />
                <p className="font-serif text-lg text-stone-400">No upcoming bookings</p>
                <p className="text-sm text-stone-300 mt-1">Check back later</p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)

  // Runs only on client — avoids hydration mismatch with sessionStorage
  useEffect(() => {
    setAuthed(sessionStorage.getItem(SESSION_KEY) === '1')
  }, [])

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY)
    setAuthed(false)
  }

  if (authed === null) return null // SSR guard — render nothing until client hydrates

  return authed
    ? <Dashboard onLogout={handleLogout} />
    : <PasswordGate onAuth={() => setAuthed(true)} />
}
