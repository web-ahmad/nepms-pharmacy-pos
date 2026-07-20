import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { AnalyticsKPIs } from '@/features/reports/types';

export const useAnalyticsKPIs = () => {
  return useQuery({
    queryKey: ['analytics', 'kpis'],
    queryFn: async () => {
      const res = await api.get('/api/v1/analytics/dashboard');
      return res.data as AnalyticsKPIs;
    },
    refetchInterval: 60000 // refresh every minute
  });
};

export const useDashboardCharts = (params: { start_date: string, end_date: string }) => {
  return useQuery({
    queryKey: ['dashboard', 'charts', params],
    queryFn: async () => {
      const res = await api.get('/api/v1/dashboard/charts', { params: { from_date: params.start_date, to_date: params.end_date } });
      return res.data;
    }
  });
};

export interface TopMedicine {
  name: string;
  qty: number;
}

export interface RegionData {
  area_zone: string;
  total_customers: number;
  total_sales: number;
  top_medicines: TopMedicine[];
}

export interface GeospatialData {
  regions: RegionData[];
  insights: string[];
}

export const useGeospatialAnalytics = () => {
  return useQuery({
    queryKey: ['analytics', 'geospatial'],
    queryFn: async () => {
      const res = await api.get('/api/v1/analytics/geospatial');
      return res.data?.data as GeospatialData;
    },
    refetchInterval: 300000 // refresh every 5 mins
  });
};

import axios from 'axios';

export interface MarketInsight {
  id: string;
  type: 'weather' | 'trend' | 'health' | 'inventory';
  message: string;
  severity: 'high' | 'medium' | 'low';
}

export const useMarketIntelligence = (internalInsights: string[]) => {
  return useQuery({
    queryKey: ['analytics', 'market-intelligence', internalInsights],
    queryFn: async () => {
      // Direct POST call to Next.js API Route with internal context
      const res = await axios.post('/api/analytics/market-intelligence', { internalInsights });
      return res.data?.insights as MarketInsight[];
    },
    // Only run this query if we have internal insights to pass
    enabled: internalInsights && internalInsights.length > 0,
    refetchInterval: 600000 // refresh every 10 mins
  });
};
