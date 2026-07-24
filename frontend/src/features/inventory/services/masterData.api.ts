import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

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
  // Master data (generics/categories/manufacturers) is branch-isolated: each
  // branch is its own island. The cache is keyed by both tenant AND branch so
  // switching branch (or pharmacy account) never serves another branch's list.
  const tenantId = useAuthStore((s) => s.tenantId);
  const branchId = useAuthStore((s) => s.branchId);
  return useQuery({
    queryKey: ['master-data', masterType, tenantId, branchId],
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

export const useDeleteMasterData = (masterType: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/master-data/${masterType}/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data', masterType] });
    }
  });
};
