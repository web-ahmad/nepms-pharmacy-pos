import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface MasterDataRecord {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export const useMasterData = (masterType: string) => {
  return useQuery({
    queryKey: ['master-data', masterType],
    queryFn: async () => {
      const res = await api.get(`/api/v1/master-data/${masterType}`);
      return res.data as MasterDataRecord[];
    },
    enabled: !!masterType,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

export const useCreateMasterData = (masterType: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post(`/api/v1/master-data/${masterType}`, payload);
      return res.data as MasterDataRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data', masterType] });
    }
  });
};
