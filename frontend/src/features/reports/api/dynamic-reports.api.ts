import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { DynamicReportSchema } from '../components/UniversalDataTable';

export const useDynamicReport = (reportId: string, params: Record<string, any> = {}) => {
  return useQuery<DynamicReportSchema>({
    queryKey: ['dynamic-report', reportId, params],
    queryFn: async () => {
      const { data } = await api.get(`/reports/dynamic/${reportId}`, { params });
      return data;
    },
  });
};

export const useBuildCustomReport = () => {
  return useMutation<DynamicReportSchema, Error, any>({
    mutationFn: async (payload) => {
      const { data } = await api.post(`/reports/custom/build`, payload);
      return data;
    }
  });
};
