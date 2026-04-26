'use client'

import { MapPin, Clock, Phone, AlertCircle, ExternalLink } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Dental+House+768+Plaridel+St+Cambaro+Mandaue+City'

const SHADOW_REST   = '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)'
const SHADOW_LIFTED = '0 20px 48px rgba(0,0,0,0.22), 0 6px 20px rgba(0,0,0,0.14)'

const LIFT_SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const

export default function Contact() {
  const prefersReduced = useReducedMotion()

  // Hover flicker fix: whileHover on outer (hover area), transform on inner child.
  // This prevents the element from drifting out from under the cursor and flickering.
  const cardInnerVariants = {
    rest: {
      y: 0,
      boxShadow: SHADOW_REST,
      transition: { ...LIFT_SPRING },
    },
    hover: {
      y: prefersReduced ? 0 : -4,
      boxShadow: prefersReduced ? SHADOW_REST : SHADOW_LIFTED,
      transition: { ...LIFT_SPRING },
    },
  }

  return (
    <section id="visitor-info" className="bg-[#006241] py-20 px-5" aria-labelledby="contact-heading">
      <div className="max-w-4xl mx-auto">

        {/* ── Section header ── */}
        <div className="text-center mb-12">
          <p className="text-[0.6rem] font-bold tracking-[0.3em] uppercase text-white/50 mb-3">
            Pickle Garden · Cebu
          </p>
          <h2
            id="contact-heading"
            className="font-serif text-3xl sm:text-4xl font-semibold text-[#FAF8F5] mb-4"
          >
            Visitor Information
          </h2>
          <p className="text-white/65 text-base leading-relaxed max-w-md mx-auto">
            Everything you need to know for your next game at the Garden.
          </p>
        </div>

        {/* ── Two-column grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

          {/* ── Left column ── */}
          <div className="flex flex-col gap-4">

            {/* Main info card — hover area on outer, lift applied to inner */}
            <motion.div
              className="flex-1 cursor-default"
              whileHover="hover"
              initial="rest"
              animate="rest"
            >
              <motion.div
                variants={cardInnerVariants}
                className="bg-white rounded-2xl p-7 h-full"
              >
                <h3 className="font-serif text-lg font-semibold text-stone-900 mb-6">
                  Court Details
                </h3>
                <div className="divide-y divide-stone-100">

                  {/* Location */}
                  <div className="flex items-start gap-4 pb-5">
                    <div className="w-10 h-10 rounded-xl bg-[#E8F3EE] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-[#006241]" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] font-semibold tracking-widest uppercase text-stone-400 mb-1">
                        Location
                      </p>
                      <a
                        href={MAPS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline text-sm font-medium text-[#006241] underline-offset-2 hover:underline hover:text-[#004d32] transition-colors duration-200 ease-out leading-snug"
                      >
                        768 Plaridel St, Cambaro<br />Mandaue City, Cebu
                        <ExternalLink className="inline w-3 h-3 ml-1 mb-0.5 opacity-50" aria-hidden="true" />
                        <span className="sr-only">(opens in new tab)</span>
                      </a>
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="flex items-start gap-4 py-5">
                    <div className="w-10 h-10 rounded-xl bg-[#E8F3EE] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="w-4 h-4 text-[#006241]" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] font-semibold tracking-widest uppercase text-stone-400 mb-1">
                        Operating Hours
                      </p>
                      <p className="text-sm font-medium text-stone-800">
                        8:00 AM – 10:00 PM, Daily
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-4 pt-5">
                    <div className="w-10 h-10 rounded-xl bg-[#E8F3EE] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Phone className="w-4 h-4 text-[#006241]" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] font-semibold tracking-widest uppercase text-stone-400 mb-1">
                        Contact
                      </p>
                      <a
                        href="tel:09218132196"
                        className="text-sm font-medium text-stone-800 hover:text-[#006241] transition-colors duration-200"
                      >
                        09218132196
                      </a>
                    </div>
                  </div>

                </div>
              </motion.div>
            </motion.div>

            {/* Cancellation policy card — same hover pattern */}
            <motion.div
              className="cursor-default"
              whileHover="hover"
              initial="rest"
              animate="rest"
            >
              <motion.div
                variants={cardInnerVariants}
                className="bg-white rounded-2xl p-5 flex items-start gap-4"
              >
                <div className="w-9 h-9 rounded-lg bg-[#E8F3EE] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-[#006241]" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[0.65rem] font-semibold tracking-widest uppercase text-[#006241]/60 mb-1">
                    Cancellation Policy
                  </p>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    Cancel at least 2 hours before your slot. No-shows forfeit their booking.
                  </p>
                </div>
              </motion.div>
            </motion.div>

          </div>

          {/* ── Right column — embedded map with lift ── */}
          <motion.div
            className="cursor-default"
            whileHover="hover"
            initial="rest"
            animate="rest"
          >
            <motion.div
              variants={cardInnerVariants}
              className="flex flex-col overflow-hidden rounded-2xl w-full min-h-[400px]"
            >
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d245.32205909221193!2d123.9478117091801!3d10.329642548161694!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33a999b4ae938641%3A0x2025f4ecd2827281!2sDental%20House!5e0!3m2!1sen!2sph!4v1777124331498!5m2!1sen!2sph"
                className="w-full h-full block flex-grow border-0"
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Pickle Garden Location"
              />
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
