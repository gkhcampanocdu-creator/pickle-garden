import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-admin-token')
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let id: string, isPaid: boolean
  try {
    ;({ id, isPaid } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!id || typeof isPaid !== 'boolean') {
    return NextResponse.json({ error: 'Missing id or isPaid' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('bookings')
    .update({ is_paid: isPaid })
    .eq('id', id)

  if (error) {
    console.error('[admin-api] update-payment error:', error.message, error.code, error.details)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
