import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://picklegarden.vercel.app'
  ),
  title: 'Pickle Garden — Court Booking',
  description:
    'Book a pickleball court at Pickle Garden, Mandaue City. Live availability, instant confirmation. ₱300/hour.',
  openGraph: {
    title: 'Pickle Garden — Court Booking',
    description:
      'Book a pickleball court at Pickle Garden, Mandaue City. Live availability, instant confirmation. ₱300/hour.',
    url: '/',
    siteName: 'Pickle Garden',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Pickle Garden Court Booking' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pickle Garden — Court Booking',
    description:
      'Book a pickleball court at Pickle Garden, Mandaue City. ₱300/hour.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <a
          href="#book"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[300] focus:bg-[#006241] focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold focus:text-sm focus:shadow-lg"
        >
          Skip to booking
        </a>
        {children}
      </body>
    </html>
  )
}
