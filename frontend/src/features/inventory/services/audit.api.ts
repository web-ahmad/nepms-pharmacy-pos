import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface AuditItem {
  id: string;
  medicine_id: string;
  medicine_name: string;
  sku: string | null;
  batch_id: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  system_quantity: number;
  physical_count: number | null;
  variance: number | null;
  unit_price: number;
}

export interface AuditSession {
  id: string;
  name: string;
  status: string;
  scope_type: string;
  scope_value: string;
  notes: string | null;
  start_date: string;
  completion_date: string | null;
  created_by: string;
  items: AuditItem[];
}

export interface AuditSummary {
  total_variance_value: number;
  total_shrinkage_value: number;
  total_surplus_value: number;
  matched_items_count: number;
  missing_items_count: number;
  extra_items_count: number;
}

export const useAuditSessions = () => {
  return useQuery({
    queryKey: ['inventory', 'audit-sessions'],
    queryFn: async () => {
      const res = await api.get<AuditSession[]>('/api/v1/inventory-audit/sessions');
      return res.data;
    }
  });
};

export const useAuditSession = (id: string) => {
  return useQuery({
    queryKey: ['inventory', 'audit-session', id],
    queryFn: async () => {
      const res = await api.get<AuditSession>(`/api/v1/inventory-audit/sessions/${id}`);
      return res.data;
    },
    enabled: !!id
  });
};

export const useAuditSessionSummary = (id: string) => {
  return useQuery({
    queryKey: ['inventory', 'audit-summary', id],
    queryFn: async () => {
      const res = await api.get<AuditSummary>(`/api/v1/inventory-audit/sessions/${id}/summary`);
      return res.data;
    },
    enabled: !!id
  });
};

export const useCreateAuditSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; scope_type: string; scope_value: string; notes?: string }) => {
      const res = await api.post('/api/v1/inventory-audit/sessions', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'audit-sessions'] });
    }
  });
};

export const useUpdatePhysicalCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, itemId, count }: { sessionId: string; itemId: string; count: number }) => {
      const res = await api.put(`/api/v1/inventory-audit/sessions/${sessionId}/items/${itemId}`, {
        audit_item_id: itemId,
        physical_count: count
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'audit-session', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'audit-summary', variables.sessionId] });
    }
  });
};

export const useSubmitAuditSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await api.post(`/api/v1/inventory-audit/sessions/${sessionId}/submit`);
      return res.data;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'audit-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'audit-sessions'] });
    }
  });
};

export const useReconcileAuditSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await api.post(`/api/v1/inventory-audit/sessions/${sessionId}/reconcile`);
      return res.data;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'audit-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'audit-sessions'] });
    }
  });
};
