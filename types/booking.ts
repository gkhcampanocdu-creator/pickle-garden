export interface BookingFormData {
  firstName: string
  lastName: string
  phone: string
  email: string
}

export interface BookingFormErrors {
  firstName?: string
  lastName?: string
  phone?: string
}

export interface SummaryData {
  date: string
  time: string
  duration: string
  price: string
  name: string
  phone: string
}
