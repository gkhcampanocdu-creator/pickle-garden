'use client'

import { useState } from 'react'
import { CheckCircle2, CalendarDays, Clock, Timer, Copy, Check } from 'lucide-react'
import type { SummaryData } from '@/types/booking'

interface Props {
  bookingRef: string
  summary: SummaryData
  onBookAnother: () => void
}

const SHADOW = 'shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)]'

const SUMMARY_ROWS = [
  { icon: CalendarDays, key: 'date'     as keyof SummaryData, label: 'Date'     },
  { icon: Clock,        key: 'time'     as keyof SummaryData, label: 'Time'     },
  { icon: Timer,        key: 'duration' as keyof SummaryData, label: 'Duration' },
]

const CONFETTI = [
  { tx: '0px',   ty: '-54px', color: '#006241', delay: '260ms' },
  { tx: '38px',  ty: '-38px', color: '#4ade80', delay: '290ms' },
  { tx: '54px',  ty: '0px',   color: '#fbbf24', delay: '320ms' },
  { tx: '38px',  ty: '38px',  color: '#86efac', delay: '350ms' },
  { tx: '0px',   ty: '54px',  color: '#006241', delay: '380ms' },
  { tx: '-38px', ty: '38px',  color: '#4ade80', delay: '410ms' },
  { tx: '-54px', ty: '0px',   color: '#fbbf24', delay: '440ms' },
  { tx: '-38px', ty: '-38px', color: '#86efac', delay: '470ms' },
]

export default function SuccessView({ bookingRef, summary, onBookAnother }: Props) {
  const [copied, setCopied] = useState(false)

  function copyRef() {
    navigator.clipboard.writeText(bookingRef)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className={`bg-white rounded-2xl ${SHADOW} p-8 text-center`}>

      {/* ── Checkmark with burst ── */}
      <div className="relative inline-flex items-center justify-center mx-auto mb-6">
        {/* Expanding rings */}
        <div className="absolute inset-0 rounded-full border-2 border-[#006241]/35 animate-ring-expand" aria-hidden="true" />
        <div className="absolute inset-0 rounded-full border-2 border-[#006241]/20 animate-ring-expand" style={{ animationDelay: '140ms' }} aria-hidden="true" />

        {/* Confetti dots */}
        {CONFETTI.map(({ tx, ty, color, delay }) => (
          <div
            key={`${tx}${ty}`}
            className="absolute w-2.5 h-2.5 rounded-full animate-burst-out"
            style={{ '--tx': tx, '--ty': ty, backgroundColor: color, animationDelay: delay } as React.CSSProperties}
            aria-hidden="true"
          />
        ))}

        {/* Checkmark circle */}
        <div className="relative z-10 w-16 h-16 rounded-full bg-[#E8F3EE] border-2 border-[#006241] flex items-center justify-center animate-pop-in">
          <CheckCircle2 className="w-8 h-8 text-[#006241]" />
        </div>
      </div>

      <h2 className="font-serif text-3xl font-semibold text-stone-900 mb-2">
        Court Booked!
      </h2>
      <p className="text-stone-500 text-sm leading-relaxed mb-7">
        Your booking is submitted and pending payment verification.<br />
        We&apos;ll confirm your slot within a few hours.
      </p>

      {/* Booking reference */}
      <div className="mb-7">
        <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-2">
          Booking Reference
        </p>
        <div className="inline-flex items-center gap-3 bg-[#E8F3EE] border border-[#006241]/40 rounded-lg px-5 py-2.5">
          <span className="text-[#006241] font-semibold text-lg tracking-wider font-serif">{bookingRef}</span>
          <button
            onClick={copyRef}
            aria-label={copied ? 'Copied!' : 'Copy booking reference'}
            className="text-[#006241]/60 hover:text-[#006241] transition-colors duration-150 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-[#006241]" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        {/* Screen-reader live region + visible feedback */}
        <p
          aria-live="polite"
          className={`text-xs text-[#006241] font-medium mt-1.5 transition-opacity duration-200 ${copied ? 'opacity-100' : 'opacity-0'}`}
        >
          {copied ? 'Copied to clipboard!' : ' '}
        </p>
      </div>

      {/* Summary rows */}
      <dl className="text-left divide-y divide-stone-100 bg-stone-50 rounded-xl px-5 mb-7">
        {SUMMARY_ROWS.map(({ icon: Icon, key, label }) => (
          <div key={label} className="flex items-center justify-between py-3">
            <dt className="flex items-center gap-2 text-sm text-stone-500">
              <Icon className="w-4 h-4 text-[#006241]" />
              {label}
            </dt>
            <dd className="text-sm font-semibold text-stone-800">{summary[key]}</dd>
          </div>
        ))}
      </dl>

      <button
        onClick={onBookAnother}
        className="border border-stone-200 text-stone-600 hover:bg-stone-50 font-medium text-sm rounded-full px-8 py-3.5 transition-colors duration-200 ease-out cursor-pointer"
      >
        + Book Another Slot
      </button>
    </div>
  )
}
