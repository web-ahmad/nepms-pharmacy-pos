/**
 * auth-store.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 6 — Enterprise RBAC Unification
 *
 * Adds hierarchy_level, role_id, and permissions_version to the auth state.
 *
 * Hierarchy Levels:
 *   1 = Super Admin     (SaaS only)
 *   2 = Pharmacy Owner  (all branches in tenant)
 *   3 = Branch Owner    (own branch only)
 *   4 = Branch Staff    (permission-driven, own branch)
 *
 * Permission Checks — use these helpers everywhere:
 *   hasPermission("sales:create")    — checks specific permission
 *   isSuperAdmin()                   — level 1 check
 *   isPharmacyOwner()                — level 2 check (wildcard access)
 *   isBranchOwner()                  — level 3 check
 *   canAccessBranch(branchId)        — branch scope enforcement
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  username: string;
  full_name?: string;
  email?: string;
  role: string;
  role_id?: string;
  /**
   * hierarchy_level is the CANONICAL access control field.
   * 1=SuperAdmin  2=PharmacyOwner  3=BranchOwner  4=Staff
   * NEVER use role.name for access decisions.
   */
  hierarchy_level: number;
  permissions: string[];
  permissions_version?: string;
  is_super_admin?: boolean;
  assigned_branches?: { id: string; name: string }[];
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  tenantId: string | null;
  branchId: string | null;
  isAuthenticated: boolean;

  // ── Setters ──────────────────────────────────────────────────────────────
  setAuth: (token: string, user: AuthUser, tenantId: string, branchId: string) => void;
  setBranch: (branchId: string) => void;
  logout: () => void;

  // ── Permission helpers ────────────────────────────────────────────────────
  /**
   * Check if user has a specific permission code.
   * Examples:
   *   hasPermission("sales:create")
   *   hasPermission("inventory:adjust")
   */
  hasPermission: (code: string) => boolean;

  /**
   * Check if user has ANY of the given permissions.
   */
  hasAnyPermission: (...codes: string[]) => boolean;

  /**
   * Check if user has ALL of the given permissions.
   */
  hasAllPermissions: (...codes: string[]) => boolean;

  // ── Hierarchy helpers ────────────────────────────────────────────────────
  /** Level 1: SaaS Super Admin. No pharmacy data access. */
  isSuperAdmin: () => boolean;
  /** Level 2: Pharmacy Owner. Sees all branches. */
  isPharmacyOwner: () => boolean;
  /** Level 3: Branch Owner. Sees only own branch. */
  isBranchOwner: () => boolean;
  /** Level 4: Branch Staff. Permission-driven. */
  isBranchStaff: () => boolean;
  /** True if user is at or above the given level. */
  isAtLeastLevel: (level: number) => boolean;

  // ── Branch scope ─────────────────────────────────────────────────────────
  /**
   * Returns true if the user can see data from the given branch.
   * L1: no (SaaS only)
   * L2: yes (all branches)
   * L3/L4: only if branchId matches
   */
  canAccessBranch: (targetBranchId: string) => boolean;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      tenantId: null,
      branchId: null,
      isAuthenticated: false,

      // ── Setters ────────────────────────────────────────────────────────────

      setAuth: (token, user, tenantId, branchId) => {
        const resolvedBranchId =
          branchId ||
          (user?.assigned_branches?.length ? user.assigned_branches[0].id : null);
        set({
          accessToken: token,
          user,
          tenantId,
          branchId: resolvedBranchId,
          isAuthenticated: true,
        });
      },

      setBranch: (branchId) => set({ branchId }),

      logout: () =>
        set({
          accessToken: null,
          user: null,
          tenantId: null,
          branchId: null,
          isAuthenticated: false,
        }),

      // ── Permission helpers ─────────────────────────────────────────────────

      hasPermission: (code: string) => {
        const { user } = get();
        if (!user) return false;
        if (user.is_super_admin && user.hierarchy_level === 1) {
          // Super Admin can only check system:* permissions
          return code.startsWith('system:');
        }
        if (user.permissions.includes('*')) return true;
        return user.permissions.includes(code);
      },

      hasAnyPermission: (...codes: string[]) => {
        const { hasPermission } = get();
        return codes.some((c) => hasPermission(c));
      },

      hasAllPermissions: (...codes: string[]) => {
        const { hasPermission } = get();
        return codes.every((c) => hasPermission(c));
      },

      // ── Hierarchy helpers ──────────────────────────────────────────────────

      isSuperAdmin: () => {
        const { user } = get();
        return user?.hierarchy_level === 1 || user?.is_super_admin === true;
      },

      isPharmacyOwner: () => {
        const { user } = get();
        return user?.hierarchy_level === 2;
      },

      isBranchOwner: () => {
        const { user } = get();
        return user?.hierarchy_level === 3;
      },

      isBranchStaff: () => {
        const { user } = get();
        return user?.hierarchy_level === 4;
      },

      isAtLeastLevel: (level: number) => {
        const { user } = get();
        if (!user) return false;
        // Lower level number = higher privilege
        return user.hierarchy_level <= level;
      },

      // ── Branch scope ───────────────────────────────────────────────────────

      canAccessBranch: (targetBranchId: string) => {
        const { user, branchId } = get();
        if (!user) return false;
        if (user.hierarchy_level === 1) return false; // Super Admin: SaaS only
        if (user.hierarchy_level === 2) return true;  // Pharmacy Owner: all branches
        // L3/L4: only own branch
        return branchId === targetBranchId;
      },
    }),
    {
      name: 'nepms-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user:        state.user,
        tenantId:    state.tenantId,
        branchId:    state.branchId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ── Convenience selector hooks ────────────────────────────────────────────────

/** Returns true if user has the given permission. Use in components: */
export const usePermission = (code: string) =>
  useAuthStore((s) => s.hasPermission(code));

/** Returns true if user is at hierarchy level 1 (Super Admin). */
export const useIsSuperAdmin = () =>
  useAuthStore((s) => s.isSuperAdmin());

/** Returns true if user is at hierarchy level 2 (Pharmacy Owner). */
export const useIsPharmacyOwner = () =>
  useAuthStore((s) => s.isPharmacyOwner());

/** Returns true if user is at hierarchy level 3 (Branch Owner). */
export const useIsBranchOwner = () =>
  useAuthStore((s) => s.isBranchOwner());

/** Current hierarchy_level (1-4). */
export const useHierarchyLevel = () =>
  useAuthStore((s) => s.user?.hierarchy_level ?? 4);
