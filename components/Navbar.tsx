'use client'

import { useState, useEffect } from 'react'
import { Menu, X, Leaf } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Courts',      href: '#book' },
  { label: 'Pricing',     href: '#book' },
  { label: 'Information', href: '#visitor-info' },
]

function scrollTo(href: string) {
  const el = document.querySelector(href)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

interface NavLinkProps {
  label: string
  href: string
  onClick?: () => void
}

function NavLink({ label, href, onClick }: NavLinkProps) {
  return (
    <button
      onClick={() => { onClick?.(); scrollTo(href) }}
      className="relative group text-base font-medium text-white/75 hover:text-white transition-colors duration-200 ease-out cursor-pointer py-1 px-1 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 rounded"
    >
      {label}
      {/* Underline: scales outward from center on hover */}
      <span
        className="absolute bottom-0 left-0 h-[1.5px] w-full bg-white rounded-full
          scale-x-0 group-hover:scale-x-100
          transition-transform duration-300 ease-out origin-center"
        aria-hidden="true"
      />
    </button>
  )
}

export default function Navbar() {
  const [open, setOpen]         = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleBookNow() {
    setOpen(false)
    scrollTo('#book')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50">

      {/* ── Main bar ── */}
      <nav
        className={[
          'transition-[background-color,border-color,box-shadow] duration-300 ease-out',
          scrolled
            ? 'bg-[#004d32]/92 backdrop-blur-[14px] border-b border-white/10 shadow-[0_2px_24px_rgba(0,0,0,0.28)]'
            : 'bg-[#006241] border-b border-[#006241]',
        ].join(' ')}
        aria-label="Main navigation"
      >
        <div
          className={[
            'max-w-[1100px] mx-auto px-6 flex items-center justify-between gap-8',
            'transition-[height] duration-300 ease-out',
            scrolled ? 'h-20' : 'h-24',
          ].join(' ')}
        >

          {/* ── Logo ── */}
          <a
            href="#"
            onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            className="inline-flex items-center gap-2 font-serif text-2xl font-semibold text-[#FAF8F5] tracking-tight leading-none flex-shrink-0 cursor-pointer
              transition-all duration-200 ease-out
              hover:scale-[1.04] hover:text-white
              focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 rounded"
            aria-label="Pickle Garden — go to top"
          >
            <Leaf className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            Pickle Garden
          </a>

          {/* ── Desktop nav links — centered ── */}
          <div className="hidden md:flex items-center gap-10 flex-1 justify-center">
            {NAV_LINKS.map(link => (
              <NavLink key={link.label} label={link.label} href={link.href} />
            ))}
          </div>

          {/* ── Desktop CTA — off-white on dark, matching Hero button ── */}
          <button
            onClick={handleBookNow}
            className="hidden md:inline-flex items-center gap-2 bg-[#FAF8F5] text-[#006241] text-base font-semibold px-6 py-3 rounded-xl flex-shrink-0 cursor-pointer
              shadow-[0_3px_12px_rgba(0,0,0,0.18)]
              transition-all duration-300 ease-out
              hover:bg-white hover:scale-105 hover:shadow-[0_8px_28px_rgba(0,0,0,0.28)]
              active:scale-[1.01] active:shadow-[0_3px_12px_rgba(0,0,0,0.15)]
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Book Now
          </button>

          {/* ── Mobile hamburger ── */}
          <button
            onClick={() => setOpen(v => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl text-white/80
              hover:bg-white/10 hover:text-white
              transition-colors duration-150 cursor-pointer
              focus-visible:outline-2 focus-visible:outline-white"
          >
            <span
              className={[
                'transition-transform duration-200 ease-out',
                open ? 'rotate-90 scale-90' : 'rotate-0 scale-100',
              ].join(' ')}
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </span>
          </button>

        </div>
      </nav>

      {/* ── Mobile dropdown ── */}
      {open && (
        <div
          id="mobile-menu"
          role="navigation"
          aria-label="Mobile navigation"
          className="md:hidden bg-[#004d32]/96 backdrop-blur-[14px] border-b border-white/10 shadow-lg animate-fade-up"
        >
          <div className="max-w-[1100px] mx-auto px-5 py-4 flex flex-col gap-1">
            {NAV_LINKS.map(link => (
              <button
                key={link.label}
                onClick={() => { setOpen(false); scrollTo(link.href) }}
                className="text-left text-sm font-medium text-white/75 hover:text-white
                  px-3 py-3 rounded-xl hover:bg-white/8
                  transition-colors duration-150 cursor-pointer
                  focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={handleBookNow}
              className="mt-2 w-full bg-[#FAF8F5] hover:bg-white text-[#006241] font-semibold text-sm rounded-xl py-3.5
                transition-colors duration-200 cursor-pointer
                focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            >
              Book Now →
            </button>
          </div>
        </div>
      )}

    </header>
  )
}
