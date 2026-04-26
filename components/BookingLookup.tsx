'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Search, CalendarDays, Clock, Timer, Banknote, CheckCircle2, XCircle, Loader2, Phone, AlertTriangle } from 'lucide-react'

interface LookupResult {
  id: string
  ref: string
  guestName: string
  phone: string    // masked, e.g. 0917****567
  bookingDate: string
  startHour: number
  duration: number
  totalPrice: number
  isPaid: boolean
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function h12(h: number) { return `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}` }
function normalizePhone(raw: string): string {
  const t = raw.trim()
  if (/^\+639\d{9}$/.test(t)) return '0' + t.slice(2)
  return t
}
function humanDate(s: string) {
  const [y, m, d] = s.split('-')
  return `${MONTHS[+m - 1]} ${+d}, ${y}`
}

type Phase = 'idle' | 'loading' | 'found' | 'not_found' | 'cancelling' | 'cancelled' | 'cancel_error'

export default function BookingLookup({ onClose }: { onClose: () => void }) {
  const [ref, setRef] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<LookupResult | null>(null)
  const [serverError, setServerError] = useState('')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelPhoneRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    // Trap scroll on body
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Move focus to phone input when cancel confirmation appears
  useEffect(() => {
    if (showCancelConfirm) cancelPhoneRef.current?.focus()
  }, [showCancelConfirm])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!ref.trim()) return
    setPhase('loading')
    setServerError('')
    setResult(null)
    setShowCancelConfirm(false)

