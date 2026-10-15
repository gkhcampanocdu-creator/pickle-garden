import type { NextRequest } from 'next/server'
import { getAvailability } from '@/lib/booking-service'
import { supabaseStore } from '@/lib/supabase-store'
import { json, limited } from '@/lib/api'

/** Booked hours for one date. Returns hours only — never customer details. */
export async function GET(request: NextRequest) {
  const tooMany = limited(request, 'availability', 60)
  if (tooMany) return tooMany

  const result = await getAvailability(supabaseStore, request.nextUrl.searchParams.get('date'))
  if (result.ok) return json({ bookedHours: result.data })
  return json({ error: result.error === 'invalid' ? 'Invalid date.' : 'Could not load availability.' },
    result.error === 'invalid' ? 400 : 500)
}
