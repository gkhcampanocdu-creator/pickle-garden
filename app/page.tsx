'use client'

import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import BookingFlow from '@/components/BookingFlow'
import Contact from '@/components/Contact'
import Footer from '@/components/Footer'
import SplashScreen from '@/components/SplashScreen'

export default function Home() {
  return (
    <>
      <SplashScreen />
      <Navbar />
      <Hero />
      <section id="book" className="scroll-mt-20">
        <BookingFlow />
      </section>
      <Contact />
      <Footer />
    </>
  )
}
