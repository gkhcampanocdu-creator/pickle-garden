'use client'

import Image from 'next/image'
import {
  ChevronLeft, Loader2,
  User, Phone, CalendarDays, Clock, Timer, Banknote,
  CheckCircle2, Info, QrCode,
} from 'lucide-react'
import type { SummaryData } from '@/types/booking'

interface Props {
  summary: SummaryData
  gcashRef: string
  gcashRefError: string
  submitting: boolean
  onGcashRefChange: (val: string) => void
  onBack: () => void
  onSubmit: () => void
}

const SHADOW = 'shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)]'

const REVIEW_ROWS = [
  { icon: User,        key: 'name'     as keyof SummaryData, label: 'Guest'    },
  { icon: Phone,       key: 'phone'    as keyof SummaryData, label: 'Phone'    },
  { icon: CalendarDays,key: 'date'     as keyof SummaryData, label: 'Date'     },
  { icon: Clock,       key: 'time'     as keyof SummaryData, label: 'Time'     },
  { icon: Timer,       key: 'duration' as keyof SummaryData, label: 'Duration' },
  { icon: Banknote,    key: 'price'    as keyof SummaryData, label: 'Total'    },
]

export default function ConfirmView({
  summary, gcashRef, gcashRefError, submitting,
  onGcashRefChange, onBack, onSubmit,
}: Props) {
  const isRefValid   = /^\d{13}$/.test(gcashRef)
  const hasPartial   = gcashRef.length > 0 && !isRefValid
  const showError    = hasPartial && gcashRefError

  // ── input border / ring states ──────────────────────────────────────────────
  const inputClass = [
    'w-full border rounded-xl px-4 py-3.5 pr-11 text-stone-900 text-sm bg-white',
    'placeholder:text-stone-300 outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out',
    'font-mono tracking-wider',
    isRefValid
      ? 'border-[#006241] ring-2 ring-[#006241]/15 bg-[#E8F3EE]/20'
      : showError
      ? 'border-red-400 ring-2 ring-red-100'
      : 'border-stone-200 focus:ring-2 focus:ring-[#006241]/20 focus:border-[#006241]',
  ].join(' ')

  return (
    <div className="space-y-4">

      {/* ── Review card ── */}
      <div className={`bg-white rounded-2xl ${SHADOW} p-7`}>
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-5">
          Review Your Booking
        </h2>
        <dl className="divide-y divide-stone-100">
          {REVIEW_ROWS.map(({ icon: Icon, key, label }) => (
            <div key={label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <dt className="flex items-center gap-2 text-sm text-stone-500">
                <Icon className="w-4 h-4 text-[#006241] flex-shrink-0" />
                {label}
              </dt>
              <dd className={`text-sm font-semibold text-right ml-4 ${key === 'price' ? 'text-[#006241] text-base' : 'text-stone-800'}`}>
                {summary[key]}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ── GCash Payment card ── */}
      <div className={`bg-white rounded-2xl ${SHADOW} p-7`}>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <QrCode className="w-5 h-5 text-[#006241]" />
          <h2 className="font-serif text-lg font-semibold text-stone-900">GCash Payment</h2>
        </div>

        {/* QR section */}
        <div className="flex flex-col items-center bg-[#FAF8F5] border border-stone-100 rounded-2xl px-6 py-7 mb-6">
          <Image
            src={process.env.NEXT_PUBLIC_GCASH_QR_PATH ?? '/gcash-qr.png'}
            alt="Scan to pay via GCash"
            width={224}
            height={224}
            className="rounded-2xl shadow-md mb-4"
          />
          <p className="text-xs text-stone-500 text-center leading-relaxed max-w-[220px]">
            Open GCash → <span className="font-medium text-stone-600">Scan QR</span> or use <span className="font-medium text-stone-600">Pay QR</span> to send payment.<br className="mb-1" />
            Then enter your <span className="font-medium text-stone-600">13-digit reference</span> below.
          </p>
        </div>

        {/* Reference input */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="gcash-ref" className="text-xs font-semibold tracking-widest uppercase text-stone-500">
              GCash Reference Number
            </label>
            <span className={`text-xs font-medium tabular-nums transition-colors duration-200 ${
              isRefValid ? 'text-[#006241]' : 'text-stone-400'
            }`}>
              {gcashRef.length}/13
            </span>
          </div>

          <div className="relative">
            <input
              id="gcash-ref"
              type="text"
              inputMode="numeric"
              maxLength={13}
              placeholder="0000000000000"
              value={gcashRef}
              onChange={e => onGcashRefChange(e.target.value)}
              className={inputClass}
            />
            {/* Success checkmark */}
            <div className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-all duration-200 ${
              isRefValid ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}>
              <CheckCircle2 className="w-5 h-5 text-[#006241]" />
            </div>
          </div>

          {/* Feedback line */}
          <div className="mt-1.5 h-4">
            {isRefValid && (
              <p className="text-xs text-[#006241] flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Reference number confirmed
              </p>
            )}
            {showError && (
              <p className="text-xs text-red-500">{gcashRefError}</p>
            )}
          </div>
        </div>

        {/* Admin verification note */}
        <div className="flex items-start gap-3 bg-[#FAF8F5] border border-stone-200 rounded-xl p-4 mt-5 mb-6">
          <Info className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-stone-500 leading-relaxed">
            Your booking will be{' '}
            <span className="font-medium text-stone-600">officially confirmed</span>{' '}
            once your GCash payment is verified by our admin. Confirmation is typically sent within a few hours.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 border border-stone-200 text-stone-600 hover:bg-stone-50 font-medium text-sm rounded-xl px-5 py-3.5 transition-colors duration-200 ease-out cursor-pointer flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting || !isRefValid}
            className={[
              'flex-1 flex items-center justify-center gap-2.5',
              'text-white font-semibold text-base rounded-full py-3.5',
              'transition-[background-color,transform,filter] duration-150 ease-out',
              submitting
                ? 'bg-[#006241]/85 scale-[0.98] cursor-wait'
                : !isRefValid
                ? 'bg-[#006241] opacity-40 cursor-not-allowed'
                : 'bg-[#006241] hover:bg-[#004d32] active:scale-[0.97] active:filter active:brightness-90 motion-reduce:active:scale-100 cursor-pointer',
            ].join(' ')}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Confirming…
              </>
            ) : (
              'Confirm Booking'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
