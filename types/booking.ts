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
