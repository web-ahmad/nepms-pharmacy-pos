import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface LowStockAlert {
  medicine_id: string;
  medicine_name: string;
  generic_name?: string;
  batch_info?: string;
  current_stock: number;
  min_stock_level: number;
  safety_threshold: number;
  suggested_reorder: number;
  supplier_name?: string;
  supplier_id?: string;
  category_name?: string;
  severity: 'Critical' | 'Warning';
}

export interface PaginatedLowStockResponse {
  total: number;
  items: LowStockAlert[];
  page: number;
  size: number;
}

interface FetchLowStockParams {
  skip: number;
  limit: number;
  search?: string;
  category_id?: string;
  supplier_id?: string;
  severity?: string;
}

export const useLowStockAlerts = (params: FetchLowStockParams) => {
  return useQuery({
    queryKey: ['low-stock-alerts', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.append('skip', params.skip.toString());
      searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.category_id) searchParams.append('category_id', params.category_id);
      if (params.supplier_id) searchParams.append('supplier_id', params.supplier_id);
      if (params.severity && params.severity !== 'All') searchParams.append('severity', params.severity);

      const res = await api.get(`/api/v1/inventory/alerts/low-stock?${searchParams.toString()}`);
      return res.data as PaginatedLowStockResponse;
    },
    // Keep previous data while fetching new page for smooth pagination
    placeholderData: (previousData) => previousData
  });
};
