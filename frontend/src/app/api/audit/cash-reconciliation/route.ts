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
  const start_date = searchParams.get('start_date')
  const end_date = searchParams.get('end_date')

  let query = auth.supabase!.from('cash_reconciliation').select('*')

  if (branch_id) query = query.eq('branch_id', branch_id)
  if (start_date) query = query.gte('shift_date', start_date)
  if (end_date) query = query.lte('shift_date', end_date)

  query = query.order('shift_date', { ascending: false }).limit(100)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
