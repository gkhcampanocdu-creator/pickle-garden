'use client'

import { useState } from 'react'
import {
  Activity, Wifi,
  CalendarDays, Clock, Timer, Banknote,
} from 'lucide-react'
import StepIndicator from './StepIndicator'
import Calendar from './Calendar'
import DurationPicker from './DurationPicker'
import TimeSlots from './TimeSlots'
import BookingForm from './BookingForm'
import ConfirmView from './ConfirmView'
import SuccessView from './SuccessView'
import CourtInfo from './CourtInfo'
import type { BookingFormData, BookingFormErrors, SummaryData } from '@/types/booking'
import { fetchBookedHours, submitBooking, SlotConflictError } from '@/lib/bookings'

const H_START = 8
const H_END = 22
const PRICE_PER_HOUR = 300

const SHADOW = 'shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)]'

const AMENITIES = [
  { Icon: Activity, label: 'Pickleball Court' },
  { Icon: Wifi, label: 'Free Wi-Fi' },
  { Icon: Banknote, label: '₱300 / hour' },
]

function pad(n: number) { return String(n).padStart(2, '0') }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function h12(h: number) { return `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}` }
function humanDate(s: string) {
  const [, m, d] = s.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[+m - 1]} ${+d}, ${s.split('-')[0]}`
}

// ── Small layout helpers ──────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className={`bg-white rounded-2xl ${SHADOW} p-7 animate-fade-up`}>
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
  const now = new Date()
  const todayStr = toDateStr(now)

  const [step, setStep] = useState<1 | 2 | 3 | 'success'>(1)
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [duration, setDuration] = useState(1)
  const [bookedMap, setBookedMap] = useState<Record<string, number[]>>({})
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [formData, setFormData] = useState<BookingFormData>({ firstName: '', lastName: '', phone: '', email: '' })
  const [formErrors, setFormErrors] = useState<BookingFormErrors>({})
  const [gcashRef, setGcashRef] = useState('')
  const [gcashRefError, setGcashRefError] = useState('')
  const [bookingRef, setBookingRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3800)
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
    if (!/^09\d{9}$/.test(formData.phone.trim())) errors.phone = 'Must be 11 digits starting with 09'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goStep1() { setStep(1); scrollTop() }
  function goStep2() { setStep(2); scrollTop() }
  function goStep3() { setStep(3); scrollTop() }

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

  async function handleSubmit() {
    if (!/^\d{13}$/.test(gcashRef)) {
      setGcashRefError('Must be exactly 13 numeric digits')
      showToast('GCash reference must be exactly 13 digits.', 'error')
      return
    }
    if (!selectedDate || selectedHour === null) return

    setSubmitting(true)
    try {
      const ref = await submitBooking({
        guestName: [formData.firstName, formData.lastName].join(' ').trim(),
        phone: formData.phone,
        email: formData.email,
        date: selectedDate,
        startHour: selectedHour,
        duration,
        totalPrice: duration * PRICE_PER_HOUR,
        gcashRef,
      })
      setBookingRef(ref)
      setStep('success')
      scrollTop()
    } catch (err) {
      if (err instanceof SlotConflictError) {
        showToast('That slot was just taken! Please pick another time.', 'error')
        // Refresh availability and send user back to step 1
        setSelectedHour(null)
        setLoadingSlots(true)
        try {
          const hours = await fetchBookedHours(selectedDate)
          setBookedMap(prev => ({ ...prev, [selectedDate]: hours }))
        } finally {
          setLoadingSlots(false)
        }
        setStep(1)
        scrollTop()
      } else {
        showToast('Something went wrong. Please try again.', 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleReset() {
    setStep(1)
    setSelectedDate(null)
    setSelectedHour(null)
    setDuration(1)
    setFormData({ firstName: '', lastName: '', phone: '', email: '' })
    setFormErrors({})
    setGcashRef('')
    setGcashRefError('')
    setBookingRef('')
    scrollTop()
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
    <div className="min-h-dvh bg-[#FAF8F5] pb-24">
      <div className="max-w-[880px] mx-auto px-5">

        {/* ── Hero ── */}
        <div className="text-center pt-14 pb-8">
          <div className="inline-flex items-center gap-2 bg-white border border-stone-200 text-[#006241] text-[0.72rem] font-semibold tracking-[0.12em] uppercase px-4 py-1.5 rounded-full mb-6 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006241] animate-pulse" />
            Live Availability
          </div>
          <h1 className="font-serif text-[clamp(2.8rem,9vw,5rem)] font-semibold leading-[0.95] tracking-tight text-stone-900">
            Pickle<br />
            <span className="text-[#006241]">Garden</span>
          </h1>
          <p className="mt-5 text-stone-500 text-[0.95rem] leading-relaxed max-w-[440px] mx-auto">
            Pick a date, choose your duration, and grab a slot instantly.
            No double-bookings — availability updates in real time.
          </p>
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

        {/* ── Step 1: Date, Duration, Time ── */}
        {step === 1 && (
          <Card>
            <SectionTitle>Select a Date</SectionTitle>
            <Calendar
              year={calYear}
              month={calMonth}
              today={todayStr}
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
              onPickHour={setSelectedHour}
            />

            <div className="mt-6">
              <button
                disabled={!canContinue}
                onClick={handleStep1Continue}
                className="w-full bg-[#006241] hover:bg-[#004d32] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-base rounded-xl py-4 transition-colors duration-200 cursor-pointer"
              >
                Continue →
              </button>
            </div>
          </Card>
        )}

        {/* ── Step 2: Your Details ── */}
        {step === 2 && (
          <Card>
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
              <button
                onClick={goStep1}
                className="border border-stone-200 text-stone-600 hover:bg-stone-50 font-medium text-sm rounded-xl px-5 py-3.5 transition-colors duration-200 cursor-pointer flex-shrink-0"
              >
                ← Back
              </button>
              <button
                onClick={handleStep2Continue}
                className="flex-1 bg-[#006241] hover:bg-[#004d32] text-white font-semibold text-base rounded-xl py-3.5 transition-colors duration-200 cursor-pointer"
              >
                Review & Confirm →
              </button>
            </div>
          </Card>
        )}

        {/* ── Step 3: Confirm + GCash ── */}
        {step === 3 && (
          <ConfirmView
            summary={summaryData}
            gcashRef={gcashRef}
            gcashRefError={gcashRefError}
            submitting={submitting}
            onGcashRefChange={handleGcashRefChange}
            onBack={goStep2}
            onSubmit={handleSubmit}
          />
        )}

        {/* ── Success ── */}
        {step === 'success' && (
          <SuccessView
            bookingRef={bookingRef}
            summary={summaryData}
            onBookAnother={handleReset}
          />
        )}

        {/* ── Court info (step 1 only) ── */}
        {step === 1 && <CourtInfo />}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-7 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-full text-white text-sm font-semibold shadow-xl whitespace-nowrap animate-fade-up ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-[#006241]'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
