'use client'

import { CalendarSearch } from 'lucide-react'

interface Props {
  selectedDate: string | null
  selectedHour: number | null
  duration: number
  bookedHours: number[]
  loading: boolean
  hStart: number
  hEnd: number
  today: string
  onPickHour: (h: number) => void
}

function h12(h: number): string {
  return `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`
}

/**
 * Returns true only when the range [h, h+duration) would overlap an already-booked
 * hour. End-of-day overflow is handled separately so it gets its own visual state.
 */
function hasBookingConflict(h: number, bookedHours: number[], duration: number): boolean {
  for (let i = h; i < h + duration; i++) {
    if (bookedHours.includes(i)) return true
  }
  return false
}

const LEGEND = [
  { bg: 'bg-white border border-stone-200', label: 'Available' },
  { bg: 'bg-[#006241]', label: 'Start' },
  { bg: 'bg-[#E8F3EE] border border-[#006241]', label: 'Your range' },
  { bg: 'bg-red-50 border border-red-200', label: 'Booked' },
]

export default function TimeSlots({
  selectedDate, selectedHour, duration, bookedHours,
  loading, hStart, hEnd, today, onPickHour,
}: Props) {
  if (!selectedDate) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
        <CalendarSearch className="w-8 h-8 mb-2.5 opacity-40" />
        <p className="text-sm font-medium">Pick a date above to see available slots</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-1.5">
        {Array.from({ length: hEnd - hStart }, (_, i) => (
          <div key={i} className="h-[62px] rounded-lg bg-stone-100 animate-pulse" />
        ))}
      </div>
    )
  }

  const isToday = selectedDate === today
  const currentHour = new Date().getHours()

  return (
    <>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3.5">
        {LEGEND.map(({ bg, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[0.7rem] text-stone-500">
            <div className={`w-3 h-3 rounded-sm ${bg}`} />
            {label}
          </div>
        ))}
      </div>

      <div role="radiogroup" aria-label="Available time slots">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-1.5">
          {Array.from({ length: hEnd - hStart }, (_, i) => {
            const h = hStart + i

            // ── State derivation (priority order) ──────────────────────────────
            const isPast     = isToday && h <= currentHour
            const isBooked   = !isPast && bookedHours.includes(h)
            // Overflow: this slot as a start would run past closing time
            const isOverflow = !isPast && !isBooked && duration > 1 && h + duration > hEnd
            // Conflict: range [h, h+duration) overlaps an actual booked hour
            const isConflict = !isPast && !isBooked && !isOverflow && hasBookingConflict(h, bookedHours, duration)
            const isStart    = !isPast && !isBooked && !isOverflow && !isConflict && h === selectedHour
            const isRange    =
              !isPast && !isBooked && !isOverflow && !isConflict &&
              selectedHour !== null && h > selectedHour && h < selectedHour + duration
            const isAvailable = !isPast && !isBooked && !isOverflow && !isConflict && !isStart && !isRange

            // ── Visual config ───────────────────────────────────────────────────
            let wrapClass: string
            let timeClass: string
            let tagText: string
            let tagClass: string
            let clickable = false

            if (isPast) {
              wrapClass = 'bg-stone-50 border border-dashed border-stone-200 opacity-40 cursor-default'
              timeClass = 'text-stone-400'
              tagText   = 'Past'
              tagClass  = 'text-stone-300'
            } else if (isBooked) {
              wrapClass = 'bg-red-50 border border-red-200 cursor-not-allowed opacity-70'
              timeClass = 'text-red-400'
              tagText   = 'Booked'
              tagClass  = 'text-red-300'
            } else if (isOverflow) {
              // Not enough time before closing — distinct from a booking conflict
              wrapClass = 'bg-amber-50 border border-amber-200 opacity-70 cursor-not-allowed'
              timeClass = 'text-amber-500'
              tagText   = 'Too late'
              tagClass  = 'text-amber-400'
            } else if (isConflict) {
              // Range would overlap a real booking
              wrapClass = 'bg-stone-50 border border-dashed border-stone-200 opacity-50 cursor-not-allowed'
              timeClass = 'text-stone-400'
              tagText   = 'Overlap'
              tagClass  = 'text-stone-300'
            } else if (isStart) {
              wrapClass = 'bg-[#006241] border border-[#006241] shadow-sm cursor-pointer'
              timeClass = 'text-white font-semibold'
              tagText   = '✓ Start'
              tagClass  = 'text-white/70'
              clickable = true
            } else if (isRange) {
              wrapClass = 'bg-[#E8F3EE] border border-[#006241] cursor-pointer'
              timeClass = 'text-[#006241] font-medium'
              tagText   = 'Your slot'
              tagClass  = 'text-[#006241]/60'
              clickable = true
            } else {
              wrapClass = 'bg-white border border-stone-200 hover:border-[#006241] hover:bg-[#E8F3EE]/60 cursor-pointer'
              timeClass = 'text-stone-700'
              tagText   = 'Open'
              tagClass  = 'text-stone-400'
              clickable = true
            }

            return (
              <div
                key={h}
                role={clickable ? 'radio' : undefined}
                aria-checked={clickable ? (isStart || isRange) : undefined}
                aria-hidden={!clickable ? true : undefined}
                tabIndex={clickable ? 0 : undefined}
                aria-label={
                  clickable
                    ? `${h12(h)}${isStart ? ', selected start' : isRange ? ', within your booking' : ''}`
                    : undefined
                }
                onClick={() => isAvailable && onPickHour(h)}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ' ') && isAvailable) onPickHour(h)
                }}
                className={`rounded-lg py-2.5 px-2 text-center transition-colors duration-150 select-none ${wrapClass}`}
              >
                <span className={`block text-[0.8rem] font-semibold ${timeClass}`}>{h12(h)}</span>
                <span className={`block text-[0.6rem] mt-0.5 ${tagClass}`}>{tagText}</span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
