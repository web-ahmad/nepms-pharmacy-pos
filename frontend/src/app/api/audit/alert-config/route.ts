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

  let query = auth.supabase!.from('alert_config').select('*')
  
  if (branch_id) {
    query = query.eq('branch_id', branch_id)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const auth = await validateAdminAccess()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  if ((auth as any).isDevFallback) return NextResponse.json({ error: 'Supabase dev fallback active - cannot patch' }, { status: 400 })

  try {
    const body = await request.json()
    const { id, is_enabled, threshold_value, schedule_hour, schedule_day_of_week } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const updatePayload: Record<string, any> = {}
    if (is_enabled !== undefined) updatePayload.is_enabled = is_enabled
    if (threshold_value !== undefined) updatePayload.threshold_value = threshold_value
    if (schedule_hour !== undefined) updatePayload.schedule_hour = schedule_hour
    if (schedule_day_of_week !== undefined) updatePayload.schedule_day_of_week = schedule_day_of_week

    const { data, error } = await auth.supabase!
      .from('alert_config')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: 'Invalid request body', details: error.message }, { status: 400 })
  }
}
