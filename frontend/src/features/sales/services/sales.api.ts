import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Sale, ReturnLog, SaleReturnCreateRequest, SalesHistoryFilters } from '../types/sales';

export const useSalesHistory = (filters: SalesHistoryFilters) => {
  return useQuery({
    queryKey: ['sales', 'history', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.invoice_id) params.append('invoice_id', filters.invoice_id);
      if (filters.customer_id) params.append('customer_id', filters.customer_id);
      if (filters.cashier_id) params.append('cashier_id', filters.cashier_id);
      
      const skip = (filters.page - 1) * filters.limit;
      params.append('skip', skip.toString());
      params.append('limit', filters.limit.toString());

      const response = await api.get<{ total: number; items: Sale[] }>(`/api/v1/sales?${params.toString()}`);
      return response.data;
    }
  });
};

export const useSaleDetail = (saleId?: string) => {
  return useQuery({
    queryKey: ['sales', 'detail', saleId],
    queryFn: async () => {
      if (!saleId) return null;
      try {
        console.log(`[useSaleDetail] Fetching: /api/v1/sales/${saleId}`);
        const response = await api.get<Sale>(`/api/v1/sales/${saleId}`);
        return response.data;
      } catch (error: any) {
        console.error("[useSaleDetail] Failed to fetch invoice:", {
          url: `/api/v1/sales/${saleId}`,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw error;
      }
    },
    enabled: !!saleId
  });
};

export const useReturnLogs = (filters: { start_date?: string; end_date?: string; cashier_id?: string }) => {
  return useQuery({
    queryKey: ['sales', 'returns', 'logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.cashier_id) params.append('cashier_id', filters.cashier_id);

      const response = await api.get<ReturnLog[]>(`/api/v1/sales/returns/logs?${params.toString()}`);
      return response.data;
    }
  });
};

export const useProcessReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ saleId, payload }: { saleId: string; payload: SaleReturnCreateRequest }) => {
      const response = await api.post<any>(`/api/v1/sales/${saleId}/return`, payload);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['sales', 'detail', variables.saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales', 'returns', 'logs'] });
    }
  });
};

export const useVoidSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ saleId, payload }: { saleId: string; payload: { voided_by: string; void_reason?: string; webcam_image_base64?: string | null; screenshot_base64?: string | null } }) => {
      const response = await api.post<Sale>(`/api/v1/sales/${saleId}/void`, payload);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['sales', 'detail', variables.saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales', 'returns', 'logs'] });
    }
  });
};
