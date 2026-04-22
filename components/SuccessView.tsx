'use client'

import { CheckCircle2, CalendarDays, Clock, Timer } from 'lucide-react'
import type { SummaryData } from '@/types/booking'

interface Props {
  bookingRef: string
  summary: SummaryData
  onBookAnother: () => void
}

const SHADOW = 'shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)]'

const SUMMARY_ROWS = [
  { icon: CalendarDays, key: 'date' as keyof SummaryData, label: 'Date' },
  { icon: Clock, key: 'time' as keyof SummaryData, label: 'Time' },
  { icon: Timer, key: 'duration' as keyof SummaryData, label: 'Duration' },
]

export default function SuccessView({ bookingRef, summary, onBookAnother }: Props) {
  return (
    <div className={`bg-white rounded-2xl ${SHADOW} p-8 text-center animate-fade-up`}>
      <div className="w-16 h-16 rounded-full bg-[#E8F3EE] border-2 border-[#006241] flex items-center justify-center mx-auto mb-5 animate-pop-in">
        <CheckCircle2 className="w-8 h-8 text-[#006241]" />
      </div>

      <h2 className="font-serif text-3xl font-semibold text-stone-900 mb-2">
        Court Booked!
      </h2>
      <p className="text-stone-500 text-sm leading-relaxed mb-7">
        Your reservation is confirmed.<br />See you on the court!
      </p>

      <div className="mb-7">
        <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-2">
          Booking Reference
        </p>
        <div className="inline-flex items-center gap-2 bg-[#E8F3EE] border border-[#C8DDD5] rounded-lg px-6 py-2.5 text-[#006241] font-semibold text-lg tracking-wider font-serif">
          {bookingRef}
        </div>
      </div>

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
        className="border border-stone-200 text-stone-600 hover:bg-stone-50 font-medium text-sm rounded-xl px-8 py-3.5 transition-colors duration-200 cursor-pointer"
      >
        + Book Another Slot
      </button>
    </div>
  )
}
