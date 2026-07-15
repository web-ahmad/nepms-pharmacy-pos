// features/branches/services/branch.api.ts
// TanStack Query hooks for the Enterprise Branch Management API.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type {
  Branch,
  BranchCreate,
  BranchUpdate,
  BranchListParams,
  BranchListResponse,
  BranchStats,
  BranchDashboardSummary,
  BranchStaffAssignment,
  BranchStaffAssignmentCreate,
  BranchComparisonRequest,
  BranchComparisonResponse,
} from '../types/branch';

const BASE = '/api/v1/enterprise/branches';

// ── Query keys ────────────────────────────────────────────────────────────────

export const branchKeys = {
  all:        ['branches'] as const,
  lists:      () => [...branchKeys.all, 'list'] as const,
  list:       (params: BranchListParams) => [...branchKeys.lists(), params] as const,
  details:    () => [...branchKeys.all, 'detail'] as const,
  detail:     (id: string) => [...branchKeys.details(), id] as const,
  stats:      (id: string) => [...branchKeys.all, 'stats', id] as const,
  dashboard:  () => [...branchKeys.all, 'dashboard'] as const,
  staff:      (id: string) => [...branchKeys.all, 'staff', id] as const,
  comparison: (ids: string[]) => [...branchKeys.all, 'compare', ids] as const,
};

// ── List ──────────────────────────────────────────────────────────────────────

export function useBranches(params: BranchListParams = {}) {
  return useQuery({
    queryKey: branchKeys.list(params),
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params.search)   query.set('search',   params.search);
      if (params.status)   query.set('status',   params.status);
      if (params.type)     query.set('type',     params.type);
      if (params.region)   query.set('region',   params.region);
      if (params.city)     query.set('city',     params.city);
      if (params.sort_by)  query.set('sort_by',  params.sort_by);
      if (params.sort_dir) query.set('sort_dir', params.sort_dir);
      query.set('page',  String(params.page  ?? 1));
      query.set('limit', String(params.limit ?? 20));
      const res = await api.get<BranchListResponse>(`${BASE}?${query.toString()}`);
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ── Single branch ─────────────────────────────────────────────────────────────

export function useBranch(id: string) {
  return useQuery({
    queryKey: branchKeys.detail(id),
    queryFn: async () => {
      const res = await api.get<Branch>(`${BASE}/${id}`);
      return res.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

// ── Dashboard summary ─────────────────────────────────────────────────────────

export function useBranchDashboard() {
  return useQuery({
    queryKey: branchKeys.dashboard(),
    queryFn: async () => {
      const res = await api.get<BranchDashboardSummary>(`${BASE}/dashboard`);
      return res.data;
    },
    staleTime: 60_000,
  });
}

// ── Stats / Metrics ───────────────────────────────────────────────────────────

export function useBranchStats(id: string) {
  return useQuery({
    queryKey: branchKeys.stats(id),
    queryFn: async () => {
      const res = await api.get<BranchStats>(`${BASE}/${id}/stats`);
      return res.data;
    },
    enabled: !!id,
    staleTime: 30_000,
    refetchInterval: 60_000,   // auto-refresh metrics every minute
  });
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export function useBranchStaff(branchId: string) {
  return useQuery({
    queryKey: branchKeys.staff(branchId),
    queryFn: async () => {
      const res = await api.get<BranchStaffAssignment[]>(`${BASE}/${branchId}/staff`);
      return res.data;
    },
    enabled: !!branchId,
    staleTime: 30_000,
  });
}

// ── Comparison ────────────────────────────────────────────────────────────────

export function useBranchComparison() {
  return useMutation({
    mutationFn: async (req: BranchComparisonRequest) => {
      const res = await api.post<BranchComparisonResponse>(`${BASE}/compare`, req);
      return res.data;
    },
  });
}

// ── Create ────────────────────────────────────────────────────────────────────

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: BranchCreate) => {
      const res = await api.post<Branch>(BASE, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchKeys.lists() });
      qc.invalidateQueries({ queryKey: branchKeys.dashboard() });
    },
  });
}

// ── Update ────────────────────────────────────────────────────────────────────

export function useUpdateBranch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: BranchUpdate) => {
      const res = await api.patch<Branch>(`${BASE}/${id}`, data);
      return res.data;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: branchKeys.lists() });
      qc.setQueryData(branchKeys.detail(id), updated);
    },
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${BASE}/${id}`);
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: branchKeys.lists() });
      qc.invalidateQueries({ queryKey: branchKeys.dashboard() });
      qc.removeQueries({ queryKey: branchKeys.detail(id) });
    },
  });
}

// ── Staff mutations ───────────────────────────────────────────────────────────

export function useAssignStaff(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: BranchStaffAssignmentCreate) => {
      const res = await api.post<BranchStaffAssignment>(`${BASE}/${branchId}/staff`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchKeys.staff(branchId) });
      qc.invalidateQueries({ queryKey: branchKeys.detail(branchId) });
    },
  });
}

export function useRemoveStaff(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      await api.delete(`${BASE}/${branchId}/staff/${assignmentId}`);
      return assignmentId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchKeys.staff(branchId) });
    },
  });
}
