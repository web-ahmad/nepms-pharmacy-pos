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

// ── Invoice / Document Template ──────────────────────────────────────────────
// Stored in the (previously unused) TenantSettings.invoice_settings JSON column,
// separate from the thermal-receipt InvoiceSettings table (useInvoiceSettings).
export type InvoiceTemplateStyle = 'classic' | 'modern' | 'minimal';
export interface InvoiceTemplateConfig {
  template: InvoiceTemplateStyle;
  header_color: string;   // header/accent colour used across printed documents
  show_logo: boolean;     // show the company logo on documents
  pos_paper: 'thermal' | 'a4'; // default paper for POS invoices
}
export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplateConfig = {
  template: 'modern',
  header_color: '#1e293b',
  show_logo: true,
  pos_paper: 'thermal',
};

/** Read the active invoice-template config (with defaults filled in). */
export const useInvoiceTemplate = (): InvoiceTemplateConfig => {
  const { data } = useSettings();
  return { ...DEFAULT_INVOICE_TEMPLATE, ...((data?.invoice_settings as Partial<InvoiceTemplateConfig>) || {}) };
};

/** Company letterhead details for document headers (payslips, vouchers…).
 *  Unlike `useSettings`, this is readable by ANY logged-in user — an employee
 *  printing their own payslip doesn't have settings:view. */
export interface CompanyIdentity {
  name?: string | null; logo_url?: string | null; address?: string | null;
  city?: string | null; country?: string | null; phone?: string | null;
  email?: string | null; website?: string | null;
  tax_number?: string | null; registration_number?: string | null;
}
export const useCompanyIdentity = () => {
  return useQuery({
    queryKey: ['settings', 'company-identity'],
    queryFn: async () => {
      const res = await api.get('/api/v1/settings/company-identity');
      return res.data as CompanyIdentity;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
};

// Resolve a stored logo path (e.g. "/storage/logos/x.png") to an absolute URL.
export const BACKEND_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace('/api/v1', '');
export const resolveAssetUrl = (url?: string | null): string => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${BACKEND_ORIGIN}${url}`;
};

export const useUploadLogo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/api/v1/settings/logo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data as { logo_url: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
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
