// features/users/services/user.api.ts
// TanStack Query hooks for Enterprise Users & Identity Management API.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type {
  EnterpriseUser,
  EnterpriseUserCreate,
  EnterpriseUserUpdate,
  EnterpriseUserListItem,
  UserListResponse,
  UserListParams,
  UserDashboardSummary,
  BranchAssignment,
  BranchAssignmentCreate,
  BranchTransferRequest,
  UserSession,
  TrustedDevice,
  LoginHistoryEntry,
  ActivityLogEntry,
  ApprovalRequest,
  ApprovalAction,
  PasswordResetRequest,
  SuspendRequest,
  LockRequest,
  Paginated,
} from '../types/user';

const BASE = '/api/v1/enterprise/users';

// ── Query keys ────────────────────────────────────────────────────────────────

export const userKeys = {
  all:        ['enterprise-users'] as const,
  lists:      () => [...userKeys.all, 'list'] as const,
  list:       (params: UserListParams) => [...userKeys.lists(), params] as const,
  details:    () => [...userKeys.all, 'detail'] as const,
  detail:     (id: string) => [...userKeys.details(), id] as const,
  dashboard:  () => [...userKeys.all, 'dashboard'] as const,
  branches:   (id: string) => [...userKeys.all, 'branches', id] as const,
  sessions:   (id: string) => [...userKeys.all, 'sessions', id] as const,
  devices:    (id: string) => [...userKeys.all, 'devices', id] as const,
  loginHist:  (id: string) => [...userKeys.all, 'login-history', id] as const,
  activity:   (id: string) => [...userKeys.all, 'activity', id] as const,
  approvals:  (id: string) => [...userKeys.all, 'approvals', id] as const,
  perms:      (id: string, bid?: string) => [...userKeys.all, 'permissions', id, bid] as const,
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function useUserDashboard() {
  return useQuery({
    queryKey: userKeys.dashboard(),
    queryFn: async () => {
      const res = await api.get<UserDashboardSummary>(`${BASE}/dashboard`);
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ── List ──────────────────────────────────────────────────────────────────────

export function useEnterpriseUsers(params: UserListParams = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params.search)    q.set('search',    params.search);
      if (params.status)    q.set('status',    params.status);
      if (params.user_type) q.set('user_type', params.user_type);
      if (params.role_id)   q.set('role_id',   params.role_id);
      if (params.branch_id) q.set('branch_id', params.branch_id);
      if (params.sort_by)   q.set('sort_by',   params.sort_by);
      if (params.sort_dir)  q.set('sort_dir',  params.sort_dir);
      q.set('page',  String(params.page  ?? 1));
      q.set('limit', String(params.limit ?? 20));
      const res = await api.get<UserListResponse>(`${BASE}?${q.toString()}`);
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ── Single user ───────────────────────────────────────────────────────────────

export function useEnterpriseUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => {
      const res = await api.get<EnterpriseUser>(`${BASE}/${id}`);
      return res.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

// ── Create ────────────────────────────────────────────────────────────────────

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: EnterpriseUserCreate) => {
      const res = await api.post<EnterpriseUser>(BASE, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      qc.invalidateQueries({ queryKey: userKeys.dashboard() });
    },
  });
}

// ── Update ────────────────────────────────────────────────────────────────────

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: EnterpriseUserUpdate) => {
      const res = await api.patch<EnterpriseUser>(`${BASE}/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
      qc.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE}/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      qc.invalidateQueries({ queryKey: userKeys.dashboard() });
    },
  });
}

// ── Status mutations ──────────────────────────────────────────────────────────

export function useSuspendUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: SuspendRequest) => {
      const res = await api.post<EnterpriseUser>(`${BASE}/${id}/suspend`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      qc.invalidateQueries({ queryKey: userKeys.dashboard() });
    },
  });
}

export function useActivateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<EnterpriseUser>(`${BASE}/${id}/activate`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
      qc.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useLockUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: LockRequest) => {
      const res = await api.post<EnterpriseUser>(`${BASE}/${id}/lock`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
      qc.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useUnlockUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<EnterpriseUser>(`${BASE}/${id}/unlock`, {});
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
      qc.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

// ── Password ──────────────────────────────────────────────────────────────────

export function useResetPassword(id: string) {
  return useMutation({
    mutationFn: async (data: PasswordResetRequest) => {
      const res = await api.post<{ message: string; temporary_password: string }>(
        `${BASE}/${id}/reset-password`, data
      );
      return res.data;
    },
  });
}

export function useForcePasswordChange(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post(`${BASE}/${id}/force-password-change`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
    },
  });
}

// ── Branch assignments ────────────────────────────────────────────────────────

export function useUserBranches(id: string) {
  return useQuery({
    queryKey: userKeys.branches(id),
    queryFn: async () => {
      const res = await api.get<BranchAssignment[]>(`${BASE}/${id}/branches`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useAssignBranch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: BranchAssignmentCreate) => {
      const res = await api.post<BranchAssignment>(`${BASE}/${id}/branches`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.branches(id) });
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
    },
  });
}

export function useRemoveBranch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (branchId: string) => {
      await api.delete(`${BASE}/${id}/branches/${branchId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.branches(id) });
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
    },
  });
}

