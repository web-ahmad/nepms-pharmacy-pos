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

export const useDashboardCharts = (params: { start_date: string, end_date: string }) => {
  return useQuery({
    queryKey: ['dashboard', 'charts', params],
    queryFn: async () => {
      const res = await api.get('/api/v1/dashboard/charts', { params: { from_date: params.start_date, to_date: params.end_date } });
      return res.data;
    }
  });
};
