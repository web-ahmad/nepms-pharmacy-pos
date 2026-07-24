import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

export interface PettyCashCategory {
  id: string;
  name: string;
}

export const usePettyCashCategories = () => {
  // Categories are branch-isolated (backend scopes by the active X-Branch-Id).
  // Key the cache by branch so the dropdown never shows another branch's list
  // and refreshes instantly when the branch changes.
  const branchId = useAuthStore((s) => s.branchId);
  return useQuery({
    queryKey: ['petty_cash_categories', branchId],
    queryFn: async (): Promise<PettyCashCategory[]> => {
      const res = await api.get('/api/v1/petty-cash-categories');
      return res.data;
    }
  });
};

export const useCreatePettyCashCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await api.post('/api/v1/petty-cash-categories', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petty_cash_categories'] });
    }
  });
};

export const useDeletePettyCashCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/petty-cash-categories/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petty_cash_categories'] });
    }
  });
};
