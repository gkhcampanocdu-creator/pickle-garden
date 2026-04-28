'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, LogOut, CalendarX2, Copy, Check, Download, Search, Trash2, CheckSquare, Square } from 'lucide-react'
import { fetchAllBookings, updatePaymentStatus, cancelBooking } from '@/lib/admin'
import type { AdminBooking } from '@/types/booking'
import { pad, h12 } from '@/lib/utils'

const SESSION_KEY = 'pg_admin_auth'
const SESSION_TTL = 24 * 60 * 60 * 1000 // 24 hours

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const { at, token } = JSON.parse(raw) as { at: number; token: string }
    if (!token || Date.now() - at > SESSION_TTL) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return token
  } catch {
    return null
  }
}

function storeSession(token: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ at: Date.now(), token }))
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getDateStr(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function shortDate(s: string) {
  const [, m, d] = s.split('-')
  return `${MONTHS[+m - 1]} ${+d}`
}
function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min ago'
  return `${mins} min ago`
}
function exportCSV(data: AdminBooking[]) {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`
  const rows = [
    ['Date', 'Start', 'Duration (hrs)', 'Guest Name', 'Phone', 'GCash Ref', 'Paid', 'Total (PHP)'],
    ...data.map(b => [
      b.booking_date, h12(b.start_hour), String(b.duration),
      q(b.guest_name), b.phone, b.gcash_ref,
      b.is_paid ? 'Yes' : 'No', String(b.total_price),
    ]),
  ]
  const csv = rows.map(r => r.join(',')).join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
  Object.assign(document.createElement('a'), { href: url, download: `bookings-${getDateStr()}.csv` }).click()
  URL.revokeObjectURL(url)
}

// ── Password Gate ─────────────────────────────────────────────────────────────

function PasswordGate({ onAuth }: { onAuth: (password: string) => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    setLoading(false)

    if (res.ok) {
      storeSession(pw)
      onAuth(pw)
    } else {
      const body = await res.json().catch(() => ({}))
      setError(
        res.status === 429
          ? (body.error ?? 'Too many attempts. Try again in 5 minutes.')
          : 'Incorrect password. Please try again.'
      )
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
              onChange={e => { setPw(e.target.value); setError(null) }}
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
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#006241] hover:bg-[#004d32] disabled:opacity-50 text-white font-semibold text-sm rounded-xl py-3.5 transition-colors duration-200 cursor-pointer"
          >
            {loading ? 'Signing in…' : 'Sign In →'}
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
  selectMode,
  selected,
  onToggleSelect,
  onTogglePaid,
  onCancel,
}: {
  booking: AdminBooking
  showDate: boolean
  selectMode: boolean
  selected: boolean
  onToggleSelect: (id: string) => void
  onTogglePaid: (id: string, newVal: boolean) => void
  onCancel: (id: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function handleToggle() {
    setLoading(true)
    await onTogglePaid(booking.id, !booking.is_paid)
    setLoading(false)
  }

  function copyRef() {
    navigator.clipboard.writeText(booking.gcash_ref)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className={`bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 space-y-3 animate-fade-up transition-[outline] duration-150 ${
        selectMode && selected ? 'outline outline-2 outline-[#006241]' : ''
      }`}
    >

      {/* Row 1 — select / name + toggle + cancel */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          {selectMode && (
            <button
              onClick={() => onToggleSelect(booking.id)}
              aria-label={selected ? 'Deselect booking' : 'Select booking'}
              className="mt-0.5 flex-shrink-0 text-[#006241] cursor-pointer"
            >
              {selected
                ? <CheckSquare className="w-4 h-4" />
                : <Square className="w-4 h-4 text-stone-300" />
              }
            </button>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-stone-900 text-sm leading-snug truncate">{booking.guest_name}</p>
            <p className="text-xs text-stone-400 mt-0.5 tabular-nums">{booking.phone}</p>
            {booking.email && (
              <p className="text-xs text-stone-400 mt-0.5 truncate">{booking.email}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-2">
            {!selectMode && (
              confirming ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.65rem] text-stone-500 font-medium">Cancel?</span>
                  <button
                    onClick={() => onCancel(booking.id)}
                    className="text-[0.65rem] font-bold text-red-500 hover:text-red-600 cursor-pointer"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    className="text-[0.65rem] font-bold text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  aria-label="Cancel booking"
                  className="text-stone-300 hover:text-red-400 transition-colors duration-150 cursor-pointer mt-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )
            )}
            <PaymentToggle isPaid={booking.is_paid} loading={loading} onToggle={handleToggle} />
          </div>
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
        <span className="font-mono text-xs text-stone-700 tracking-wider tabular-nums flex-1">{booking.gcash_ref}</span>
        <button
          onClick={copyRef}
          aria-label="Copy GCash reference"
          className="text-stone-400 hover:text-[#006241] transition-colors duration-150 cursor-pointer flex-shrink-0"
        >
          {copied
            ? <Check className="w-3.5 h-3.5 text-[#006241]" />
            : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  title, subtitle, showDate, bookings, selectMode, selectedIds,
  onToggleSelect, onTogglePaid, onCancel,
}: {
  title: string
  subtitle?: string
  showDate: boolean
  bookings: AdminBooking[]
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onTogglePaid: (id: string, newVal: boolean) => void
  onCancel: (id: string) => void
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
          <BookingCard
            key={b.id}
            booking={b}
            showDate={showDate}
            selectMode={selectMode}
            selected={selectedIds.has(b.id)}
            onToggleSelect={onToggleSelect}
            onTogglePaid={onTogglePaid}
            onCancel={onCancel}
          />
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

function Dashboard({ onLogout, adminToken }: { onLogout: () => void; adminToken: string }) {
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [tab, setTab] = useState<'all' | 'unpaid' | 'paid'>('all')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const TODAY = getDateStr(0)
  const TOMORROW = getDateStr(1)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      setBookings(await fetchAllBookings())
      setLastRefreshed(new Date())
    } catch {
      setError('Could not load bookings. Check your connection and try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function toggleSelectMode() {
    setSelectMode(v => !v)
    setSelectedIds(new Set())
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll(ids: string[]) {
    setSelectedIds(new Set(ids))
  }

  async function handleBulkMarkPaid() {
    const ids = Array.from(selectedIds)
    setBookings(prev => prev.map(b => ids.includes(b.id) ? { ...b, is_paid: true } : b))
    setSelectedIds(new Set())
    setSelectMode(false)
    try {
      await Promise.all(ids.map(id => updatePaymentStatus(id, true, adminToken)))
    } catch {
      load()
    }
  }

  async function handleBulkCancel() {
    const ids = Array.from(selectedIds)
    if (!window.confirm(`Cancel ${ids.length} booking${ids.length !== 1 ? 's' : ''}? This cannot be undone.`)) return
    setBookings(prev => prev.filter(b => !ids.includes(b.id)))
    setSelectedIds(new Set())
    setSelectMode(false)
    try {
      await Promise.all(ids.map(id => cancelBooking(id, adminToken)))
    } catch {
      load()
    }
  }

  async function handleTogglePaid(id: string, newVal: boolean) {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, is_paid: newVal } : b))
    try {
      await updatePaymentStatus(id, newVal, adminToken)
    } catch {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, is_paid: !newVal } : b))
    }
  }

  async function handleCancel(id: string) {
    setBookings(prev => prev.filter(b => b.id !== id))
    try {
      await cancelBooking(id, adminToken)
    } catch {
      load()
    }
  }

  function handleExportCSV() {
    if (!window.confirm(
      'This export contains personal data including names, phone numbers, and GCash references.\n\nOnly download on a secure, trusted device. Continue?'
    )) return
    exportCSV(bookings)
  }

  const filtered = searchTerm.trim()
    ? bookings.filter(b => b.guest_name.toLowerCase().includes(searchTerm.toLowerCase()))
    : bookings

  const displayed = tab === 'unpaid'
    ? filtered.filter(b => !b.is_paid)
    : tab === 'paid'
    ? filtered.filter(b => b.is_paid)
    : filtered

  const grouped = {
    today:    displayed.filter(b => b.booking_date === TODAY),
    tomorrow: displayed.filter(b => b.booking_date === TOMORROW),
    future:   displayed.filter(b => b.booking_date > TOMORROW),
  }
  const pendingCount = filtered.filter(b => !b.is_paid).length
  const allDisplayedIds = displayed.map(b => b.id)

  return (
    <div className="min-h-dvh bg-[#FAF8F5]">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-100 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center justify-between">
          <div className="leading-none">
            <p className="font-serif text-base font-semibold text-stone-900">Pickle Garden</p>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[#006241] mt-0.5">Admin Dashboard</p>
            {lastRefreshed && (
              <p className="text-[0.55rem] text-stone-400 mt-0.5">Updated {timeAgo(lastRefreshed)}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!loading && !error && bookings.length > 0 && (
              <>
                <button
                  onClick={toggleSelectMode}
                  aria-label={selectMode ? 'Exit select mode' : 'Select bookings'}
                  className={`h-9 px-3 rounded-xl border text-xs font-semibold transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#006241] ${
                    selectMode
                      ? 'bg-[#006241] text-white border-[#006241]'
                      : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  {selectMode ? 'Done' : 'Select'}
                </button>
                <button
                  onClick={handleExportCSV}
                  aria-label="Export bookings as CSV"
                  className="w-9 h-9 rounded-xl border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#006241]"
                >
                  <Download className="w-[1.05rem] h-[1.05rem]" />
                </button>
              </>
            )}
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

        {/* ── Search ── */}
        {!loading && !error && bookings.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              type="search"
              aria-label="Search by guest name"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by guest name…"
              className="w-full pl-10 pr-4 py-3 text-sm border border-stone-200 rounded-xl bg-white text-stone-900 placeholder:text-stone-400 outline-none focus:border-[#006241] focus:ring-2 focus:ring-[#006241]/15 transition-all duration-200"
            />
          </div>
        )}

        {/* ── Filter tabs ── */}
        {!loading && !error && bookings.length > 0 && (
          <div className="flex gap-2">
            {([
              { key: 'all',    label: 'All',    count: filtered.length },
              { key: 'unpaid', label: 'Unpaid', count: filtered.filter(b => !b.is_paid).length },
              { key: 'paid',   label: 'Paid',   count: filtered.filter(b => b.is_paid).length },
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 cursor-pointer border ${
                  tab === key
                    ? 'bg-[#006241] text-white border-[#006241]'
                    : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'
                }`}
              >
                {label}
                <span className={`text-[0.6rem] font-bold tabular-nums ${tab === key ? 'opacity-80' : 'opacity-60'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        )}

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

        {/* ── Select all bar ── */}
        {selectMode && displayed.length > 0 && (
          <div className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5">
            <span className="text-xs text-stone-500 font-medium">
              {selectedIds.size} of {displayed.length} selected
            </span>
            <button
              onClick={() =>
                selectedIds.size === allDisplayedIds.length
                  ? setSelectedIds(new Set())
                  : selectAll(allDisplayedIds)
              }
              className="text-xs font-semibold text-[#006241] cursor-pointer"
            >
              {selectedIds.size === allDisplayedIds.length ? 'Deselect all' : 'Select all'}
            </button>
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
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onTogglePaid={handleTogglePaid}
              onCancel={handleCancel}
            />
            <Section
              title="Tomorrow"
              subtitle={shortDate(TOMORROW)}
              showDate={false}
              bookings={grouped.tomorrow}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onTogglePaid={handleTogglePaid}
              onCancel={handleCancel}
            />
            <Section
              title="Future"
              showDate
              bookings={grouped.future}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onTogglePaid={handleTogglePaid}
              onCancel={handleCancel}
            />

            {displayed.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-stone-300">
                <CalendarX2 className="w-12 h-12 mb-4 opacity-40" strokeWidth={1.5} />
                <p className="font-serif text-lg text-stone-400">No upcoming bookings</p>
                <p className="text-sm text-stone-300 mt-1">Check back later</p>
              </div>
            )}
          </>
        )}

      </div>

      {/* ── Bulk action bar ── */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 px-5 pointer-events-none">
          <div className="pointer-events-auto bg-stone-900 text-white rounded-full px-5 py-3 flex items-center gap-4 shadow-2xl animate-fade-up">
            <span className="text-sm font-semibold tabular-nums">{selectedIds.size} selected</span>
            <div className="w-px h-4 bg-white/20" />
            <button
              onClick={handleBulkMarkPaid}
              className="text-sm font-semibold text-[#74c69d] hover:text-green-300 transition-colors cursor-pointer"
            >
              Mark as Paid
            </button>
            <button
              onClick={handleBulkCancel}
              className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [adminToken, setAdminToken] = useState('')

  useEffect(() => {
    const token = getStoredToken()
    if (token) {
      setAdminToken(token)
      setAuthed(true)
    } else {
      setAuthed(false)
    }
  }, [])

  function handleAuth(password: string) {
    setAdminToken(password)
    setAuthed(true)
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY)
    setAdminToken('')
    setAuthed(false)
  }

  if (authed === null) return null

  return authed
    ? <Dashboard onLogout={handleLogout} adminToken={adminToken} />
    : <PasswordGate onAuth={handleAuth} />
}
