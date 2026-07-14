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
  const flag_type = searchParams.get('flag_type')

  let query = auth.supabase!.from('inventory_audit_flags').select('*')

  if (branch_id) query = query.eq('branch_id', branch_id)
  if (flag_type) query = query.eq('flag_type', flag_type)

  query = query.order('created_at', { ascending: false }).limit(100)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
