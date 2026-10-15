import type { NextRequest } from 'next/server'
import { lookupBooking } from '@/lib/booking-service'
import { supabaseStore } from '@/lib/supabase-store'
import { json, limited } from '@/lib/api'

const MESSAGES = {
  invalid: ['Invalid reference format. Expected format: #PB followed by 6 characters.', 400],
  not_found: ['No booking found with that reference.', 404],
  error: ['Lookup failed. Please try again.', 500],
} as const

export async function GET(request: NextRequest) {
  const tooMany = limited(request, 'lookup', 20)
  if (tooMany) return tooMany

  const result = await lookupBooking(supabaseStore, request.nextUrl.searchParams.get('ref') ?? '')
  if (result.ok) return json(result.data)
  const [error, status] = MESSAGES[result.error]
  return json({ error }, status)
}