export function useTransferBranch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: BranchTransferRequest) => {
      const res = await api.post<BranchAssignment>(`${BASE}/${id}/transfer`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.branches(id) });
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
      qc.invalidateQueries({ queryKey: userKeys.activity(id) });
    },
  });
}

// ── Permissions ───────────────────────────────────────────────────────────────

export function useUserPermissions(id: string, branchId?: string) {
  return useQuery({
    queryKey: userKeys.perms(id, branchId),
    queryFn: async () => {
      const q = branchId ? `?branch_id=${branchId}` : '';
      const res = await api.get<{ permissions: string[]; count: number }>(
        `${BASE}/${id}/permissions${q}`
      );
      return res.data;
    },
    enabled: !!id,
  });
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export function useUserSessions(id: string, skip = 0, limit = 20) {
  return useQuery({
    queryKey: userKeys.sessions(id),
    queryFn: async () => {
      const res = await api.get<Paginated<UserSession>>(
        `${BASE}/${id}/sessions?skip=${skip}&limit=${limit}`
      );
      return res.data;
    },
    enabled: !!id,
  });
}

export function useTerminateSession(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await api.delete(`${BASE}/${userId}/sessions/${sessionId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.sessions(userId) });
    },
  });
}

export function useTerminateAllSessions(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.delete<{ message: string }>(`${BASE}/${userId}/sessions`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.sessions(userId) });
    },
  });
}

// ── Devices ───────────────────────────────────────────────────────────────────

export function useUserDevices(id: string) {
  return useQuery({
    queryKey: userKeys.devices(id),
    queryFn: async () => {
      const res = await api.get<Paginated<TrustedDevice>>(`${BASE}/${id}/devices`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useRevokeDevice(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deviceId: string) => {
      await api.delete(`${BASE}/${userId}/devices/${deviceId}/revoke`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.devices(userId) });
    },
  });
}

export function useBlockDevice(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deviceId: string) => {
      await api.post(`${BASE}/${userId}/devices/${deviceId}/block`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.devices(userId) });
    },
  });
}

// ── Login history ─────────────────────────────────────────────────────────────

export function useLoginHistory(id: string, skip = 0, limit = 20) {
  return useQuery({
    queryKey: userKeys.loginHist(id),
    queryFn: async () => {
      const res = await api.get<Paginated<LoginHistoryEntry>>(
        `${BASE}/${id}/login-history?skip=${skip}&limit=${limit}`
      );
      return res.data;
    },
    enabled: !!id,
  });
}

// ── Activity timeline ─────────────────────────────────────────────────────────

export function useUserActivity(id: string, skip = 0, limit = 30) {
  return useQuery({
    queryKey: userKeys.activity(id),
    queryFn: async () => {
      const res = await api.get<Paginated<ActivityLogEntry>>(
        `${BASE}/${id}/activity?skip=${skip}&limit=${limit}`
      );
      return res.data;
    },
    enabled: !!id,
  });
}

// ── Approvals ─────────────────────────────────────────────────────────────────

export function useUserApprovals(id: string) {
  return useQuery({
    queryKey: userKeys.approvals(id),
    queryFn: async () => {
      const res = await api.get<Paginated<ApprovalRequest>>(
        `${BASE}/${id}/approvals`
      );
      return res.data;
    },
    enabled: !!id,
  });
}

export function useReviewApproval(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ approvalId, data }: { approvalId: string; data: ApprovalAction }) => {
      const res = await api.post(`${BASE}/${userId}/approvals/${approvalId}/review`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.approvals(userId) });
      qc.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
}
