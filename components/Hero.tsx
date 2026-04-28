'use client'

import { Fragment } from 'react'
import { Clock, Banknote, Zap } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

const STATS = [
  { Icon: Clock,    value: '8 AM – 10 PM', label: 'Daily Hours' },
  { Icon: Banknote, value: '₱300 / hr',    label: 'Court Rate'  },
  { Icon: Zap,      value: 'Instant',       label: 'Booking'     },
]

const AVATAR_COLORS = ['#52b788', '#74c69d', '#95d5b2', '#b7e4c7']

function scrollToBook() {
  document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function LeafSprig({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="220" height="280" viewBox="0 0 220 280"
      fill="none" aria-hidden="true" style={style}
    >
      <path d="M35 265 Q62 208 90 152 Q115 100 155 42"
        stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M90 152 Q50 136 37 103 Q67 87 90 152Z"
        fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>
      <path d="M90 152 Q63 128 54 106"
        stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" strokeLinecap="round"/>
      <path d="M118 105 Q152 88 165 58 Q138 52 118 105Z"
        fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.11)" strokeWidth="0.8"/>
      <path d="M118 105 Q143 82 157 62"
        stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" strokeLinecap="round"/>
      <path d="M155 42 Q176 18 183 0 Q162 14 155 42Z"
        fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.10)" strokeWidth="0.8"/>
      <path d="M60 210 Q32 194 19 165 Q50 158 60 210Z"
        fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.09)" strokeWidth="0.8"/>
    </svg>
  )
}

const ENTRANCE_SPRING = { type: 'spring', stiffness: 420, damping: 35 } as const
const TAP_SPRING      = { type: 'spring', stiffness: 600, damping: 25 } as const

