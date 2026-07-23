import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { SystemModule, TenantSettings } from '../types/settings';

// Tenant Settings
export const useSettings = () => {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/api/v1/settings');
      return res.data as TenantSettings;
    }
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<TenantSettings>) => {
      const res = await api.put('/api/v1/settings', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['sales', 'workflow-mode'] });
    }
  });
};

// Invoice Settings
export const useInvoiceSettings = () => {
  return useQuery({
    queryKey: ['settings', 'invoice'],
    queryFn: async () => {
      const res = await api.get('/api/v1/settings/invoice');
      return res.data;
    }
  });
};

export const useUpdateInvoiceSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.put('/api/v1/settings/invoice', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'invoice'] });
    }
  });
};

// Modules
export const useModules = () => {
  return useQuery({
    queryKey: ['settings', 'modules'],
    queryFn: async () => {
      const res = await api.get('/api/v1/settings/modules');
      return res.data as SystemModule[];
    }
  });
};

export const useUpdateModule = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (is_enabled: boolean) => {
      const res = await api.put(`/api/v1/settings/modules/${id}`, { is_enabled });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'modules'] });
      // In a real app, you might also trigger a full page reload or layout re-render
      // to remove disabled nav links globally.
    }
  });
};

export const useBulkUpdateModules = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, is_enabled }: { ids: string[]; is_enabled: boolean }) => {
      await Promise.all(ids.map((id) => api.put(`/api/v1/settings/modules/${id}`, { is_enabled })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'modules'] });
    }
  });
};

export const useWhatsAppQR = () => {
  return useQuery({
    queryKey: ['settings', 'whatsapp', 'qr'],
    queryFn: async () => {
      const res = await api.get('/api/v1/settings/whatsapp/qr');
      return res.data as { connected: boolean; qr: string | null; error?: string };
    },
    refetchInterval: (query) => query.state.data?.connected ? false : 3000
  });
};
