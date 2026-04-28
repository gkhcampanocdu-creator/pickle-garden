'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Activity, Wifi,
  CalendarDays, Clock, Timer, Banknote, AlertTriangle,
} from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion'
import StepIndicator from './StepIndicator'
import Calendar from './Calendar'
import DurationPicker from './DurationPicker'
import TimeSlots from './TimeSlots'
import BookingForm from './BookingForm'
import ConfirmView from './ConfirmView'
import SuccessView from './SuccessView'
import BookingLookup from './BookingLookup'
import type { BookingFormData, BookingFormErrors, SummaryData, PendingBookingEntry } from '@/types/booking'
import { fetchBookedHours, submitBooking, SlotConflictError } from '@/lib/bookings'
import { savePendingBooking, clearPendingBooking, getPendingBooking } from '@/lib/pending-booking'
import { pad, h12 } from '@/lib/utils'

const H_START = 8
const H_END = 22
const PRICE_PER_HOUR = parseInt(process.env.NEXT_PUBLIC_PRICE_PER_HOUR ?? '300', 10)
const MAX_ADVANCE_DAYS = 60

const SHADOW = 'shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)]'

const AMENITIES = [
  { Icon: Activity, label: 'Pickleball Court' },
  { Icon: Wifi, label: 'Free Wi-Fi' },
  { Icon: Banknote, label: '₱300 / hour' },
]

const TAP_SPRING = { type: 'spring' as const, stiffness: 600, damping: 25 }

function makeStepVariants(reduced: boolean | null): Variants {
  if (reduced) {
    return {
      enter:  { opacity: 1, x: 0 },
      center: { opacity: 1, x: 0 },
      exit:   { opacity: 1, x: 0 },
    }
  }
  return {
    enter:  (dir: number) => ({ opacity: 0, x: dir * 40 }),
    center: {
      opacity: 1,
      x: 0,
      transition: { type: 'spring' as const, stiffness: 350, damping: 30 },
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir * -40,
      transition: { duration: 0.18, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
    }),
  }
}

