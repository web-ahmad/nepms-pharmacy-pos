/**
 * Where each staff role belongs when they open the app.
 *
 * Used in two places so the result is the same however the user arrives:
 *   1. right after login (app/login/page.tsx)
 *   2. when landing on "/" with a persisted session (app/(dashboard)/page.tsx)
 *
 * Only applies to branch staff (hierarchy_level >= 4). Owners and branch heads
 * (L1–L3) always get the full dashboard.
 */
export const ROLE_HOME: Record<string, string> = {
  Cashier: '/cashier',
  Salesman: '/pos',
  Pharmacist: '/pos',
  Accountant: '/accounts',
  HR: '/hr',
};

export function resolveRoleHome(user?: {
  role?: string | null;
  hierarchy_level?: number | null;
  is_super_admin?: boolean | null;
} | null): string | undefined {
  if (!user) return undefined;
  if (user.is_super_admin) return '/super-admin';
  const level = user.hierarchy_level ?? 4;
  if (level < 4) return undefined;          // L1–L3 keep the full dashboard
  return (user.role && ROLE_HOME[user.role]) || undefined;
}
