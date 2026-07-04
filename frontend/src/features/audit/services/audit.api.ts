import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface SystemAuditLog {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  reason_code: string | null;
  batch_audit_id: string | null;
  severity: 'Info' | 'Warning' | 'Critical';
  details: string | null;
}

export const useAuditLogs = (params: { start_date: string; end_date: string; tab: string; severity?: string; user_id?: string }) => {
  return useQuery({
    queryKey: ['audit', 'logs', params],
    queryFn: async () => {
      const res = await api.get('/api/v1/audit/logs', { params });
      return res.data as SystemAuditLog[];
    }
  });
};