function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
/** Converts +639XXXXXXXXX → 09XXXXXXXXX; passes 09XXXXXXXXX through unchanged. */
function normalizePhone(raw: string): string {
  const t = raw.trim()
  if (/^\+639\d{9}$/.test(t)) return '0' + t.slice(2)
  return t
}
function humanDate(s: string) {
  const [, m, d] = s.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[+m - 1]} ${+d}, ${s.split('-')[0]}`
}

// ── Small layout helpers ──────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className={`bg-white rounded-2xl ${SHADOW} p-4 sm:p-7`}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif text-base font-semibold text-stone-900 mb-4">{children}</h2>
}

function Divider() {
  return <hr className="my-7 border-stone-100" />
}

function SummaryBox({ summary }: { summary: SummaryData }) {
  const rows = [
    { Icon: CalendarDays, label: 'Date', value: summary.date },
    { Icon: Clock, label: 'Time', value: summary.time },
    { Icon: Timer, label: 'Duration', value: summary.duration },
    { Icon: Banknote, label: 'Total', value: summary.price, highlight: true },
  ]
  return (
    <dl className="divide-y divide-stone-100 bg-stone-50 rounded-xl px-5">
      {rows.map(({ Icon, label, value, highlight }) => (
        <div key={label} className="flex items-center justify-between py-3">
          <dt className="flex items-center gap-2 text-sm text-stone-500">
            <Icon className="w-4 h-4 text-[#006241]" />
            {label}
          </dt>
          <dd className={`text-sm font-semibold ${highlight ? 'text-[#006241] text-base' : 'text-stone-800'}`}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BookingFlow() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)
  const prefersReduced = useReducedMotion()
  const now = new Date()
  const todayStr = toDateStr(now)
  const maxDate = new Date(now)
  maxDate.setDate(now.getDate() + MAX_ADVANCE_DAYS)
  const maxDateStr = toDateStr(maxDate)

  const [step, setStep] = useState<1 | 2 | 3 | 'success'>(1)
  const [direction, setDirection] = useState(1)
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [duration, setDuration] = useState(1)
  const [bookedMap, setBookedMap] = useState<Record<string, number[]>>({})
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [formData, setFormData] = useState<BookingFormData>({ firstName: '', lastName: '', phone: '', email: '', consent: false })
  const [formErrors, setFormErrors] = useState<BookingFormErrors>({})
  const [gcashRef, setGcashRef] = useState('')
  const [gcashRefError, setGcashRefError] = useState('')
  const [bookingRef, setBookingRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [slotConflict, setSlotConflict] = useState(false)
  const [lookupOpen, setLookupOpen] = useState(false)
  const isSubmittingRef = useRef(false)
  const [pendingBooking, setPendingBooking] = useState<PendingBookingEntry | null>(null)

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    sectionRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' })
  }, [step])

  useEffect(() => {
    const pending = getPendingBooking()
    if (pending) setPendingBooking(pending)
  }, [])

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5500)
  }

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }

  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  async function handlePickDate(dateStr: string) {
    setSelectedDate(dateStr)
    setSelectedHour(null)
    setLoadingSlots(true)
    try {
      const hours = await fetchBookedHours(dateStr)
      setBookedMap(prev => ({ ...prev, [dateStr]: hours }))
    } catch {
      showToast('Could not load availability. Please try again.', 'error')
    } finally {
      setLoadingSlots(false)
    }
  }

  function handleSetDuration(d: number) {
    setDuration(d)
    setSelectedHour(null)
  }

  function validateForm(): boolean {
    const errors: BookingFormErrors = {}
    if (!formData.firstName.trim()) errors.firstName = 'Required'
    if (!formData.lastName.trim()) errors.lastName = 'Required'
    if (!/^09\d{9}$/.test(normalizePhone(formData.phone))) errors.phone = 'Use format: 09171234567 or +639171234567'
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()))
      errors.email = 'Enter a valid email address'
    if (!formData.consent) errors.consent = 'You must agree to data processing to continue'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  function goStep1() { setDirection(-1); setStep(1) }
  function goStep2() { setDirection(1); setStep(2) }
  function goStep3() { setDirection(1); setStep(3) }

  function handleStep1Continue() {
    if (selectedDate && selectedHour !== null) goStep2()
  }

  function handleStep2Continue() {
    if (!validateForm()) { showToast('Please check all required fields.', 'error'); return }
    goStep3()
  }

  function handleGcashRefChange(val: string) {
    const cleaned = val.replace(/\D/g, '')
    setGcashRef(cleaned)
    setGcashRefError(
      cleaned.length > 0 && !/^\d{13}$/.test(cleaned)
        ? 'Must be exactly 13 numeric digits'
        : ''
    )
  }

  function handleRestoreBooking(entry: PendingBookingEntry) {
    setPendingBooking(null)
    const nameParts = entry.guestName.split(' ')
    setFormData({
      firstName: nameParts[0] ?? '',
      lastName: nameParts.slice(1).join(' ') ?? '',
      phone: entry.phone,
      email: entry.email,
      consent: true,
    })
    setSelectedDate(entry.bookingDate)
    setSelectedHour(entry.startHour)
    setDuration(entry.duration)
    setGcashRef(entry.gcashRef)
    setLoadingSlots(true)
    fetchBookedHours(entry.bookingDate)
      .then(hours => setBookedMap(prev => ({ ...prev, [entry.bookingDate]: hours })))
      .catch(() => {})
      .finally(() => setLoadingSlots(false))
    setDirection(1)
    setStep(3)
  }

  async function handleSubmit() {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true

    if (!/^\d{13}$/.test(gcashRef)) {
      setGcashRefError('Must be exactly 13 numeric digits')
      showToast('GCash reference must be exactly 13 digits.', 'error')
      isSubmittingRef.current = false
      return
    }
    if (!selectedDate || selectedHour === null) {
      isSubmittingRef.current = false
      return
    }

    setSubmitting(true)
    const guestName = [formData.firstName, formData.lastName].join(' ').trim()
    const normalizedPhone = normalizePhone(formData.phone)

    savePendingBooking({
      bookingDate: selectedDate,
      startHour: selectedHour,
      duration,
      totalPrice: duration * PRICE_PER_HOUR,
      guestName,
      phone: normalizedPhone,
      email: formData.email,
      gcashRef,
    })

    try {
      const ref = await submitBooking({
        guestName,
        phone: normalizedPhone,
        email: formData.email,
        date: selectedDate,
        startHour: selectedHour,
        duration,
        totalPrice: duration * PRICE_PER_HOUR,
        gcashRef,
      })
      clearPendingBooking()
      setPendingBooking(null)
      setBookingRef(ref)
      setDirection(1)
      setStep('success')

      // Fire-and-forget confirmation email — never blocks the success screen
      if (formData.email) {
        fetch('/api/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: formData.email,
            guestName,
            bookingRef: ref,
            date: humanDate(selectedDate),
            time: `${h12(selectedHour)} – ${h12(selectedHour + duration)}`,
            duration: `${duration} hour${duration > 1 ? 's' : ''}`,
            price: `₱${(duration * PRICE_PER_HOUR).toLocaleString()}`,
            gcashRef,
          }),
        }).catch(() => {/* silent — booking is already confirmed */})
      }
    } catch (err) {
      if (err instanceof SlotConflictError) {
        clearPendingBooking()
        setPendingBooking(null)
        showToast('That slot was just taken — availability has been refreshed.', 'error')
        setSelectedHour(null)
        setSlotConflict(true)
        setLoadingSlots(true)
        try {
          const hours = await fetchBookedHours(selectedDate)
          setBookedMap(prev => ({ ...prev, [selectedDate]: hours }))
        } finally {
          setLoadingSlots(false)
        }
        setDirection(-1)
        setStep(1)
      } else {
        showToast('Something went wrong. Please try again.', 'error')
      }
    } finally {
      setSubmitting(false)
      isSubmittingRef.current = false
    }
  }

  function handleReset() {
    setDirection(-1)
    setStep(1)
    setSelectedDate(null)
    setSelectedHour(null)
    setDuration(1)
    setFormData({ firstName: '', lastName: '', phone: '', email: '', consent: false })
    setFormErrors({})
    setGcashRef('')
    setGcashRefError('')
    setBookingRef('')
    setBookedMap({})
    setSlotConflict(false)
  }

  const bookedHours = selectedDate ? (bookedMap[selectedDate] ?? []) : []
  const canContinue = selectedDate !== null && selectedHour !== null

  const summaryData: SummaryData = {
    date: selectedDate ? humanDate(selectedDate) : '—',
    time: selectedHour !== null ? `${h12(selectedHour)} – ${h12(selectedHour + duration)}` : '—',
    duration: `${duration} hour${duration > 1 ? 's' : ''}`,
    price: `₱${(duration * PRICE_PER_HOUR).toLocaleString()}`,
    name: [formData.firstName, formData.lastName].filter(Boolean).join(' ') || '—',
    phone: formData.phone || '—',
  }

  return (
    <div ref={sectionRef} className="min-h-dvh bg-[#FAF8F5] pb-24">
      <div className="max-w-[880px] mx-auto px-5">

        {/* ── Section header ── */}
        <div className="text-center pt-12 pb-8">
          <p className="text-[0.6rem] font-bold tracking-[0.3em] uppercase text-[#006241]/40 mb-4">
            Live Availability
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-stone-900">
            Reserve Your Court
          </h2>
          <p className="mt-3 text-stone-400 text-sm max-w-[400px] mx-auto leading-relaxed">
            Pick a date and time — slots update in real time, no double-bookings.
          </p>
          <button
            onClick={() => setLookupOpen(true)}
            className="mt-4 text-xs text-[#006241]/60 hover:text-[#006241] underline underline-offset-2 transition-colors duration-150 cursor-pointer"
          >
            Already booked? Manage your booking →
          </button>
        </div>

        {/* ── Amenities ── */}
        <div className="flex justify-center flex-wrap gap-2.5 mb-9">
          {AMENITIES.map(({ Icon, label }) => (
            <div key={label} className="flex items-center gap-2 bg-white border border-stone-200 rounded-full px-4 py-1.5 text-[0.78rem] font-medium text-stone-500 shadow-sm">
              <Icon className="w-3.5 h-3.5 text-[#006241]" />
              {label}
            </div>
          ))}
        </div>

        {/* ── Step indicator ── */}
        {step !== 'success' && (
          <StepIndicator currentStep={typeof step === 'number' ? step as 1 | 2 | 3 : 3} />
        )}

        {/* ── Step cards — layout animates height between steps ── */}
        <motion.div layout="size" className="min-h-[200px] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>

            {/* ── Step 1: Date, Duration, Time ── */}
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={makeStepVariants(prefersReduced)}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <Card>
                  {pendingBooking && (
                    <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5">
                      <AlertTriangle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-blue-800 font-medium">Unfinished booking found</p>
                        <p className="text-xs text-blue-600 mt-0.5">
                          {humanDate(pendingBooking.bookingDate)} · {h12(pendingBooking.startHour)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                          onClick={() => handleRestoreBooking(pendingBooking)}
                          className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-2 cursor-pointer"
                        >
                          Resume
                        </button>
                        <button
                          onClick={() => { clearPendingBooking(); setPendingBooking(null) }}
                          className="text-xs text-blue-400 hover:text-blue-600 cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                  {slotConflict && (
                    <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <p className="text-sm text-amber-700">That slot was just booked by someone else. Please choose a new time below.</p>
                    </div>
                  )}
                  <SectionTitle>Select a Date</SectionTitle>
                  <Calendar
                    year={calYear}
                    month={calMonth}
                    today={todayStr}
                    maxDate={maxDateStr}
                    selectedDate={selectedDate}
                    bookedMap={bookedMap}
                    hStart={H_START}
                    hEnd={H_END}
                    onPrev={prevMonth}
                    onNext={nextMonth}
                    onPickDate={handlePickDate}
                  />

                  <Divider />

                  <SectionTitle>Booking Duration</SectionTitle>
                  <DurationPicker duration={duration} onSetDuration={handleSetDuration} />

                  <Divider />

                  <SectionTitle>Choose a Time Slot</SectionTitle>
                  <TimeSlots
                    selectedDate={selectedDate}
                    selectedHour={selectedHour}
                    duration={duration}
                    bookedHours={bookedHours}
                    loading={loadingSlots}
                    hStart={H_START}
                    hEnd={H_END}
                    today={todayStr}
                    onPickHour={h => { setSelectedHour(h); setSlotConflict(false) }}
                  />

                  <div className="mt-6">
                    <motion.button
                      disabled={!canContinue}
                      onClick={handleStep1Continue}
                      whileTap={prefersReduced || !canContinue ? undefined : { scale: 0.96 }}
                      transition={TAP_SPRING}
                      className="w-full bg-[#006241] hover:bg-[#004d32] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-base rounded-full py-4 transition-colors duration-200 ease-out cursor-pointer"
                    >
                      Continue →
                    </motion.button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* ── Step 2: Your Details ── */}
            {step === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={makeStepVariants(prefersReduced)}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <Card>
                  {/* Selection recap */}
                  <div className="mb-6 pb-5 border-b border-stone-100">
                    <p className="text-[0.6rem] font-bold tracking-[0.25em] uppercase text-stone-400 mb-1.5">
                      Your Selection
                    </p>
                    <p className="font-serif text-base font-semibold text-[#006241] leading-snug">
                      {selectedDate ? humanDate(selectedDate) : '—'}
                      <span className="font-sans font-normal text-[#006241]/30 mx-1.5" aria-hidden="true">·</span>
                      {duration} hr{duration > 1 ? 's' : ''}
                      <span className="font-sans font-normal text-[#006241]/30 mx-1.5" aria-hidden="true">·</span>
                      {selectedHour !== null ? `${h12(selectedHour)} – ${h12(selectedHour + duration)}` : '—'}
                    </p>
                  </div>

                  <SectionTitle>Your Details</SectionTitle>
                  <BookingForm
                    data={formData}
                    errors={formErrors}
                    onChange={setFormData}
                    onClearError={field => setFormErrors(prev => ({ ...prev, [field]: undefined }))}
                  />

                  <Divider />

                  <SectionTitle>Booking Summary</SectionTitle>
                  <SummaryBox summary={summaryData} />

                  <div className="mt-6 flex gap-3">
                    <motion.button
                      onClick={goStep1}
                      whileTap={prefersReduced ? undefined : { scale: 0.96 }}
                      transition={TAP_SPRING}
                      className="border border-stone-200 text-stone-600 hover:bg-stone-50 font-medium text-sm rounded-xl px-5 py-3.5 transition-colors duration-200 ease-out cursor-pointer flex-shrink-0"
                    >
                      ← Back
                    </motion.button>
                    <motion.button
                      onClick={handleStep2Continue}
                      whileTap={prefersReduced ? undefined : { scale: 0.96 }}
                      transition={TAP_SPRING}
                      className="flex-1 bg-[#006241] hover:bg-[#004d32] text-white font-semibold text-base rounded-full py-3.5 transition-colors duration-200 ease-out cursor-pointer"
                    >
                      Review & Confirm →
                    </motion.button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* ── Step 3: Confirm + GCash ── */}
            {step === 3 && (
              <motion.div
                key="step-3"
                custom={direction}
                variants={makeStepVariants(prefersReduced)}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <ConfirmView
                  summary={summaryData}
                  gcashRef={gcashRef}
                  gcashRefError={gcashRefError}
                  submitting={submitting}
                  onGcashRefChange={handleGcashRefChange}
                  onBack={goStep2}
                  onSubmit={handleSubmit}
                />
              </motion.div>
            )}

            {/* ── Success ── */}
            {step === 'success' && (
              <motion.div
                key="step-success"
                custom={direction}
                variants={makeStepVariants(prefersReduced)}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <SuccessView
                  bookingRef={bookingRef}
                  summary={summaryData}
                  onBookAnother={handleReset}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>

      </div>

      {/* ── Booking lookup modal ── */}
      {lookupOpen && <BookingLookup onClose={() => setLookupOpen(false)} />}

      {/* ── Toast ── */}
      {toast && (
        <div
          role="status"
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          className={`fixed bottom-7 left-1/2 -translate-x-1/2 z-[110] px-6 py-3.5 rounded-full text-white text-sm font-semibold shadow-xl whitespace-nowrap animate-fade-up ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-[#006241]'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
