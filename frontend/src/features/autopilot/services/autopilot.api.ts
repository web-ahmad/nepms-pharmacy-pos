import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

// ── Types ───────────────────────────────────────────────────────────────────────
export interface KpiPulse {
  today_sales: number; today_invoices: number; vs_yesterday_pct: number;
  low_stock_items: number; expiring_30d: number;
}
export interface ForecastPoint { date: string; sales: number; predicted?: boolean; }
export interface ForecastData {
  history: ForecastPoint[]; forecast: ForecastPoint[]; method: string;
  predicted_total: number; trend: string; avg_daily: number;
}
export interface StockoutItem {
  medicine: string; velocity_per_day: number; current_stock: number;
  days_to_stockout: number; stockout_date: string; suggested_order_qty: number;
  urgency: 'critical' | 'watch' | 'ok';
}
export interface ExpiryItem {
  medicine: string; batch: string; qty: number; days_left: number;
  expiry_date: string; value: number; predicted_waste_qty: number; risk: 'high' | 'medium' | 'low';
}
export interface ExpiryForecast {
  items: ExpiryItem[]; total_value_at_risk: number; predicted_waste_value: number; window_days: number;
}
export interface SmartAction {
  kind: string; priority: 'high' | 'medium' | 'low'; icon: string;
  title: string; detail: string; cta: string; href: string;
}
export interface AIRecommendation { title: string; detail: string; }
export interface AIInsights {
  summary: string; insights: string[]; recommendations: (AIRecommendation | string)[];
  risks: string[]; opportunities: string[]; source: 'gemini' | 'heuristic'; generated_at: string;
}

// ── Hooks ────────────────────────────────────────────────────────────────────────
export const usePulse = () => useQuery({
  queryKey: ['autopilot', 'pulse'],
  queryFn: async () => (await api.get('/api/v1/autopilot/pulse')).data?.data as KpiPulse,
  refetchInterval: 30000,
});

export const useForecast = (horizon = 14) => useQuery({
  queryKey: ['autopilot', 'forecast', horizon],
  queryFn: async () => (await api.get('/api/v1/autopilot/forecast', { params: { horizon } })).data?.data as ForecastData,
});

export const useStockoutRadar = () => useQuery({
  queryKey: ['autopilot', 'stockout-radar'],
  queryFn: async () => (await api.get('/api/v1/autopilot/stockout-radar')).data?.data as StockoutItem[],
  refetchInterval: 60000,
});

export const useExpiryForecast = () => useQuery({
  queryKey: ['autopilot', 'expiry-forecast'],
  queryFn: async () => (await api.get('/api/v1/autopilot/expiry-forecast')).data?.data as ExpiryForecast,
});

export const useSmartActions = () => useQuery({
  queryKey: ['autopilot', 'smart-actions'],
  queryFn: async () => (await api.get('/api/v1/autopilot/smart-actions')).data?.data as SmartAction[],
  refetchInterval: 60000,
});

export const useAutopilotInsights = () => useQuery({
  queryKey: ['autopilot', 'insights'],
  queryFn: async () => (await api.get('/api/v1/autopilot/insights')).data as { context: any; ai: AIInsights },
  staleTime: 60000,
});

// ── Market analysis ──────────────────────────────────────────────────────────────
export interface MarketMedicine { name: string; category: string; demand: 'high' | 'medium'; reason: string; }
export interface SeasonalDemand { category: string; note: string; }
export interface MarketActionItem { title: string; detail: string; }
export interface MarketAnalysis {
  source: 'gemini' | 'heuristic'; season: string; summary: string;
  top_market_medicines: MarketMedicine[]; seasonal_demand: SeasonalDemand[];
  stock_gap: string[]; action_plan: MarketActionItem[]; generated_at: string;
}
export const useMarketAnalysis = () => useQuery({
  queryKey: ['autopilot', 'market-analysis'],
  queryFn: async () => (await api.get('/api/v1/autopilot/market-analysis')).data?.data as MarketAnalysis,
  staleTime: 300000,
});

// ── Auto Purchase Order ──────────────────────────────────────────────────────────
export interface AutoPOResult {
  created: { id: string; order_number: string; supplier: string; items: number; total_amount: number }[];
  requested_items: number; skipped_no_supplier: number; message: string;
}
export const useAutoPO = () => {
  const qc = useQueryClient();
  return useMutation<AutoPOResult, unknown, boolean>({
    mutationFn: async (includeWatch: boolean) =>
      (await api.post('/api/v1/autopilot/auto-po', { include_watch: includeWatch })).data as AutoPOResult,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['autopilot', 'stockout-radar'] }); qc.invalidateQueries({ queryKey: ['invoices'] }); },
  });
};

// ── WhatsApp Briefing ────────────────────────────────────────────────────────────
export const useBriefingPreview = () => useQuery({
  queryKey: ['autopilot', 'briefing-preview'],
  queryFn: async () => (await api.get('/api/v1/autopilot/briefing/preview')).data as { text: string; number: string | null },
  staleTime: 120000,
});
export const useSendBriefing = () => useMutation({
  mutationFn: async (phone?: string) =>
    (await api.post('/api/v1/autopilot/briefing/send', phone ? { phone } : {})).data as { sent: boolean; number?: string; reason?: string },
});

// ── Expiry Auto-Discount ─────────────────────────────────────────────────────────
export interface ExpiryDiscountItem {
  batch_id: string; medicine: string; batch: string; qty: number; days_left: number;
  expiry_date: string; old_price: number; new_price: number; discount_pct: number; already_applied: boolean;
}
export interface ExpiryDiscountPlan { rules: [number, number][]; items: ExpiryDiscountItem[]; count: number; }
export const useExpiryDiscountPreview = () => useQuery({
  queryKey: ['autopilot', 'expiry-discount-preview'],
  queryFn: async () => (await api.get('/api/v1/autopilot/expiry-discount/preview')).data?.data as ExpiryDiscountPlan,
});
export const useApplyExpiryDiscount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/api/v1/autopilot/expiry-discount/apply')).data as { applied: number; reverted: number; message: string },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['autopilot', 'expiry-discount-preview'] }),
  });
};
