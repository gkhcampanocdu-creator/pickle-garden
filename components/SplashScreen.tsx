'use client'

import { useEffect, useState } from 'react'
import { Leaf } from 'lucide-react'

export default function SplashScreen() {
  const [logoVisible, setLogoVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('pg_splash_shown')) {
      setDone(true)
      return
    }
    sessionStorage.setItem('pg_splash_shown', '1')

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      const t = setTimeout(() => setDone(true), 400)
      return () => clearTimeout(t)
    }

    const raf = requestAnimationFrame(() => setLogoVisible(true))

    function beginExit() {
      setExiting(true)
      setTimeout(() => setDone(true), 800)
    }

    // Wait for both the minimum display time (2s) AND the page to be fully loaded.
    // If the page loads in <2s the timer controls; if it takes longer, we wait for load.
    const minTimer = setTimeout(() => {
      if (document.readyState === 'complete') {
        beginExit()
      } else {
        window.addEventListener('load', beginExit, { once: true })
      }
    }, 2000)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(minTimer)
      window.removeEventListener('load', beginExit)
    }
  }, [])

  if (done) return null

  return (
    <div
      role="status"
      aria-label="Loading Pickle Garden"
      className={[
        'fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#FAF8F5]',
        'transition-[transform,opacity] duration-[800ms]',
        exiting ? '-translate-y-full opacity-0 ease-in' : 'translate-y-0 opacity-100 ease-out',
      ].join(' ')}
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Concentric rings — ties to Hero visual language */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
      >
        <svg width="400" height="400" viewBox="0 0 400 400" fill="none" className="opacity-50">
          <circle cx="200" cy="200" r="197" stroke="rgba(0,98,65,0.06)" strokeWidth="1"/>
          <circle cx="200" cy="200" r="174" stroke="rgba(0,98,65,0.04)" strokeWidth="0.75" strokeDasharray="4 9"/>
          <circle cx="200" cy="200" r="151" stroke="rgba(0,98,65,0.05)" strokeWidth="1"/>
        </svg>
      </div>

      {/* Logo mark */}
      <div
        className={[
          'relative flex flex-col items-center gap-3',
          'transition-[opacity,transform] duration-[1000ms] ease-out',
          logoVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.93]',
        ].join(' ')}
        style={{ willChange: 'transform, opacity' }}
      >
        <div className="flex items-center gap-2.5">
          <Leaf className="w-6 h-6 text-[#006241]" aria-hidden="true" />
          <span className="font-serif text-[2.4rem] font-semibold text-[#006241] tracking-tight leading-none">
            Pickle Garden
          </span>
        </div>
        <p className="text-[0.6rem] font-bold tracking-[0.3em] uppercase text-[#006241]/35">
          Mandaue City · Cebu
        </p>
      </div>
    </div>
  )
}
