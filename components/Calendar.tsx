'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  year: number
  month: number
  today: string
  maxDate: string
  selectedDate: string | null
  bookedMap: Record<string, number[]>
  hStart: number
  hEnd: number
  onPrev: () => void
  onNext: () => void
  onPickDate: (dateStr: string) => void
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function pad(n: number) { return String(n).padStart(2, '0') }

export default function Calendar({
  year, month, today, maxDate, selectedDate, bookedMap, hStart, hEnd,
  onPrev, onNext, onPickDate,
}: Props) {
  const totalSlots = hEnd - hStart
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const [todayYear, todayMonth] = today.split('-').map(Number)
  const isCurrentMonth = year === todayYear && month === todayMonth - 1

  // Disable "next" when the first day of next month is already past maxDate
  const nextY = month === 11 ? year + 1 : year
  const nextM = month === 11 ? 1 : month + 2
  const isAtMax = `${nextY}-${String(nextM).padStart(2, '0')}-01` > maxDate

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrev}
          disabled={isCurrentMonth}
          aria-label="Previous month"
          className="w-11 h-11 flex items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 hover:border-stone-300 transition-colors duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-stone-200"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-serif font-semibold text-stone-900 text-base">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={onNext}
          disabled={isAtMax}
          aria-label="Next month"
          className="w-11 h-11 flex items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 hover:border-stone-300 transition-colors duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-stone-200"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {DOW.map(d => (
          <div key={d} className="text-center text-[0.68rem] font-semibold tracking-widest text-stone-400 uppercase pb-2">
            {d}
          </div>
        ))}

        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`e-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1
          const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`
          const isPast = dateStr < today
          const isOutOfRange = dateStr > maxDate
          const isSelected = dateStr === selectedDate
          const booked = bookedMap[dateStr] || []
          const hasBookings = booked.length > 0
          const isFull = booked.length >= totalSlots

          if (isPast || isOutOfRange) {
            return (
              <div key={d} className="aspect-square flex items-center justify-center text-sm text-stone-300 cursor-default select-none">
                {d}
              </div>
            )
          }

          const isToday = dateStr === today

          return (
            <button
              key={d}
              onClick={() => !isFull && onPickDate(dateStr)}
              aria-label={`Select ${MONTH_NAMES[month]} ${d}${isToday ? ' (today)' : ''}`}
              aria-pressed={isSelected}
              disabled={isFull}
              className={`aspect-square flex flex-col items-center justify-center text-sm rounded-lg transition-colors duration-150 cursor-pointer relative select-none ${
                isSelected
                  ? 'bg-[#006241] text-white font-semibold shadow-sm'
                  : isFull
                  ? 'text-red-400 opacity-40 cursor-not-allowed'
                  : isToday
                  ? 'text-[#006241] font-semibold hover:bg-[#F0F7F4] ring-2 ring-inset ring-[#006241]/25'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              {d}
              {hasBookings && (
                <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isSelected ? 'bg-white/50' : 'bg-[#006241]/40'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
