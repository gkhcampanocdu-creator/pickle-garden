import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * Server-only Supabase client using the service-role key. It bypasses RLS, so every
 * caller must validate input and check authorization itself. There is deliberately
 * no fallback to the public anon key: a missing key is a configuration error.
 */
export function getServiceClient() {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  return client
}
