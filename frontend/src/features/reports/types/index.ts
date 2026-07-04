export interface DateRangeParams {
  start_date: string;
  end_date: string;
  period?: string;
  cashier_id?: string;
  branch_id?: string;
  export?: string;
  expired?: boolean;
}

export interface ReportResponse {
  title: string;
  headers: string[];
  rows: Record<string, any>[];
  summary?: Record<string, any>;
  total_records: number;
}

export interface AnalyticsKPIs {
  today_revenue: number;
  today_profit: number;
  mtd_revenue: number;
  mtd_profit: number;
  ytd_revenue: number;
  ytd_profit: number;
  receivables: number;
  payables: number;
  inventory_value: number;
  low_stock_count: number;
  near_expiry_count: number;
  active_customers: number;
  active_prescriptions: number;
  profit_margin_percent: number;
  expiry_risk_90_days_value: number;
  dead_stock_capital: number;
  todays_cash_drawer: number;
}
