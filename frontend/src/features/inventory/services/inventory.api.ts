import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Medicine, Batch, StockMovement, StockAdjustmentPayload } from '../types/inventory';

export const useMedicines = (search?: string, page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['medicines', search, page, limit],
    queryFn: async () => {
      const skip = (page - 1) * limit;
      let url = `/api/v1/inventory/medicines?skip=${skip}&limit=${limit}`;
      if (search) url += `&search_term=${encodeURIComponent(search)}`;
      
      const res = await api.get(url);
      if (res.data && Array.isArray(res.data.items)) {
        return { items: res.data.items, total: res.data.total || 0 };
      }
      return {
        items: (Array.isArray(res.data) ? res.data : []) as Medicine[],
        total: Array.isArray(res.data) ? res.data.length : 0
      };
    }
  });
};

export const useMedicineDetails = (id: string) => {
  return useQuery({
    queryKey: ['medicines', id],
    queryFn: async () => {
      if (id === 'new') return null;
      const res = await api.get<Medicine>(`/api/v1/inventory/medicines/${id}`);
      return res.data;
    },
    enabled: id !== 'new'
  });
};

export const useCreateMedicine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Medicine>) => {
      const res = await api.post('/api/v1/inventory/medicines', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
    }
  });
};

export const useUpdateMedicine = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Medicine>) => {
      const res = await api.put(`/api/v1/inventory/medicines/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
    }
  });
};

export const useBatches = (medicineId: string) => {
  return useQuery({
    queryKey: ['batches', medicineId],
    queryFn: async () => {
      if (medicineId === 'new') return [];
      const res = await api.get<Batch[]>(`/api/v1/inventory/medicines/${medicineId}/batches`);
      return res.data;
    },
    enabled: medicineId !== 'new'
  });
};

export const useStockMovements = (medicineId: string) => {
  return useQuery({
    queryKey: ['movements', medicineId],
    queryFn: async () => {
      if (medicineId === 'new') return [];
      const res = await api.get<StockMovement[]>(`/api/v1/inventory/medicines/${medicineId}/movements`);
      return res.data;
    },
    enabled: medicineId !== 'new'
  });
};

export const useAdjustStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: StockAdjustmentPayload) => {
      const res = await api.post('/api/v1/inventory/adjustments', payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['batches', variables.medicine_id] });
      queryClient.invalidateQueries({ queryKey: ['movements', variables.medicine_id] });
    }
  });
};
