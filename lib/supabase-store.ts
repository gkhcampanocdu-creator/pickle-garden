import 'server-only'
import { getServiceClient } from './supabase-server'
import type { BookingStore, BookingRow } from './booking-service'

const COLUMNS =
  'id, guest_name, phone, email, booking_date, start_hour, duration, total_price, gcash_ref, is_paid, status, created_at'
const NOT_CANCELLED = 'status.is.null,status.neq.cancelled'

const bookings = () => getServiceClient().from('bookings')

/** Supabase-backed store. The client is created lazily so config errors surface as handled failures. */
export const supabaseStore: BookingStore = {
  async bookedSlots(date) {
    const { data, error } = await bookings()
      .select('start_hour, duration')
      .eq('booking_date', date)
      .or(NOT_CANCELLED)
    if (error) throw error
    return data ?? []
  },

  async createGroup(args) {
    const { data, error } = await getServiceClient().rpc('create_booking_group', {
      p_guest_name: args.guest_name,
      p_phone: args.phone,
      p_email: args.email,
      p_booking_date: args.booking_date,
      p_hours: args.hours,
      p_prices: args.prices,
      p_gcash_ref: args.gcash_ref,
    })
    if (error) {
      const message = error.message ?? ''
      if (message.includes('SLOT_CONFLICT') || error.code === '23P01') return { error: 'conflict' }
      if (message.includes('DUPLICATE_REF')) return { error: 'duplicate_ref' }
      throw new Error(`create_booking_group failed: ${error.code}`)
    }
    return { ids: data as string[] }
  },

  async findByPrefix(prefix) {
    // The reference is the first 6 hex chars of a UUID; bound the id range instead of LIKE on uuid
    const { data, error } = await bookings()
      .select(COLUMNS)
      .gte('id', `${prefix}00-0000-0000-0000-000000000000`)
      .lte('id', `${prefix}ff-ffff-ffff-ffff-ffffffffffff`)
      .or(NOT_CANCELLED)
      .limit(5)
    if (error) throw error
    return (data ?? []) as BookingRow[]
  },

  async groupOf(row) {
    const { data, error } = await bookings()
      .select(COLUMNS)
      .eq('gcash_ref', row.gcash_ref)
      .eq('booking_date', row.booking_date)
      .eq('phone', row.phone)
      .or(NOT_CANCELLED)
    if (error) throw error
    return (data ?? []) as BookingRow[]
  },

  async cancelRows(ids) {
    const { data, error } = await bookings()
      .update({ status: 'cancelled' })
      .in('id', ids)
      .or(NOT_CANCELLED)
      .select('id')
    if (error) throw error
    return data?.length ?? 0
  },

  async listFrom(date) {
    const { data, error } = await bookings()
      .select(COLUMNS)
      .gte('booking_date', date)
      .or(NOT_CANCELLED)
      .order('booking_date', { ascending: true })
      .order('start_hour', { ascending: true })
    if (error) throw error
    return (data ?? []) as BookingRow[]
  },

  async setPaid(id, paid) {
    const { data, error } = await bookings()
      .update({ is_paid: paid })
      .eq('id', id)
      .or(NOT_CANCELLED)
      .select('id')
    if (error) throw error
    return data?.length ?? 0
  },
}
