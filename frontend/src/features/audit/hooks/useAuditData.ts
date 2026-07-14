import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

// All audit data is fetched directly from the Python backend (/api/v1/audit/*)
// using the same axios instance that injects the JWT token automatically.
// This bypasses Next.js API routes entirely (no Supabase required).

const BASE = '/api/v1/audit';

async function fetchAudit(path: string, params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await api.get(`${BASE}${path}${qs}`);
  return res.data;
}

export function useAuditEvents(branchId?: string) {
  return useQuery({
    queryKey: ['audit', 'events', branchId],
    queryFn: () => fetchAudit('/events', branchId ? { branch_id: branchId } : undefined),
    refetchInterval: 5000, // auto-refresh every 5s for real-time feel
  });
}

export function useStaffRiskScores(branchId?: string) {
  return useQuery({
    queryKey: ['audit', 'risk-scores', branchId],
    queryFn: () => fetchAudit('/risk-scores', branchId ? { branch_id: branchId } : undefined),
    refetchInterval: 15000,
  });
}

export function useCashReconciliation(branchId?: string) {
  return useQuery({
    queryKey: ['audit', 'cash-reconciliation', branchId],
    queryFn: () => fetchAudit('/cash-reconciliation', branchId ? { branch_id: branchId } : undefined),
    refetchInterval: 15000,
  });
}

export function useInventoryFlags(branchId?: string) {
  return useQuery({
    queryKey: ['audit', 'inventory-flags', branchId],
    queryFn: () => fetchAudit('/inventory-flags', branchId ? { branch_id: branchId } : undefined),
    refetchInterval: 30000,
  });
}

export function useAlertConfigs(branchId?: string) {
  return useQuery({
    queryKey: ['audit', 'alert-config', branchId],
    queryFn: () => fetchAudit('/alert-config', branchId ? { branch_id: branchId } : undefined),
  });
}

export function usePrebuiltReport(reportType: string, branchId?: string, period: string = 'daily') {
  return useQuery({
    queryKey: ['audit', 'reports', reportType, branchId, period],
    queryFn: () =>
      fetchAudit(`/reports/${reportType}`, {
        ...(branchId ? { branch_id: branchId } : {}),
        period,
      }),
    enabled: !!reportType,
    retry: false,
  });
}

export function useUpdateAlertConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      // Backend uses POST with upsert logic (id in body → update, no id → create)
      const res = await api.post(`${BASE}/alert-config`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit', 'alert-config'] });
    },
  });
}
