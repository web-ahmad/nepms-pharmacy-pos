import { NextResponse } from 'next/server'
import { validateAdminAccess } from '@/utils/auth-helpers'

export async function GET(request: Request) {
  const auth = await validateAdminAccess()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  if ((auth as any).isDevFallback) return NextResponse.json([])

  const { searchParams } = new URL(request.url)
  const branch_id = searchParams.get('branch_id')
  const staff_id = searchParams.get('staff_id')
  const event_type = searchParams.get('event_type')
  const start_date = searchParams.get('start_date')
  const end_date = searchParams.get('end_date')

  let query = auth.supabase!.from('audit_events').select('*')

  if (branch_id) query = query.eq('branch_id', branch_id)
  if (staff_id) query = query.eq('staff_id', staff_id)
  if (event_type) query = query.eq('event_type', event_type)
  if (start_date) query = query.gte('created_at', start_date)
  if (end_date) query = query.lte('created_at', end_date)

  query = query.order('created_at', { ascending: false }).limit(100)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
