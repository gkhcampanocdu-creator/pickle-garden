'use client'

import { CalendarSearch } from 'lucide-react'
import { h12 } from '@/lib/utils'

interface Props {
  selectedDate: string | null
  selectedSlots: number[]
  bookedHours: number[]
  loading: boolean
  hStart: number
  hEnd: number
  today: string
  onToggleSlot: (h: number) => void
}

const LEGEND = [
  { bg: 'bg-white border border-stone-200', label: 'Available' },
  { bg: 'bg-[#006241]', label: 'Selected' },
  { bg: 'bg-red-50 border border-red-200', label: 'Booked' },
]

export default function TimeSlots({
  selectedDate, selectedSlots, bookedHours,
  loading, hStart, hEnd, today, onToggleSlot,
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

      <div role="group" aria-label="Available time slots">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-1.5">
          {Array.from({ length: hEnd - hStart }, (_, i) => {
            const h = hStart + i

            const isPast      = isToday && h <= currentHour
            const isBooked    = !isPast && bookedHours.includes(h)
            const isSelected  = !isPast && !isBooked && selectedSlots.includes(h)
            const isAvailable = !isPast && !isBooked && !isSelected

            let wrapClass: string
            let timeClass: string
            let tagText: string
            let tagClass: string

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
            } else if (isSelected) {
              wrapClass = 'bg-[#006241] border border-[#006241] shadow-sm cursor-pointer'
              timeClass = 'text-white font-semibold'
              tagText   = '✓ Selected'
              tagClass  = 'text-white/70'
            } else {
              wrapClass = 'bg-white border border-stone-200 hover:border-[#006241] hover:bg-[#E8F3EE]/60 cursor-pointer'
              timeClass = 'text-stone-700'
              tagText   = 'Open'
              tagClass  = 'text-stone-400'
            }

            return (
              <div
                key={h}
                role={isAvailable || isSelected ? 'checkbox' : undefined}
                aria-checked={isSelected ? true : isAvailable ? false : undefined}
                aria-disabled={isPast || isBooked ? true : undefined}
                tabIndex={isAvailable || isSelected ? 0 : undefined}
                aria-label={
                  isAvailable || isSelected
                    ? `${h12(h)}${isSelected ? ', selected' : ''}`
                    : undefined
                }
                onClick={() => (isAvailable || isSelected) && onToggleSlot(h)}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ' ') && (isAvailable || isSelected)) onToggleSlot(h)
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
