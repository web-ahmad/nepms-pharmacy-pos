// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { 
  Supplier, SupplierLedger, PurchaseOrder, GRN, PurchaseInvoice, SupplierPayment,
  CreateSupplierPayload, CreatePOPayload, CreateGRNPayload, CreateInvoicePayload, CreatePaymentPayload,
  PurchaseRequest, PurchaseQuotation, PurchaseApproval, PurchaseReceiving,
  CreatePurchaseRequestPayload, CreatePurchaseQuotationPayload, CreatePurchaseApprovalPayload, CreatePurchaseReceivingPayload
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

// --- Analytics ---
export const useSupplierScorecard = (supplierId: string) => {
  const { data: orders, isLoading, isError } = usePurchaseOrders();
  
  if (isLoading || isError || !orders) {
    return { fulfillmentRate: 0, avgLeadTime: 0, qualityScore: 0, overallStars: 0, totalOrders: 0, isLoading, isError };
  }

  const supplierOrders = orders.filter(o => o.supplier_id === supplierId);
  const totalOrders = supplierOrders.length;
  
  if (totalOrders === 0) {
    return { fulfillmentRate: 0, avgLeadTime: 0, qualityScore: 0, overallStars: 0, totalOrders: 0, isLoading: false, isError: false };
  }

  const receivedOrders = supplierOrders.filter(o => o.status === 'Received');
  const cancelledOrders = supplierOrders.filter(o => o.status === 'Cancelled');
  
  const fulfillmentRate = (receivedOrders.length / totalOrders) * 100;
  
  // Calculate average lead time (Days between created_at and updated_at for received orders)
  let totalLeadTime = 0;
  receivedOrders.forEach(o => {
    const created = o.created_at ? new Date(o.created_at).getTime() : Date.now();
    const updated = o.updated_at ? new Date(o.updated_at).getTime() : Date.now();
    const days = (updated - created) / (1000 * 3600 * 24);
    totalLeadTime += days > 0 ? days : 1; // Default to 1 day if very quick
  });
  const avgLeadTime = receivedOrders.length > 0 ? totalLeadTime / receivedOrders.length : 0;
  
  // Simple Quality Score heuristic
  const qualityScore = Math.max(0, 100 - ((cancelledOrders.length / totalOrders) * 50));
  
  // Compute stars (1 to 5)
  // Base 2.5 for just existing, plus up to 1.5 for fulfillment, plus up to 1 for quality
  let stars = 2.5;
  stars += (fulfillmentRate / 100) * 1.5;
  stars += (qualityScore / 100) * 1.0;
  const overallStars = Math.min(5, Math.max(1, Math.round(stars * 10) / 10)); // Round to 1 decimal

  return { fulfillmentRate, avgLeadTime, qualityScore, overallStars, totalOrders, isLoading: false, isError: false };
};

// --- Purchase Returns ---

export interface PurchaseReturnItem {
  id?: string;
  medicine_id: string;
  medicine_name?: string;
  quantity_returned: number;
  unit_price: number;
}

export interface PurchaseReturn {
  id: string;
  return_number: string;
  po_id?: string;
  grn_id?: string;
  supplier_id: string;
  supplier_name?: string;
  return_date: string;
  total_amount: number;
  reason?: string;
  status: string;
  items: PurchaseReturnItem[];
}

export interface CreatePurchaseReturnPayload {
  po_id?: string;
  grn_id?: string;
  supplier_id: string;
  total_amount: number;
  reason?: string;
  items: { medicine_id: string; quantity_returned: number; unit_price: number }[];
}

export const usePurchaseReturns = (poId?: string) => {
  return useQuery({
    queryKey: ['purchase_returns', poId],
    queryFn: async () => {
      const url = poId ? `/api/v1/purchase/returns?po_id=${poId}` : '/api/v1/purchase/returns';
      const res = await api.get(url);
      return res.data as PurchaseReturn[];
    }
  });
};

export const useCreatePurchaseReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePurchaseReturnPayload) => {
      const res = await api.post('/api/v1/purchase/returns', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_returns'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

// --- Enterprise Purchase Module ---

export const usePurchaseRequests = () => {
  return useQuery({
    queryKey: ['purchase_requests'],
    queryFn: async () => {
      const res = await api.get('/api/v1/purchase/requests');
      return res.data as PurchaseRequest[];
    }
  });
};

export const useCreatePurchaseRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePurchaseRequestPayload) => {
      const res = await api.post('/api/v1/purchase/requests', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
    }
  });
};