    try {
      const res = await fetch(`/api/lookup-booking?ref=${encodeURIComponent(ref.trim())}`)
      const data = await res.json()
      if (!res.ok) {
        setServerError(data.error ?? 'Booking not found.')
        setPhase('not_found')
      } else {
        setResult(data)
        setPhase('found')
      }
    } catch {
      setServerError('Could not connect. Please try again.')
      setPhase('not_found')
    }
  }

  async function handleCancel() {
    if (!result) return
    const normalizedPhone = normalizePhone(phone)
    if (!/^09\d{9}$/.test(normalizedPhone)) {
      setPhoneError('Use format: 09171234567 or +639171234567')
      return
    }
    setPhoneError('')
    setPhase('cancelling')

    try {
      const res = await fetch('/api/cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: result.ref, phone: normalizedPhone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setServerError(data.error ?? 'Cancellation failed.')
        setPhase('cancel_error')
      } else {
        setPhase('cancelled')
      }
    } catch {
      setServerError('Could not connect. Please try again.')
      setPhase('cancel_error')
    }
  }

  const SHADOW = 'shadow-[0_8px_40px_rgba(0,0,0,0.14),0_2px_10px_rgba(0,0,0,0.08)]'

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4 animate-backdrop-enter"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={`w-full max-w-md bg-white rounded-2xl ${SHADOW} overflow-hidden animate-modal-enter`}
        role="dialog"
        aria-modal="true"
        aria-label="Manage your booking"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100">
          <h2 className="font-serif text-lg font-semibold text-stone-900">Manage Booking</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors duration-150 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Lookup form */}
          {(phase === 'idle' || phase === 'loading' || phase === 'not_found') && (
            <form onSubmit={handleLookup} className="space-y-4">
              <p className="text-sm text-stone-500 leading-relaxed">
                Enter your booking reference (found on your confirmation screen, e.g. <span className="font-mono font-semibold text-stone-700">#PB1A2B3C</span>) to view or cancel your booking.
              </p>
              <div>
                <label htmlFor="lookup-ref" className="block text-[0.68rem] font-semibold uppercase tracking-widest text-stone-400 mb-2">
                  Booking Reference
                </label>
                <div className="relative">
                  <input
                    id="lookup-ref"
                    ref={inputRef}
                    type="text"
                    value={ref}
                    onChange={e => { setRef(e.target.value.toUpperCase()); setServerError('') }}
                    placeholder="#PB1A2B3C"
                    autoComplete="off"
                    className="w-full border border-stone-200 rounded-xl px-4 py-3.5 pr-11 text-stone-900 text-sm font-mono tracking-wider bg-white placeholder:text-stone-300 outline-none transition-[border-color,box-shadow] duration-200 focus:ring-2 focus:ring-[#006241]/20 focus:border-[#006241]"
                  />
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 pointer-events-none" />
                </div>
                {serverError && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <XCircle className="w-3 h-3 flex-shrink-0" />
                    {serverError}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={!ref.trim() || phase === 'loading'}
                className="w-full bg-[#006241] hover:bg-[#004d32] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-full py-3.5 transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                {phase === 'loading' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Looking up…</>
                ) : (
                  'Find My Booking'
                )}
              </button>
            </form>
          )}

          {/* Booking found */}
          {(phase === 'found' || phase === 'cancelling' || phase === 'cancel_error') && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#006241]">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm font-semibold">Booking found</p>
                <span className="ml-auto font-mono text-xs font-bold bg-[#E8F3EE] px-2.5 py-1 rounded-full">{result.ref}</span>
              </div>

              <dl className="divide-y divide-stone-100 bg-stone-50 rounded-xl px-4">
                {[
                  { Icon: CalendarDays, label: 'Date',     value: humanDate(result.bookingDate) },
                  { Icon: Clock,        label: 'Time',     value: `${h12(result.startHour)} – ${h12(result.startHour + result.duration)}` },
                  { Icon: Timer,        label: 'Duration', value: `${result.duration} hr${result.duration !== 1 ? 's' : ''}` },
                  { Icon: Banknote,     label: 'Total',    value: `₱${result.totalPrice.toLocaleString()}` },
                ].map(({ Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5">
                    <dt className="flex items-center gap-2 text-xs text-stone-500">
                      <Icon className="w-3.5 h-3.5 text-[#006241]" />
                      {label}
                    </dt>
                    <dd className="text-xs font-semibold text-stone-800">{value}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-xs text-stone-500">Payment</dt>
                  <dd className={`text-xs font-bold ${result.isPaid ? 'text-[#006241]' : 'text-amber-500'}`}>
                    {result.isPaid ? 'Verified ✓' : 'Pending verification'}
                  </dd>
                </div>
              </dl>

              <p className="text-xs text-stone-400 text-center">
                Booked under a number ending in <span className="font-semibold text-stone-600">{result.phone.slice(-7)}</span>
              </p>

              {/* Cancel section */}
              {!showCancelConfirm ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full border border-red-200 text-red-500 hover:bg-red-50 font-medium text-sm rounded-xl py-3 transition-colors duration-200 cursor-pointer"
                >
                  Cancel this booking
                </button>
              ) : (
                <div className="space-y-3 border border-red-200 rounded-xl p-4 bg-red-50/50">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 leading-relaxed">
                      To confirm cancellation, enter the phone number used when booking. Cancellations must be at least 2 hours before your slot.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="cancel-phone" className="block text-[0.68rem] font-semibold uppercase tracking-widest text-stone-400 mb-2">
                      Your Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                      <input
                        id="cancel-phone"
                        ref={cancelPhoneRef}
                        type="tel"
                        inputMode="numeric"
                        placeholder="09171234567"
                        value={phone}
                        onChange={e => { setPhone(e.target.value); setPhoneError(''); setServerError('') }}
                        className={`w-full border rounded-xl pl-9 pr-4 py-3 text-sm bg-white text-stone-900 placeholder:text-stone-300 outline-none transition-[border-color,box-shadow] duration-200 focus:ring-2 focus:ring-red-200 focus:border-red-400 ${phoneError || (phase === 'cancel_error') ? 'border-red-400' : 'border-stone-200'}`}
                      />
                    </div>
                    {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                    {phase === 'cancel_error' && serverError && (
                      <p className="text-xs text-red-500 mt-1">{serverError}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowCancelConfirm(false); setPhone(''); setPhoneError(''); setServerError('') }}
                      className="flex-1 border border-stone-200 text-stone-600 hover:bg-stone-50 font-medium text-sm rounded-xl py-2.5 transition-colors duration-200 cursor-pointer"
                    >
                      Keep it
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={phase === 'cancelling'}
                      className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl py-2.5 flex items-center justify-center gap-2 transition-colors duration-200 cursor-pointer"
                    >
                      {phase === 'cancelling' ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cancelling…</>
                      ) : (
                        'Confirm Cancel'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cancelled success */}
          {phase === 'cancelled' && (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-stone-500" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-stone-900">Booking Cancelled</h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                Your booking has been cancelled. The slot is now available for others.
              </p>
              <button
                onClick={onClose}
                className="mt-2 border border-stone-200 text-stone-600 hover:bg-stone-50 font-medium text-sm rounded-full px-6 py-3 transition-colors duration-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
