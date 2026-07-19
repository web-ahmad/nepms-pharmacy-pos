import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

export interface DateRange {
  from_date?: string; // YYYY-MM-DD
  to_date?: string;   // YYYY-MM-DD
}

export const useSalesOverview = (range: DateRange) => {
  const branchId = useAuthStore((s) => s.branchId);
  return useQuery({
    queryKey: ['dashboard', 'sales-overview', branchId, range],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range.from_date) params.append('from_date', range.from_date);
      if (range.to_date) params.append('to_date', range.to_date);
      
      const res = await api.get(`/api/v1/dashboard/overview?${params.toString()}`);
      return res.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled: !!branchId,
  });
};

export const useInventoryOverview = () => {
  const branchId = useAuthStore((s) => s.branchId);
  return useQuery({
    queryKey: ['dashboard', 'inventory-overview', branchId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/dashboard/inventory`);
      return res.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled: !!branchId,
  });
};

export const useExpiryAlerts = () => {
  const branchId = useAuthStore((s) => s.branchId);
  return useQuery({
    queryKey: ['dashboard', 'alerts', 'expiry', branchId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/dashboard/alerts/expiry`);
      return res.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled: !!branchId,
  });
};

export const useLowStockAlerts = () => {
  const branchId = useAuthStore((s) => s.branchId);
  return useQuery({
    queryKey: ['dashboard', 'alerts', 'low-stock', branchId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/dashboard/alerts/low-stock`);
      return res.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled: !!branchId,
  });
};

export const usePurchaseSummary = () => {
  const branchId = useAuthStore((s) => s.branchId);
  return useQuery({
    queryKey: ['dashboard', 'purchase-summary', branchId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/dashboard/purchase-summary`);
      return res.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled: !!branchId,
  });
};

export const useDashboardCharts = (range: DateRange) => {
  const branchId = useAuthStore((s) => s.branchId);
  return useQuery({
    queryKey: ['dashboard', 'charts', branchId, range],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range.from_date) params.append('from_date', range.from_date);
      if (range.to_date) params.append('to_date', range.to_date);

      const res = await api.get(`/api/v1/dashboard/charts?${params.toString()}`);
      return res.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled: !!branchId,
  });
};
