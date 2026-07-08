import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface PettyCashCategory {
  id: string;
  name: string;
}

export const usePettyCashCategories = () => {
  return useQuery({
    queryKey: ['petty_cash_categories'],
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
