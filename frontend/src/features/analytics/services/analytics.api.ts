import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { AnalyticsKPIs } from '@/features/reports/types';

export const useAnalyticsKPIs = () => {
  return useQuery({
    queryKey: ['analytics', 'kpis'],
    queryFn: async () => {
      const res = await api.get('/api/v1/analytics/dashboard');
      return res.data as AnalyticsKPIs;
    },
    refetchInterval: 60000 // refresh every minute
  });
};
