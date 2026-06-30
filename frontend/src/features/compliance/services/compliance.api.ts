import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: string;
  created_at: string;
}

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['compliance', 'audit-logs'],
    queryFn: async () => {
      const res = await api.get('/api/v1/compliance/audit-logs');
      return res.data as AuditLog[];
    }
  });
};

export const useSensitiveActions = () => {
  return useQuery({
    queryKey: ['compliance', 'sensitive-actions'],
    queryFn: async () => {
      const res = await api.get('/api/v1/compliance/sensitive-actions');
      return res.data as AuditLog[];
    }
  });
};
