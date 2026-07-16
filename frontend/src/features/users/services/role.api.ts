// features/users/services/role.api.ts
// TanStack Query hooks for Enterprise Role & Permission Management API.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type {
  Role,
  RoleListItem,
  RoleListResponse,
  RoleCreate,
  RoleUpdate,
  PermissionGrouped,
} from '../types/user';

const BASE_ROLES = '/api/v1/enterprise/roles';

// ── Query keys ────────────────────────────────────────────────────────────────

export const roleKeys = {
  all:         ['enterprise-roles'] as const,
  lists:       () => [...roleKeys.all, 'list'] as const,
  details:     () => [...roleKeys.all, 'detail'] as const,
  detail:      (id: string) => [...roleKeys.details(), id] as const,
  permissions: () => [...roleKeys.all, 'permissions'] as const,
};

// ── Permissions catalogue ─────────────────────────────────────────────────────

export function usePermissionsCatalogue() {
  return useQuery({
    queryKey: roleKeys.permissions(),
    queryFn: async () => {
      const res = await api.get<PermissionGrouped[]>(`${BASE_ROLES}/permissions`);
      return res.data;
    },
    staleTime: 5 * 60_000,  // permissions catalogue rarely changes
  });
}

// ── List roles ────────────────────────────────────────────────────────────────

export function useEnterpriseRoles() {
  return useQuery({
    queryKey: roleKeys.lists(),
    queryFn: async () => {
      const res = await api.get<RoleListResponse>(`${BASE_ROLES}`);
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ── Single role ───────────────────────────────────────────────────────────────

export function useEnterpriseRole(id: string) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: async () => {
      const res = await api.get<Role>(`${BASE_ROLES}/${id}`);
      return res.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

// ── Create ────────────────────────────────────────────────────────────────────

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: RoleCreate) => {
      const res = await api.post<Role>(BASE_ROLES, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
}

// ── Update ────────────────────────────────────────────────────────────────────

export function useUpdateRole(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: RoleUpdate) => {
      const res = await api.patch<Role>(`${BASE_ROLES}/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleKeys.detail(id) });
      qc.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE_ROLES}/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
}

// ── Clone ─────────────────────────────────────────────────────────────────────

export function useCloneRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, newName, description }: { id: string; newName: string; description?: string }) => {
      const res = await api.post<Role>(`${BASE_ROLES}/${id}/clone`, { new_name: newName, description });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
}

// ── Bulk set permissions ──────────────────────────────────────────────────────

export function useSetRolePermissions(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (permissionIds: string[]) => {
      const res = await api.put<Role>(`${BASE_ROLES}/${id}/permissions`, { permission_ids: permissionIds });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleKeys.detail(id) });
    },
  });
}

// ── Seed defaults ─────────────────────────────────────────────────────────────

export function useSeedDefaults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ permissions_created: number; roles_created: number }>(
        `${BASE_ROLES}/seed`
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleKeys.lists() });
      qc.invalidateQueries({ queryKey: roleKeys.permissions() });
    },
  });
}

// ── Seed Enterprise RBAC 3.0 ──────────────────────────────────────────────────

export function useSeedEnterprise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ status: string; permissions_created: number; permissions_total: number; roles_created: number; roles_total: number; message: string }>(
        `${BASE_ROLES}/seed-enterprise`
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleKeys.lists() });
      qc.invalidateQueries({ queryKey: roleKeys.permissions() });
    },
  });
}

