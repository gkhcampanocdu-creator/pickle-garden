export interface BookingFormData {
  firstName: string
  lastName: string
  phone: string
  email: string
  consent: boolean
}

export interface BookingFormErrors {
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
  consent?: string
}

export interface SummaryData {
  date: string
  time: string
  duration: string
  price: string
  name: string
  phone: string
}

export interface BookingPayload {
  guestName: string
  phone: string
  email: string
  date: string           // YYYY-MM-DD
  selectedHours: number[] // individual hour slots chosen by the user
  totalPrice: number
  gcashRef: string
}

export interface PendingBookingEntry {
  bookingDate: string    // YYYY-MM-DD
  selectedHours: number[]
  totalPrice: number
  guestName: string
  phone: string
  email: string
  gcashRef: string
  savedAt: number        // Date.now() timestamp
}

export interface AdminBooking {
  id: string
  guest_name: string
  phone: string
  email: string
  booking_date: string  // YYYY-MM-DD
  start_hour: number
  duration: number
  total_price: number
  gcash_ref: string
  is_paid: boolean
  status: string
  created_at: string
}
