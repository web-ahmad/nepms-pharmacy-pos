import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { CheckoutPayload, POSInvoiceResponse } from '../types/pos';

// ── Medicine Search ──────────────────────────────────────────────────────────

export const useSearchMedicines = (searchTerm: string, branchId?: string | null) => {
  return useQuery({
    // branchId in the key ensures switching branches (or All Branches) never
    // serves a cached result scoped to a different branch.
    queryKey: ['medicines', 'search', searchTerm, branchId],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      // in_stock_only: a cashier can only sell what's physically on this
      // branch's shelf — unlike Purchase Order search, items with zero stock
      // in the active branch must not appear at all (not just be disabled).
      const response = await api.get<any>(
        `/api/v1/inventory/medicines?search_term=${encodeURIComponent(searchTerm)}&in_stock_only=true`
      );
      return response.data.items || [];
    },
    enabled: searchTerm.length >= 2,
    staleTime: 30000,
  });
};

// ── Checkout & Sales ─────────────────────────────────────────────────────────

export const useCheckout = () => {
  return useMutation({
    mutationFn: async (payload: CheckoutPayload) => {
      const response = await api.post<POSInvoiceResponse>('/api/v1/sales/checkout', payload);
      return response.data;
    }
  });
};

export const useHeldSales = () => {
  return useQuery({
    queryKey: ['sales', 'held'],
    queryFn: async () => {
      const response = await api.get<POSInvoiceResponse[]>('/api/v1/sales/held');
      return response.data;
    }
  });
};

// ── POS behaviour config ─────────────────────────────────────────────────────
export interface PosConfig {
  enable_barcode_scanner: boolean;
  default_payment_mode: string;
  allow_partial_payment: boolean;
  allow_credit_sale: boolean;
  enable_discounts: boolean;
  max_discount_percent: number;
  enable_prescription_requirement: boolean;
  allow_hold_sale: boolean;
  show_expiry_warning: boolean;
}

export const DEFAULT_POS_CONFIG: PosConfig = {
  enable_barcode_scanner: true,
  default_payment_mode: 'Cash',
  allow_partial_payment: false,
  allow_credit_sale: true,
  enable_discounts: true,
  max_discount_percent: 20,
  enable_prescription_requirement: false,
  allow_hold_sale: true,
  show_expiry_warning: true,
};

/** Live POS behaviour flags from Settings → POS (applied on the terminal). */
export const usePosConfig = (): PosConfig => {
  const { data } = useQuery({
    queryKey: ['sales', 'pos-config'],
    queryFn: async () => {
      const res = await api.get<Partial<PosConfig>>('/api/v1/sales/pos-config');
      return res.data;
    },
    staleTime: 30000,
  });
  return { ...DEFAULT_POS_CONFIG, ...(data || {}) };
};

export const useWorkflowMode = () => {
  return useQuery({
    queryKey: ['sales', 'workflow-mode'],
    queryFn: async () => {
      const response = await api.get<{ mode: 'SINGLE_COUNTER' | 'DUAL_COUNTER' }>('/api/v1/sales/workflow-mode');
      return response.data;
    }
  });
};

export const usePendingVerificationSales = () => {
  return useQuery({
    queryKey: ['sales', 'pending-verification'],
    queryFn: async () => {
      const response = await api.get<POSInvoiceResponse[]>('/api/v1/sales/pending-verification');
      return response.data;
    }
  });
};

export const useVerifyComplete = (saleId: string) => {
  return useMutation({
    mutationFn: async (payload: { amount_paid: number; payment_method: string }) => {
      const response = await api.post<POSInvoiceResponse>(`/api/v1/sales/${saleId}/verify-complete`, payload);
      return response.data;
    }
  });
};

export const usePrintReceipt = () => {
  return useMutation({
    mutationFn: async (receiptData: any) => {
      const response = await api.post('/api/v1/print/receipt', { receipt_data: receiptData });
      return response.data;
    }
  });
};

// ── Cashier Portal / Cash Register ──────────────────────────────────────────

export const useCashierSessionCheck = () => {
  return useQuery({
    queryKey: ['cashier', 'session', 'check'],
    queryFn: async () => {
      const response = await api.get<{
        has_open_session: boolean;
        session_id: string | null;
        opening_balance?: number;
        opened_at?: string;
      }>('/api/v1/cashier/session/check');
      return response.data;
    },
    refetchInterval: 30000,
  });
};

export const useCashierSession = (enabled: boolean) => {
  return useQuery({
    queryKey: ['cashier', 'session', 'current'],
    queryFn: async () => {
      const response = await api.get<any>('/api/v1/cashier/session/current');
      return response.data;
    },
    enabled,
    refetchInterval: 15000,
  });
};

export const useOpenSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { opening_balance: number }) => {
      const response = await api.post<any>('/api/v1/cashier/session/open', payload);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashier'] });
    }
  });
};

export const useCloseSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { closing_balance_actual: number; discrepancy_notes?: string }) => {
      const response = await api.post<any>('/api/v1/cashier/session/close', payload);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashier'] });
    }
  });
};

export const useLogExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { amount: number; notes: string; payment_mode: string }) => {
      const response = await api.post<any>('/api/v1/cashier/expense', payload);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashier', 'session', 'current'] });
    }
  });
};

/** Pending queue with 10-second auto-polling */
export const usePendingQueuePolling = () => {
  return useQuery({
    queryKey: ['cashier', 'pending-queue'],
    queryFn: async () => {
      const response = await api.get<POSInvoiceResponse[]>('/api/v1/sales/pending');
      return response.data;
    },
    refetchInterval: 10000,
  });
};

export const useDeleteSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saleId: string) => {
      const response = await api.delete(`/api/v1/sales/${saleId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['held-sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};
