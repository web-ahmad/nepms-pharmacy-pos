import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { 
  Supplier, SupplierLedger, PurchaseOrder, GRN, PurchaseInvoice, SupplierPayment,
  CreateSupplierPayload, CreatePOPayload, CreateGRNPayload, CreateInvoicePayload, CreatePaymentPayload
} from '../types/purchase';

// --- Suppliers ---
export const useSuppliers = () => {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await api.get('/api/v1/purchase/suppliers');
      return res.data as Supplier[];
    }
  });
};

export const useSupplierDetails = (id: string) => {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: async () => {
      if (id === 'new') return null;
      const res = await api.get(`/api/v1/purchase/suppliers/${id}`);
      return res.data as Supplier;
    },
    enabled: id !== 'new'
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSupplierPayload) => {
      const res = await api.post('/api/v1/purchase/suppliers', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    }
  });
};

export const useUpdateSupplier = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CreateSupplierPayload>) => {
      const res = await api.put(`/api/v1/purchase/suppliers/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers', id] });
    }
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/purchase/suppliers/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    }
  });
};

export const useSupplierLedger = (supplierId: string) => {
  return useQuery({
    queryKey: ['supplier_ledger', supplierId],
    queryFn: async () => {
      if (!supplierId) return [];
      const res = await api.get(`/api/v1/purchase/suppliers/${supplierId}/ledger`);
      return res.data as SupplierLedger[];
    },
    enabled: !!supplierId
  });
};

export const useSupplierMedicines = (supplierId: string) => {
  return useQuery({
    queryKey: ['supplier_medicines', supplierId],
    queryFn: async () => {
      if (!supplierId || supplierId === 'new') return [];
      const res = await api.get(`/api/v1/purchase/suppliers/${supplierId}/medicines`);
      return res.data;
    },
    enabled: !!supplierId && supplierId !== 'new'
  });
};

export const useUpsertSupplierMedicines = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ supplierId, medicines }: { supplierId: string, medicines: any[] }) => {
      const res = await api.post(`/api/v1/purchase/suppliers/${supplierId}/medicines`, medicines);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplier_medicines', variables.supplierId] });
      queryClient.invalidateQueries({ queryKey: ['po_auto_suggest'] });
    }
  });
};

// --- Purchase Orders ---
export const usePurchaseOrders = () => {
  return useQuery({
    queryKey: ['purchase_orders'],
    queryFn: async () => {
      const res = await api.get('/api/v1/purchase/orders');
      return res.data as PurchaseOrder[];
    }
  });
};

export const usePurchaseOrderDetails = (id: string) => {
  return useQuery({
    queryKey: ['purchase_orders', id],
    queryFn: async () => {
      if (id === 'new') return null;
      const res = await api.get(`/api/v1/purchase/orders/${id}`);
      return res.data as PurchaseOrder;
    },
    enabled: id !== 'new'
  });
};

export const useCreatePO = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePOPayload) => {
      const res = await api.post('/api/v1/purchase/orders', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

export const useApprovePO = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/v1/purchase/orders/${id}/approve`);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders', variables] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

export const useCancelPO = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/v1/purchase/orders/${id}/cancel`);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders', variables] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

export const useBulkDraftPOs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (medicineIds: string[]) => {
      const res = await api.post('/api/v1/purchase/orders/bulk-draft', { medicine_ids: medicineIds });
      return res.data as PurchaseOrder[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    }
  });
};

// --- GRN ---
export const usePO_GRNs = (poId: string) => {
  return useQuery({
    queryKey: ['grns', 'po', poId],
    queryFn: async () => {
      // In a real app we might have a specific endpoint, or just filter all GRNs.
      // Let's assume there is an endpoint to list GRNs by PO.
      const res = await api.get(`/api/v1/purchase/grn?po_id=${poId}`);
      return res.data as GRN[];
    },
    enabled: !!poId
  });
};

export const useCreateGRN = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateGRNPayload) => {
      const res = await api.post('/api/v1/purchase/grn', payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders', variables.po_id] });
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // IMPORTANT: Invalidate Inventory since GRN creates batches!
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    }
  });
};

// --- Invoices ---
export const usePurchaseInvoices = () => {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await api.get('/api/v1/purchase/invoices');
      return res.data as PurchaseInvoice[];
    }
  });
};

export const usePurchaseInvoiceDetails = (id: string) => {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/purchase/invoices/${id}`);
      return res.data as PurchaseInvoice;
    },
    enabled: !!id
  });
};

export const usePOInvoices = (poId: string) => {
  return useQuery({
    queryKey: ['invoices', 'po', poId],
    queryFn: async () => {
      // Simplified: assume backend supports filtering by po_id directly or we filter locally.
      // For this phase, let's just fetch all and filter or call specific endpoint.
      const res = await api.get(`/api/v1/purchase/invoices?po_id=${poId}`);
      return res.data as PurchaseInvoice[];
    },
    enabled: !!poId
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateInvoicePayload) => {
      const res = await api.post('/api/v1/purchase/invoices', payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier_ledger', variables.supplier_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

// --- Payments ---
export const useCreateSupplierPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePaymentPayload) => {
      const res = await api.post('/api/v1/purchase/payments', payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier_ledger', variables.supplier_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

// --- Auto-Pilot Engine ---
export const useAutoSuggestPOs = (region?: string, supplierId?: string, strategy?: string) => {
  return useQuery({
    queryKey: ['po_auto_suggest', region, supplierId, strategy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (region) params.append('region', region);
      if (supplierId) params.append('supplier_id', supplierId);
      if (strategy) params.append('strategy', strategy);
      const res = await api.get(`/api/v1/purchase/auto-suggest?${params.toString()}`);
      return res.data;
    },
    enabled: true
  });
};

export const useGenerateAutoSplitPOs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { items: any[] }) => {
      const res = await api.post('/api/v1/purchase/generate-po', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

