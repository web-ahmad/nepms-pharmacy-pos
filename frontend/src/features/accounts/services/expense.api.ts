import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

export interface ExpenseVoucher {
  id: string;
  reference: string;
  date: string;
  amount: number;
  payee?: string;
  description?: string;
  category_id: string;
  category_name?: string;
  petty_cash_category_id?: string;
  payment_method: string;
  status: string;
  attachment_url?: string;
  created_by: string;
  created_at: string;
}

export const useExpenseVouchers = (filters?: { start_date?: string; end_date?: string; category_id?: string }) => {
  // Expenses are branch-isolated (backend scopes by the active X-Branch-Id).
  // Key the cache by branch so Recent Transactions never shows another branch's
  // rows and refreshes instantly when the branch changes.
  const branchId = useAuthStore((s) => s.branchId);
  return useQuery({
    queryKey: ['expenses', branchId, filters],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (filters?.start_date) query.append('start_date', filters.start_date);
      if (filters?.end_date) query.append('end_date', filters.end_date);
      if (filters?.category_id) query.append('category_id', filters.category_id);
      
      const res = await api.get(`/api/v1/expenses?${query.toString()}`);
      return res.data as ExpenseVoucher[];
    }
  });
};

export const useCreateExpenseVoucher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: FormData) => {
      const res = await api.post('/api/v1/expenses', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', 'journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', 'chart'] });
    }
  });
};

export const useCreatePettyCashVoucher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: FormData) => {
      const res = await api.post('/api/v1/expenses/petty-cash', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', 'journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', 'chart'] });
    }
  });
};

export const useVoidExpenseVoucher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (arg: string | { id: string; reason?: string }) => {
      const id = typeof arg === 'string' ? arg : arg.id;
      const reason = typeof arg === 'string' ? undefined : arg.reason;
      const res = await api.post(`/api/v1/expenses/${id}/void`, reason ? { void_reason: reason } : {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      // Refresh the Audit Center immediately so the void appears without a
      // manual reload (the events table also polls every 5s as a fallback).
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    }
  });
};
