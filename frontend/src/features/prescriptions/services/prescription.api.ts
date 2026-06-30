import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Prescription, PaginatedPrescriptions, PrescriptionCreatePayload, PrescriptionUpdatePayload } from '../types/prescription';

export const usePrescriptions = (search?: string) => {
  return useQuery({
    queryKey: ['prescriptions', search],
    queryFn: async () => {
      const res = await api.get('/api/v1/prescriptions');
      // Simple client-side search since backend doesn't support generic search yet
      let data = res.data as PaginatedPrescriptions;
      if (search) {
        const lowerSearch = search.toLowerCase();
        data.items = data.items.filter(p => 
          p.id.toLowerCase().includes(lowerSearch) || 
          p.doctor_name?.toLowerCase().includes(lowerSearch) ||
          p.patient_id.toLowerCase().includes(lowerSearch)
        );
        data.total = data.items.length;
      }
      return data;
    }
  });
};

export const useCustomerPrescriptions = (customerId: string) => {
  return useQuery({
    queryKey: ['prescriptions', 'customer', customerId],
    queryFn: async () => {
      if (!customerId || customerId === 'new') return { total: 0, items: [] } as PaginatedPrescriptions;
      const res = await api.get(`/api/v1/prescriptions/customer/${customerId}`);
      return res.data as PaginatedPrescriptions;
    },
    enabled: !!customerId && customerId !== 'new'
  });
};

export const usePrescriptionDetails = (id: string) => {
  return useQuery({
    queryKey: ['prescriptions', id],
    queryFn: async () => {
      if (id === 'new') return null;
      const res = await api.get(`/api/v1/prescriptions/${id}`);
      return res.data as Prescription;
    },
    enabled: id !== 'new'
  });
};

export const useCreatePrescription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PrescriptionCreatePayload) => {
      const res = await api.post('/api/v1/prescriptions', payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      if (variables.patient_id) {
        queryClient.invalidateQueries({ queryKey: ['prescriptions', 'customer', variables.patient_id] });
      }
    }
  });
};

export const useUpdatePrescription = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PrescriptionUpdatePayload) => {
      const res = await api.put(`/api/v1/prescriptions/${id}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescriptions', id] });
      if (data.patient_id) {
        queryClient.invalidateQueries({ queryKey: ['prescriptions', 'customer', data.patient_id] });
      }
    }
  });
};

export const useDeletePrescription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/prescriptions/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    }
  });
};

export const useUploadPrescription = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/v1/prescriptions/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data as { filename: string, url: string, message: string };
    }
  });
};
