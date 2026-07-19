import { createClient } from './supabase/server'

export async function validateAdminAccess() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('placeholder')) {
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

    // LEGACY NOTE: This function uses Supabase to check staff_roles table.
    // In RBAC 4.0, access should be controlled via hierarchy_level from the
    // JWT token (hierarchy_level <= 2 means admin access). This Supabase check
    // remains for server-side API routes that predate the JWT migration.
    const role = roleData.role?.toLowerCase() || '';
    // hierarchy_level <= 2: L1 (Super Admin) and L2 (Pharmacy Owner/Admin)
    if (role !== 'owner' && role !== 'admin' && role !== 'super admin' && role !== 'pharmacy owner' && role !== 'branch owner') {
      return { authorized: false, error: 'Forbidden: Requires admin privileges', status: 403 }
    }

    return { authorized: true, user, supabase, status: 200 }
  } catch (e: any) {
    console.error("validateAdminAccess error:", e.message)
    return { authorized: false, error: 'Internal Server Error: Supabase connection failed. Check your env variables.', status: 500 }
  }
}

/**
 * validateSuperAdminAccess
 * ─────────────────────────
 * Checks that the authenticated user exists in the super_admins table.
 * Used to guard /super-admin/* server-side API routes.
 * Mirrors the same pattern as validateAdminAccess() above.
 */
export async function validateSuperAdminAccess() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('placeholder')) {
      // Dev fallback — skip Supabase check in local dev
      return { authorized: true, user: { id: 'dev-super-admin' }, supabase: null, status: 200, isDevFallback: true }
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { authorized: false, error: 'Unauthorized', status: 401 }
    }

    // Check the super_admins table (not staff_roles)
    const { data: saData, error: saError } = await supabase
      .from('super_admins')
      .select('id, is_active')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single()

    if (saError || !saData) {
      return { authorized: false, error: 'Forbidden: Super admin access required', status: 403 }
    }

    return { authorized: true, user, supabase, status: 200 }
  } catch (e: any) {
    console.error("validateSuperAdminAccess error:", e.message)
    return { authorized: false, error: 'Internal Server Error', status: 500 }
  }
}
