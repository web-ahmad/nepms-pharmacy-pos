import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { 
  Customer, CustomerLedger, CustomerPayment,
  CreateCustomerPayload, CustomerPaymentPayload, LoyaltyRedeemPayload,
  LoyaltyTransaction, CustomerWallet, WalletTransactionCreate, WalletTransaction,
  TimelineItem, CustomerSegment, CustomerReferral, MarketingCampaign, MarketingCampaignCreate
} from '../types/crm';
import { Sale } from '@/features/sales/types/sales';

// --- Customers ---
export const useCustomers = (search: string = '') => {
  return useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      const res = await api.get(`/api/v1/crm/customers?search=${search}`);
      return res.data as Customer[];
    }
  });
};

export const useCustomerDetails = (id: string) => {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => {
      if (id === 'new') return null;
      const res = await api.get(`/api/v1/crm/customers/${id}`);
      return res.data as Customer;
    },
    enabled: id !== 'new'
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCustomerPayload) => {
      const res = await api.post('/api/v1/crm/customers', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['crm_dashboard'] });
    }
  });
};

export const useUpdateCustomer = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CreateCustomerPayload>) => {
      const res = await api.put(`/api/v1/crm/customers/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers', id] });
    }
  });
};

export const useUpdateCustomerStatus = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (status: 'active' | 'inactive') => {
      const res = await api.patch(`/api/v1/crm/customers/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (updatedCustomer) => {
      // Update cache atomically
      queryClient.setQueriesData({ queryKey: ['customers'] }, (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((c: any) => c.id === id ? updatedCustomer : c);
        }
        if (old.id === id) {
          return updatedCustomer;
        }
        return old;
      });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers', id] });
    }
  });
};

// --- Ledgers & Payments ---
export const useCustomerLedger = (customerId: string) => {
  return useQuery({
    queryKey: ['customer_ledger', customerId],
    queryFn: async () => {
      if (!customerId || customerId === 'new') return [];
      const res = await api.get(`/api/v1/crm/customers/${customerId}/ledger`);
      return res.data as CustomerLedger[];
    },
    enabled: !!customerId && customerId !== 'new'
  });
};

export const useCustomerPurchases = (customerId: string) => {
  return useQuery({
    queryKey: ['customer_purchases', customerId],
    queryFn: async () => {
      if (!customerId || customerId === 'new') return [];
      const res = await api.get(`/api/v1/crm/customers/${customerId}/purchases`);
      return res.data as Sale[]; // Re-using POS Sale type
    },
    enabled: !!customerId && customerId !== 'new'
  });
};

export const useCreateCustomerPayment = (customerId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CustomerPaymentPayload) => {
      const res = await api.post(`/api/v1/crm/customers/${customerId}/payments`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer_ledger', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer_purchases', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers', customerId] });
      queryClient.invalidateQueries({ queryKey: ['crm_dashboard'] });
    }
  });
};

// --- Loyalty ---
export const useLoyaltyHistory = (customerId: string) => {
  return useQuery({
    queryKey: ['loyalty_history', customerId],
    queryFn: async () => {
      if (!customerId || customerId === 'new') return [];
      const res = await api.get(`/api/v1/crm/customers/${customerId}/loyalty`);
      return res.data as LoyaltyTransaction[];
    },
    enabled: !!customerId && customerId !== 'new'
  });
};

export const useRedeemPoints = (customerId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LoyaltyRedeemPayload) => {
      const res = await api.post(`/api/v1/crm/customers/${customerId}/redeem`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', customerId] });
      queryClient.invalidateQueries({ queryKey: ['loyalty_history', customerId] });
      queryClient.invalidateQueries({ queryKey: ['timeline', customerId] });
    }
  });
};

// ── Phase 9 CRM API Extensions ───────────────────────────────────────────────

export const useCustomerWallet = (customerId: string) => {
  return useQuery({
    queryKey: ['customer_wallet', customerId],
    queryFn: async () => {
      if (!customerId || customerId === 'new') return null;
      const res = await api.get(`/api/v1/crm/customers/${customerId}/wallet`);
      return res.data as CustomerWallet;
    },
    enabled: !!customerId && customerId !== 'new'
  });
};

export const useProcessWalletTransaction = (customerId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: WalletTransactionCreate) => {
      const res = await api.post(`/api/v1/crm/customers/${customerId}/wallet/transaction`, payload);
      return res.data as WalletTransaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer_wallet', customerId] });
      queryClient.invalidateQueries({ queryKey: ['timeline', customerId] });
    }
  });
};

export const useCustomerTimeline = (customerId: string) => {
  return useQuery({
    queryKey: ['timeline', customerId],
    queryFn: async () => {
      if (!customerId || customerId === 'new') return [];
      const res = await api.get(`/api/v1/crm/customers/${customerId}/timeline`);
      return res.data as TimelineItem[];
    },
    enabled: !!customerId && customerId !== 'new'
  });
};

export const useCustomerSegments = (customerId: string) => {
  return useQuery({
    queryKey: ['customer_segments', customerId],
    queryFn: async () => {
      if (!customerId || customerId === 'new') return [];
      const res = await api.get(`/api/v1/crm/customers/${customerId}/segments`);
      return res.data as CustomerSegment[];
    },
    enabled: !!customerId && customerId !== 'new'
  });
};

export const useCustomerReferrals = (customerId: string) => {
  return useQuery({
    queryKey: ['customer_referrals', customerId],
    queryFn: async () => {
      if (!customerId || customerId === 'new') return [];
      const res = await api.get(`/api/v1/crm/customers/${customerId}/referrals`);
      return res.data as CustomerReferral[];
    },
    enabled: !!customerId && customerId !== 'new'
  });
};

// --- Marketing ---
export const useMarketingCampaigns = (skip: number = 0, limit: number = 100) => {
  return useQuery({
    queryKey: ['marketing_campaigns', skip, limit],
    queryFn: async () => {
      const res = await api.get(`/api/v1/crm/marketing/campaigns?skip=${skip}&limit=${limit}`);
      return res.data as MarketingCampaign[];
    }
  });
};

export const useCreateMarketingCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MarketingCampaignCreate) => {
      const res = await api.post('/api/v1/crm/marketing/campaigns', payload);
      return res.data as MarketingCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_campaigns'] });
    }
  });
};
