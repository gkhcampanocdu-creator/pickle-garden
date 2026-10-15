import { describe, it, expect } from 'vitest'
import {
  courtNow, normalizePhone, priceFor, splitPrice, occupiedHours, validateContact, validateBooking,
  isValidDateStr, addDays, bookingRef, refPrefix, humanDate, h12,
  type BookingInput,
} from './booking-rules'

const NOW = { dateStr: '2026-10-17', hour: 10 }

const valid: BookingInput = {
  firstName: 'Maria',
  lastName: 'Santos',
  phone: '09171234567',
  email: '',
  date: '2026-10-18',
  hours: [10, 14],
  gcashRef: '1234567890123',
}

describe('courtNow', () => {
  it('uses Manila time, not the device clock', () => {
    expect(courtNow(new Date('2026-10-16T16:30:00Z'))).toEqual({ dateStr: '2026-10-17', hour: 0 })
    expect(courtNow(new Date('2026-10-16T07:05:00Z'))).toEqual({ dateStr: '2026-10-16', hour: 15 })
  })
})

describe('normalizePhone', () => {
  it('converts +63 numbers and trims', () => {
    expect(normalizePhone(' +639171234567 ')).toBe('09171234567')
    expect(normalizePhone('09171234567')).toBe('09171234567')
  })
})

describe('pricing', () => {
  it('charges 300 per hour with 4 hours for 1000', () => {
    expect([1, 2, 3, 4].map(priceFor)).toEqual([300, 600, 900, 1000])
  })

  it('splits a total across rows so the parts add up exactly', () => {
    expect(splitPrice(1000, 4)).toEqual([250, 250, 250, 250])
    expect(splitPrice(900, 3)).toEqual([300, 300, 300])
    expect(splitPrice(1000, 3).reduce((a, b) => a + b, 0)).toBe(1000)
  })
})

describe('occupiedHours', () => {
  it('expands rows into every hour they cover', () => {
    expect(occupiedHours([{ start_hour: 10, duration: 2 }, { start_hour: 15, duration: 1 }])).toEqual([10, 11, 15])
  })
})

describe('validateContact', () => {
  it('accepts valid details, including a +63 phone', () => {
    expect(validateContact({ ...valid, phone: '+639171234567' })).toEqual({})
  })

  it('requires names and caps their length', () => {
    expect(validateContact({ ...valid, firstName: ' ' }).firstName).toBeDefined()
    expect(validateContact({ ...valid, lastName: 'a'.repeat(61) }).lastName).toBeDefined()
  })

  it('rejects bad phones and emails', () => {
    expect(validateContact({ ...valid, phone: '9171234567' }).phone).toBeDefined()
    expect(validateContact({ ...valid, email: 'maria@' }).email).toBeDefined()
    expect(validateContact({ ...valid, email: 'maria@mail.example.com.ph' }).email).toBeUndefined()
  })

  it('rejects a huge pathological email quickly', () => {
    const start = performance.now()
    expect(validateContact({ ...valid, email: 'a@' + 'a.'.repeat(50_000) + '@' }).email).toBeDefined()
    expect(performance.now() - start).toBeLessThan(100)
  })
})

describe('validateBooking', () => {
  it('accepts a valid booking with non-contiguous hours', () => {
    expect(validateBooking(valid, NOW)).toEqual({})
  })

  it('rejects an empty, oversized, duplicated or fractional hour list', () => {
    expect(validateBooking({ ...valid, hours: [] }, NOW).time).toBeDefined()
    expect(validateBooking({ ...valid, hours: [8, 9, 10, 11, 12] }, NOW).time).toBeDefined()
    expect(validateBooking({ ...valid, hours: [10, 10] }, NOW).time).toBeDefined()
    expect(validateBooking({ ...valid, hours: [10.5] }, NOW).time).toBeDefined()
  })

  it('only allows start hours from 8 AM to 8 PM', () => {
    expect(validateBooking({ ...valid, hours: [7] }, NOW).time).toBeDefined()
    expect(validateBooking({ ...valid, hours: [21] }, NOW).time).toBeDefined()
    expect(validateBooking({ ...valid, hours: [8, 20] }, NOW)).toEqual({})
  })

  it('rejects hours that have started on the court\'s today', () => {
    expect(validateBooking({ ...valid, date: '2026-10-17', hours: [10] }, NOW).time).toBeDefined()
    expect(validateBooking({ ...valid, date: '2026-10-17', hours: [11, 9] }, NOW).time).toBeDefined()
    expect(validateBooking({ ...valid, date: '2026-10-17', hours: [11] }, NOW)).toEqual({})
  })

  it('rejects past, malformed and more-than-60-days-ahead dates', () => {
    expect(validateBooking({ ...valid, date: '2026-10-16' }, NOW).date).toBeDefined()
    expect(validateBooking({ ...valid, date: '2026-02-30' }, NOW).date).toBeDefined()
    expect(validateBooking({ ...valid, date: addDays(NOW.dateStr, 61) }, NOW).date).toBeDefined()
    expect(validateBooking({ ...valid, date: addDays(NOW.dateStr, 60) }, NOW)).toEqual({})
  })

  it('rejects a GCash ref that is not 13 digits', () => {
    expect(validateBooking({ ...valid, gcashRef: '123' }, NOW).gcashRef).toBeDefined()
  })
})

describe('helpers', () => {
  it('validates calendar dates and adds days across month ends', () => {
    expect(isValidDateStr('2026-02-28')).toBe(true)
    expect(isValidDateStr('2026-2-1')).toBe(false)
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('keeps the existing #PB + 6 hex reference format', () => {
    expect(bookingRef('a1b2c3d4-0000-0000-0000-000000000000')).toBe('#PBA1B2C3')
    expect(refPrefix('#pba1b2c3')).toBe('a1b2c3')
    expect(refPrefix('A1B2C3')).toBe('a1b2c3')
    expect(refPrefix('#PB12')).toBeNull()
    expect(refPrefix('#PBZZZZZZ')).toBeNull()
  })

  it('formats dates and hours', () => {
    expect(humanDate('2026-10-17')).toBe('Oct 17, 2026')
    expect(h12(20)).toBe('8:00 PM')
  })
})
