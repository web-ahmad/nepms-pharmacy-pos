import { NextResponse } from 'next/server'
import { validateAdminAccess } from '@/utils/auth-helpers'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const auth = await validateAdminAccess()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  
  const type = (await params).type
  const { searchParams } = new URL(request.url)
  const branch_id = searchParams.get('branch_id')
  const period = searchParams.get('period') || 'daily'

  if (!branch_id) {
    return NextResponse.json({ error: 'branch_id is required' }, { status: 400 })
  }

  try {
    // Proxy to the Python FastAPI backend to enforce pre-built template reports
    const fastApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const res = await fetch(`${fastApiUrl}/api/v1/audit/reports/${type}?branch_id=${branch_id}&period=${period}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: 'Failed to fetch report from backend', details: errorData },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}
