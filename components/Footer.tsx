'use client'

import { Leaf, Phone, Clock, MapPin } from 'lucide-react'

function scrollToBook() {
  if (typeof document === 'undefined') return
  const el = document.querySelector('#book')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function Footer() {
  return (
    <footer className="bg-[#006241] border-t border-white/10">
      <div className="max-w-4xl mx-auto px-6 py-10">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Leaf className="w-4 h-4 text-[#FAF8F5]/80 flex-shrink-0" aria-hidden="true" />
              <span className="font-serif text-sm font-semibold text-[#FAF8F5]/90 tracking-tight">
                Pickle Garden
              </span>
            </div>
            <p className="text-white/50 text-xs leading-relaxed">
              Premium pickleball courts in Mandaue City, Cebu. Book online in seconds.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p className="text-[0.6rem] font-bold tracking-[0.22em] uppercase text-white/40 mb-3">
              Quick Links
            </p>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={scrollToBook}
                  className="text-white/65 hover:text-white text-xs transition-colors duration-150 cursor-pointer"
                >
                  Book a Court
                </button>
              </li>
              <li>
                <button
                  onClick={scrollToBook}
                  className="text-white/65 hover:text-white text-xs transition-colors duration-150 cursor-pointer"
                >
                  Manage Booking
                </button>
              </li>
              <li>
                <a
                  href="#visitor-info"
                  onClick={e => {
                    e.preventDefault()
                    document.querySelector('#visitor-info')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className="text-white/65 hover:text-white text-xs transition-colors duration-150"
                >
                  Visitor Info
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[0.6rem] font-bold tracking-[0.22em] uppercase text-white/40 mb-3">
              Contact
            </p>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2">
                <Phone className="w-3 h-3 text-white/40 flex-shrink-0" aria-hidden="true" />
                <a href="tel:09218132196" className="text-white/65 hover:text-white text-xs transition-colors duration-150">
                  09218132196
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-white/40 flex-shrink-0" aria-hidden="true" />
                <span className="text-white/65 text-xs">8:00 AM – 10:00 PM Daily</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3 h-3 text-white/40 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-white/65 text-xs leading-snug">768 Plaridel St, Cambaro<br />Mandaue City, Cebu</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-white/10 pt-6">
          <p className="text-white/35 text-xs text-center">
            © {new Date().getFullYear()} Pickle Garden. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  )
}
