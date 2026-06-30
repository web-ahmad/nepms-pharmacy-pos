import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface DateRange {
  from_date?: string; // YYYY-MM-DD
  to_date?: string;   // YYYY-MM-DD
}

export const useSalesOverview = (range: DateRange) => {
  return useQuery({
    queryKey: ['dashboard', 'sales-overview', range],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range.from_date) params.append('from_date', range.from_date);
      if (range.to_date) params.append('to_date', range.to_date);
      
      const res = await api.get(`/api/v1/dashboard/overview?${params.toString()}`);
      return res.data;
    }
  });
};

export const useInventoryOverview = () => {
  return useQuery({
    queryKey: ['dashboard', 'inventory-overview'],
    queryFn: async () => {
      const res = await api.get(`/api/v1/dashboard/inventory`);
      return res.data;
    }
  });
};

export const useExpiryAlerts = () => {
  return useQuery({
    queryKey: ['dashboard', 'alerts', 'expiry'],
    queryFn: async () => {
      const res = await api.get(`/api/v1/dashboard/alerts/expiry`);
      return res.data;
    }
  });
};

export const useLowStockAlerts = () => {
  return useQuery({
    queryKey: ['dashboard', 'alerts', 'low-stock'],
    queryFn: async () => {
      const res = await api.get(`/api/v1/dashboard/alerts/low-stock`);
      return res.data;
    }
  });
};

export const usePurchaseSummary = () => {
  return useQuery({
    queryKey: ['dashboard', 'purchase-summary'],
    queryFn: async () => {
      const res = await api.get(`/api/v1/dashboard/purchase-summary`);
      return res.data;
    }
  });
};

export const useDashboardCharts = (range: DateRange) => {
  return useQuery({
    queryKey: ['dashboard', 'charts', range],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range.from_date) params.append('from_date', range.from_date);
      if (range.to_date) params.append('to_date', range.to_date);

      const res = await api.get(`/api/v1/dashboard/charts?${params.toString()}`);
      return res.data;
    }
  });
};
