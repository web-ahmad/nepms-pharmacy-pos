import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { AuditResponse } from '../types';
import { DateRangeParams } from '@/features/reports/types';

export const useAuditQuery = (endpoint: string, params: DateRangeParams, enabled = true) => {
  return useQuery({
    queryKey: ['audit', endpoint, params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params.start_date) query.append('start_date', params.start_date);
      if (params.end_date) query.append('end_date', params.end_date);
      
      const res = await api.get(`${endpoint}?${query.toString()}`);
      return res.data as AuditResponse;
    },
    enabled: enabled && !!params.start_date && !!params.end_date,
  });
};
