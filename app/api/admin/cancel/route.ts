import { adminCancel } from '@/lib/booking-service'
import { supabaseStore } from '@/lib/supabase-store'
import { isAdmin } from '@/lib/admin-session'
import { json, readJson } from '@/lib/api'

const STATUS = { unauthorized: 401, invalid: 400, not_found: 404, error: 500 } as const

/** Soft-cancels one booking row (status = 'cancelled'). */
export async function POST(request: Request) {
  const body = (await readJson(request)) as { id?: unknown } | null
  const result = await adminCancel(supabaseStore, isAdmin, body?.id)
  return result.ok ? json({ ok: true }) : json({ error: result.error }, STATUS[result.error])
}