export default function Hero() {
  const prefersReduced = useReducedMotion()

  function item(delay: number) {
    return {
      hidden:  prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { ...ENTRANCE_SPRING, delay } },
    }
  }

  return (
    <section
      className="relative flex flex-col min-h-[100svh] bg-[#006241]"
      aria-label="Hero"
    >

      {/* ── Decorative layer — overflow-hidden scoped here so it never clips text ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">

        {/* Breathing grid background */}
        <div
          className="animate-grid-breathe w-full h-full"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        {/* Botanical sprig — top left */}
        <div className="absolute top-0 left-0">
          <LeafSprig />
        </div>

        {/* Botanical sprig — bottom right */}
        <div
          className="absolute bottom-0 right-0"
          style={{ transform: 'rotate(180deg)' }}
        >
          <LeafSprig />
        </div>

        {/* Stamp seal */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%]">
          <svg width="500" height="500" viewBox="0 0 500 500" fill="none">
            <circle cx="250" cy="250" r="247" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
            <circle cx="250" cy="250" r="222" stroke="rgba(255,255,255,0.05)" strokeWidth="0.75" strokeDasharray="4 9"/>
            <circle cx="250" cy="250" r="197" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
          </svg>
        </div>

        {/* Top radial highlight */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,255,255,0.06) 0%, transparent 70%)' }}
        />

      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center px-5 py-16 sm:py-24 gap-6">

        {/* Overline */}
        <motion.div
          initial="hidden" animate="visible"
          variants={item(0)}
          style={{ willChange: 'transform' }}
        >
          <p className="text-[0.58rem] font-bold tracking-[0.35em] uppercase text-white/40">
            Pickle Garden &nbsp;·&nbsp; Cebu
          </p>
        </motion.div>

        {/* Live availability badge */}
        <motion.div
          initial="hidden" animate="visible"
          variants={item(0.08)}
          style={{ willChange: 'transform' }}
        >
          <div className="animate-badge-float inline-flex items-center gap-2 border border-white/20 bg-white/10 backdrop-blur-sm text-white text-[0.65rem] font-semibold tracking-[0.08em] px-4 py-1.5 rounded-full shadow-sm">
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
              <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-white opacity-60" aria-hidden="true" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" aria-hidden="true" />
            </span>
            Live Availability
          </div>
        </motion.div>

        {/* Headline */}
        <h1 className="font-serif text-[clamp(2.8rem,8.5vw,5.8rem)] font-semibold leading-[1.06] tracking-tight max-w-3xl mx-auto">
          <motion.div
            className="block overflow-hidden"
            initial="hidden" animate="visible"
            variants={item(0.17)}
            style={{ willChange: 'transform' }}
          >
            <span className="text-[#FAF8F5]">Elevate Your Game.</span>
          </motion.div>
          <motion.div
            className="block overflow-hidden"
            initial="hidden" animate="visible"
            variants={item(0.27)}
            style={{ willChange: 'transform' }}
          >
            <span className="text-white/75 italic">Find Your Community.</span>
          </motion.div>
        </h1>

        {/* Diamond divider */}
        <motion.div
          className="flex items-center gap-3 w-32 mx-auto"
          initial="hidden" animate="visible"
          variants={item(0.35)}
          aria-hidden="true"
        >
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.25)' }} />
          <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
            <path d="M3.5 0L7 3.5L3.5 7L0 3.5Z" fill="rgba(255,255,255,0.4)" />
          </svg>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.25)' }} />
        </motion.div>

        {/* Sub-headline */}
        <motion.div
          initial="hidden" animate="visible"
          variants={item(0.42)}
          style={{ willChange: 'transform' }}
        >
          <p className="text-white/60 text-base leading-relaxed max-w-[440px] mx-auto">
            Reserve a premium pickleball court in minutes. No waiting, no calls — just show up and play.
          </p>
        </motion.div>

        {/* CTA + pricing assurance + social proof — grouped with tighter gap */}
        <div className="flex flex-col items-center gap-3">

          <motion.div
            initial="hidden" animate="visible"
            variants={item(0.5)}
            style={{ willChange: 'transform' }}
          >
            <motion.button
              onClick={scrollToBook}
              whileTap={prefersReduced ? undefined : { scale: 0.96 }}
              transition={TAP_SPRING}
              className="bg-[#FAF8F5] text-[#006241] font-semibold text-base px-10 py-4 rounded-full cursor-pointer
                shadow-[0_4px_20px_rgba(0,0,0,0.2)]
                transition-[background-color,box-shadow] duration-300 ease-out
                hover:bg-white hover:shadow-[0_10px_36px_rgba(0,0,0,0.3)]
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Book Your Court →
            </motion.button>
          </motion.div>

          <motion.div
            initial="hidden" animate="visible"
            variants={item(0.56)}
            style={{ willChange: 'transform' }}
          >
            <p className="text-sm text-white/55 tracking-[0.02em]">
              <span className="text-white/80 font-medium tabular-nums">₱300 / hr</span>
              <span className="mx-2.5 text-white/20" aria-hidden="true">·</span>
              No membership required
            </p>
          </motion.div>

          <motion.div
            className="flex items-center justify-center gap-2.5"
            initial="hidden" animate="visible"
            variants={item(0.62)}
            style={{ willChange: 'transform' }}
          >
            <div className="flex -space-x-1.5" aria-hidden="true">
              {AVATAR_COLORS.map((c, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border-2 border-[#006241]"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <span className="text-white/50 text-xs">Trusted by players across Cebu</span>
          </motion.div>

        </div>

      </div>

      {/* ── Stats bar ── */}
      <motion.div
        className="relative z-10"
        initial="hidden" animate="visible"
        variants={item(0.69)}
        style={{ willChange: 'transform' }}
      >
        <div
          className="h-px mx-8"
          style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.15) 70%, transparent)' }}
          aria-hidden="true"
        />
        <div className="max-w-lg mx-auto px-5 py-6 flex items-center justify-center">
          {STATS.map(({ Icon, value, label }, i) => (
            <Fragment key={label}>
              {i > 0 && (
                <div
                  className="w-px h-10 mx-3 sm:mx-6 lg:mx-8"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                  aria-hidden="true"
                />
              )}
              <div className="text-center">
                <Icon className="w-3.5 h-3.5 text-white/50 mx-auto mb-1.5" aria-hidden="true" />
                <div className="text-white text-sm font-semibold tabular-nums">{value}</div>
                <div
                  className="text-white/50 text-[0.58rem] font-bold uppercase mt-0.5"
                  style={{ letterSpacing: '0.14em' }}
                >
                  {label}
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      </motion.div>

    </section>
  )
}
