'use client'

import { motion } from 'framer-motion'

interface Props {
  duration: number
  onSetDuration: (d: number) => void
}

const OPTIONS = [
  { hours: 1, label: '1 hr',  price: '₱300',   originalPrice: null     },
  { hours: 2, label: '2 hrs', price: '₱600',   originalPrice: null     },
  { hours: 3, label: '3 hrs', price: '₱900',   originalPrice: null     },
  { hours: 4, label: '4 hrs', price: '₱1,000', originalPrice: '₱1,200' },
]

const PRICE_SPRING  = { type: 'spring' as const, stiffness: 480, damping: 26 }
const BADGE_SPRING  = { type: 'spring' as const, stiffness: 380, damping: 12, delay: 0.25 }

export default function DurationPicker({ duration, onSetDuration }: Props) {
  return (
    // pt-4 gives the absolutely-positioned badge room above the top row of buttons
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
      {OPTIONS.map(({ hours, label, price, originalPrice }) => {
        const isActive = duration === hours
        return (
          <button
            key={hours}
            onClick={() => onSetDuration(hours)}
            aria-pressed={isActive}
            // relative + overflow-visible lets the badge escape the button box
            className={`relative overflow-visible rounded-xl border py-3.5 text-center cursor-pointer transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out ${
              isActive
                ? 'bg-[#006241] border-[#006241] shadow-sm scale-[1.03]'
                : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50'
            }`}
          >
            {/* ── Best Value badge — 4 hr only, absolute so it adds zero height ── */}
            {hours === 4 && (
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={BADGE_SPRING}
                className={`
                  absolute -top-3.5 left-1/2 -translate-x-1/2
                  px-2 py-[2px] rounded-full whitespace-nowrap pointer-events-none
                  text-[0.52rem] font-bold uppercase tracking-wider shadow-sm
                  ${isActive
                    ? 'bg-[#D4AF37] text-white ring-1 ring-white/30'
                    : 'bg-[#D4AF37] text-white'}
                `}
                aria-label="Best value option"
              >
                Best Value
              </motion.span>
            )}

            {/* ── Number ── */}
            <div className={`font-serif font-semibold text-xl leading-none ${isActive ? 'text-white' : 'text-stone-800'}`}>
              {hours}
            </div>

            {/* ── Label ── */}
            <div className={`text-[0.63rem] font-medium mt-1 ${isActive ? 'text-white/70' : 'text-stone-400'}`}>
              {label}
            </div>

            {/* ── Price — springs in on selection change ── */}
            <motion.div
              key={`${hours}-${duration}`}
              initial={{ opacity: 0.7, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={PRICE_SPRING}
              className="mt-1.5"
            >
              {originalPrice ? (
                // Inline strikethrough + discounted price — same single-line height as other buttons
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-[0.62rem] tabular-nums line-through leading-none ${isActive ? 'text-white/40' : 'text-stone-400'}`}>
                    {originalPrice}
                  </span>
                  <span className={`text-[0.8rem] font-bold tabular-nums leading-none ${isActive ? 'text-white' : 'text-stone-700'}`}>
                    {price}
                  </span>
                </div>
              ) : (
                <div className={`text-[0.7rem] font-semibold tabular-nums ${isActive ? 'text-white' : 'text-stone-500'}`}>
                  {price}
                </div>
              )}
            </motion.div>
          </button>
        )
      })}
    </div>
  )
}
