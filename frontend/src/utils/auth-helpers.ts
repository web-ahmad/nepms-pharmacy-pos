import { createClient } from './supabase/server'

export async function validateAdminAccess() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'http://127.0.0.1:54321') {
      // Fallback for local development if Supabase isn't properly configured or is using the placeholder
      return { authorized: true, user: { id: 'dev-user' }, supabase: null, status: 200, isDevFallback: true }
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { authorized: false, error: 'Unauthorized', status: 401 }
    }

    // Check if staff has admin or owner role
    const { data: roleData, error: roleError } = await supabase
      .from('staff_roles')
      .select('role')
      .eq('staff_id', user.id)
      .single()

    if (roleError || !roleData) {
      return { authorized: false, error: 'Forbidden', status: 403 }
    }

    const role = roleData.role?.toLowerCase() || '';
    if (role !== 'owner' && role !== 'admin' && role !== 'super admin') {
      return { authorized: false, error: 'Forbidden: Requires admin privileges', status: 403 }
    }

    return { authorized: true, user, supabase, status: 200 }
  } catch (e: any) {
    console.error("validateAdminAccess error:", e.message)
    return { authorized: false, error: 'Internal Server Error: Supabase connection failed. Check your env variables.', status: 500 }
  }
}
