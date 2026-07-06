import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
  
  try {
    const authHeader = request.headers.get('authorization') || '';
    
    const res = await fetch(`${apiUrl}/analytics/geospatial`, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!res.ok) {
      return NextResponse.json({ status: 'error', message: 'Failed to fetch analytics' }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