export const useCreatePurchaseQuotation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePurchaseQuotationPayload) => {
      const res = await api.post('/api/v1/purchase/quotations', payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_quotations'] });
      if (variables.request_id) {
        queryClient.invalidateQueries({ queryKey: ['purchase_quotations', variables.request_id] });
      }
    }
  });
};

export const useCreatePurchaseApproval = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePurchaseApprovalPayload) => {
      const res = await api.post('/api/v1/purchase/approvals', payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders', variables.po_id] });
    }
  });
};

export const useCreateEnterpriseReceiving = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePurchaseReceivingPayload) => {
      const res = await api.post('/api/v1/purchase/receiving', payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders', variables.po_id] });
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    }
  });
};

export const usePurchaseApprovalMatrix = () => {
  return useQuery({
    queryKey: ['purchase_matrix'],
    queryFn: async () => {
      const res = await api.get('/api/v1/purchase/matrix');
      return res.data as any[]; // To match PurchaseApprovalMatrix
    }
  });
};

export const useCreatePurchaseApprovalMatrix = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => { // To match CreatePurchaseApprovalMatrixPayload
      const res = await api.post('/api/v1/purchase/matrix', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_matrix'] });
    }
  });
};

export const usePurchaseTimeline = (referenceId: string) => {
  return useQuery({
    queryKey: ['purchase_timeline', referenceId],
    queryFn: async () => {
      if (!referenceId) return [];
      const res = await api.get(`/api/v1/purchase/requests/${referenceId}/timeline`);
      return res.data as any[]; // To match PurchaseTimeline
    },
    enabled: !!referenceId
  });
};

export const useApprovePurchaseRequest = (requestId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => { // To match PurchaseApprovalRequestPayload
      const res = await api.post(`/api/v1/purchase/requests/${requestId}/approve`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_timeline', requestId] });
    }
  });
};

export const useConvertRequestToPO = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const res = await api.post(`/api/v1/purchase/requests/${requestId}/convert`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    }
  });
};

// --- Quotations (Enterprise) ---

export const usePurchaseQuotations = (requestId?: string) => {
  return useQuery({
    queryKey: ['purchase_quotations', requestId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (requestId) params.append('request_id', requestId);
      const res = await api.get(`/api/v1/purchase/quotations?${params.toString()}`);
      return res.data as PurchaseQuotation[];
    }
  });
};

export const usePurchaseQuotationDetails = (id: string) => {
  return useQuery({
    queryKey: ['purchase_quotations', id],
    queryFn: async () => {
      if (id === 'new') return null;
      const res = await api.get(`/api/v1/purchase/quotations/${id}`);
      return res.data as PurchaseQuotation;
    },
    enabled: id !== 'new' && !!id
  });
};

export const useCreateQuotation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePurchaseQuotationPayload) => {
      const res = await api.post('/api/v1/purchase/quotations', payload);
      return res.data as PurchaseQuotation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_quotations'] });
      if (variables.request_id) {
        queryClient.invalidateQueries({ queryKey: ['purchase_requests', variables.request_id] });
      }
    }
  });
};

export const useUpdateQuotation = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdatePurchaseQuotationPayload) => {
      const res = await api.patch(`/api/v1/purchase/quotations/${id}`, payload);
      return res.data as PurchaseQuotation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_quotations'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_quotations', id] });
      if (data.request_id) {
        queryClient.invalidateQueries({ queryKey: ['purchase_quotations', data.request_id] }); // the list by request
      }
    }
  });
};

export const useUpdateQuotationStatus = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: QuotationStatusUpdate) => {
      const res = await api.patch(`/api/v1/purchase/quotations/${id}/status`, payload);
      return res.data as PurchaseQuotation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_quotations'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_quotations', id] });
      if (data.request_id) {
        queryClient.invalidateQueries({ queryKey: ['purchase_quotations', data.request_id] });
      }
    }
  });
};

export const useQuotationComparison = (requestId: string) => {
  return useQuery({
    queryKey: ['quotation_comparison', requestId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/purchase/quotations/compare?request_id=${requestId}`);
      return res.data as QuotationComparisonResponse;
    },
    enabled: !!requestId
  });
};

export const useConvertQuotationToPO = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (quotationId: string) => {
      const res = await api.post(`/api/v1/purchase/quotations/${quotationId}/convert-to-po`);
      return res.data as PurchaseOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_quotations'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    }
  });
};

export const useSupplierScore = (supplierId: string) => {
  return useQuery({
    queryKey: ['supplier_score', supplierId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/purchase/quotations/supplier-score/${supplierId}`);
      return res.data as SupplierScorecard;
    },
    enabled: !!supplierId
  });
};
