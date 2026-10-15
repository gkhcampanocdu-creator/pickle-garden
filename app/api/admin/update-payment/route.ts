import { adminSetPaid } from '@/lib/booking-service'
import { supabaseStore } from '@/lib/supabase-store'
import { isAdmin } from '@/lib/admin-session'
import { json, readJson } from '@/lib/api'

const STATUS = { unauthorized: 401, invalid: 400, not_found: 404, error: 500 } as const

export async function POST(request: Request) {
  const body = (await readJson(request)) as { id?: unknown; isPaid?: unknown } | null
  const result = await adminSetPaid(supabaseStore, isAdmin, body?.id, body?.isPaid)
  return result.ok ? json({ ok: true }) : json({ error: result.error }, STATUS[result.error])
}
