import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Base fetcher function to inject the Authorization token if needed by your API middleware, 
// though our Next.js API routes rely on the Supabase cookies which are automatically sent.
async function fetchAuditData(endpoint: string) {
  const res = await fetch(endpoint);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch data');
  }
  return res.json();
}

export function useAuditEvents(branchId?: string) {
  return useQuery({
    queryKey: ['audit', 'events', branchId],
    queryFn: () => fetchAuditData(`/api/audit/events${branchId ? `?branch_id=${branchId}` : ''}`),
  });
}

export function useStaffRiskScores(branchId?: string) {
  return useQuery({
    queryKey: ['audit', 'risk-scores', branchId],
    queryFn: () => fetchAuditData(`/api/audit/risk-scores${branchId ? `?branch_id=${branchId}` : ''}`),
  });
}

export function useCashReconciliation(branchId?: string) {
  return useQuery({
    queryKey: ['audit', 'cash-reconciliation', branchId],
    queryFn: () => fetchAuditData(`/api/audit/cash-reconciliation${branchId ? `?branch_id=${branchId}` : ''}`),
  });
}

export function useInventoryFlags(branchId?: string) {
  return useQuery({
    queryKey: ['audit', 'inventory-flags', branchId],
    queryFn: () => fetchAuditData(`/api/audit/inventory-flags${branchId ? `?branch_id=${branchId}` : ''}`),
  });
}

export function useAlertConfigs(branchId?: string) {
  return useQuery({
    queryKey: ['audit', 'alert-config', branchId],
    queryFn: () => fetchAuditData(`/api/audit/alert-config${branchId ? `?branch_id=${branchId}` : ''}`),
  });
}

export function usePrebuiltReport(reportType: string, branchId?: string, period: string = 'daily') {
  return useQuery({
    queryKey: ['audit', 'reports', reportType, branchId, period],
    queryFn: () => {
      if (!branchId) return null;
      return fetchAuditData(`/api/audit/reports/${reportType}?branch_id=${branchId}&period=${period}`);
    },
    enabled: !!branchId && !!reportType,
    retry: false, // Don't aggressively retry proxy errors
  });
}

export function useUpdateAlertConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/audit/alert-config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error('Failed to update config');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit', 'alert-config'] });
    },
  });
}
