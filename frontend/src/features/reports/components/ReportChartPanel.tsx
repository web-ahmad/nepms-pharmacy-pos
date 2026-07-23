'use client';

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface ReportChartPanelProps {
  reportId: string;
  rows: any[];
  isLoading?: boolean;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

const CHART_CONFIG: Record<string, { type: 'line' | 'bar' | 'pie'; xKey: string; yKey: string; yKey2?: string; label: string }> = {
  sales_daily: { type: 'bar', xKey: 'date', yKey: 'total_revenue', yKey2: 'cash_sales', label: 'Daily Revenue vs Cash' },
  sales_monthly: { type: 'bar', xKey: 'month', yKey: 'revenue', label: 'Monthly Revenue' },
  sales_hourly: { type: 'bar', xKey: 'hour', yKey: 'revenue', label: 'Revenue by Hour' },
  sales_trend: { type: 'line', xKey: 'date', yKey: 'sales', label: '30-Day Revenue Trend' },
  sales_category: { type: 'bar', xKey: 'category', yKey: 'revenue', label: 'Revenue by Category' },
  sales_cashier: { type: 'bar', xKey: 'cashier_name', yKey: 'total_revenue', label: 'Revenue by Cashier' },
  sales_best_sellers: { type: 'bar', xKey: 'medicine_name', yKey: 'qty_sold', label: 'Top Medicines by Qty Sold' },
  sales_by_medicine: { type: 'bar', xKey: 'medicine_name', yKey: 'revenue', label: 'Revenue by Medicine' },
  staff_sales: { type: 'bar', xKey: 'staff_name', yKey: 'total_revenue', label: 'Revenue by Staff' },
  staff_discounts: { type: 'bar', xKey: 'staff_name', yKey: 'total_discounts_given', label: 'Discounts by Staff' },
  inventory_velocity: { type: 'bar', xKey: 'medicine_name', yKey: 'velocity', label: 'Stock Velocity (30 days)' },
  expenses_by_category: { type: 'pie', xKey: 'category_name', yKey: 'total_amount', label: 'Expenses by Category' },
  customer_top_spenders: { type: 'bar', xKey: 'full_name', yKey: 'lifetime_value', label: 'Top Customers by Spend' },
  supplier_ranking: { type: 'bar', xKey: 'supplier_name', yKey: 'total_purchased', label: 'Supplier Ranking by Total Purchases' },
  supplier_outstanding: { type: 'bar', xKey: 'supplier_name', yKey: 'current_balance', label: 'Outstanding Balance by Supplier' },
  // Advanced
  sales_payment_methods: { type: 'pie', xKey: 'payment_method', yKey: 'revenue', label: 'Revenue by Payment Method' },
  sales_by_generic: { type: 'bar', xKey: 'generic_name', yKey: 'total_revenue', label: 'Revenue by Generic Name' },
  discount_impact: { type: 'line', xKey: 'date', yKey: 'total_discount_given', label: 'Daily Discount Trend' },
  inventory_abc_analysis: { type: 'pie', xKey: 'abc_class', yKey: 'revenue', label: 'ABC Classification' },
  inventory_category_wise: { type: 'pie', xKey: 'category', yKey: 'stock_value', label: 'Stock Value by Category' },
  inventory_turnover: { type: 'bar', xKey: 'medicine_name', yKey: 'turnover_ratio', label: 'Inventory Turnover Ratio' },
  medicine_expiry_calendar: { type: 'bar', xKey: 'expiry_month', yKey: 'at_risk_value', label: 'At-Risk Value by Expiry Month' },
  gross_margin_analysis: { type: 'bar', xKey: 'category', yKey: 'margin_pct', label: 'Gross Margin % by Category' },
  daily_closing_report: { type: 'line', xKey: 'date', yKey: 'net_sales', label: 'Daily Net Sales Trend' },
  refund_rate_analysis: { type: 'bar', xKey: 'category', yKey: 'refund_rate_pct', label: 'Refund Rate % by Category' },
  customer_new_vs_returning: { type: 'bar', xKey: 'month', yKey: 'new_customers', yKey2: 'returning_buyers', label: 'New vs Returning Customers' },
  // HR
  hr_department_headcount: { type: 'bar', xKey: 'department', yKey: 'headcount', label: 'Headcount by Department' },
  hr_payroll_summary: { type: 'bar', xKey: 'first_name', yKey: 'net_pay', label: 'Net Pay by Employee' },
  hr_attendance_summary: { type: 'bar', xKey: 'first_name', yKey: 'present', label: 'Attendance by Employee' },
  // Audit
  audit_by_event_type: { type: 'bar', xKey: 'event_type', yKey: 'event_count', label: 'Events by Type' },
  audit_by_staff: { type: 'bar', xKey: 'staff_id', yKey: 'total_events', label: 'Events by Staff' },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PK', { notation: 'compact', compactDisplay: 'short' }).format(value);

export default function ReportChartPanel({ reportId, rows, isLoading }: ReportChartPanelProps) {
  const config = CHART_CONFIG[reportId];
  if (!config || !rows || rows.length === 0) return null;

  const displayRows = rows.slice(0, 20); // Limit chart to 20 items for readability

  if (isLoading) {
    return (
      <div className="h-64 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
      <h3 className="mb-5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{config.label}</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {config.type === 'pie' ? (
            <PieChart>
              <Pie
                data={displayRows}
                dataKey={config.yKey}
                nameKey={config.xKey}
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {displayRows.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `Rs ${Number(v ?? 0).toLocaleString()}`} />
              <Legend />
            </PieChart>
          ) : config.type === 'line' ? (
            <LineChart data={displayRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
              <XAxis dataKey={config.xKey} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} dx={-8} tickFormatter={formatCurrency} />
              <Tooltip formatter={(v) => `Rs ${Number(v ?? 0).toLocaleString()}`} contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7' }} />
              <Line type="monotone" dataKey={config.yKey} stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
            </LineChart>
          ) : (
            <BarChart data={displayRows} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
              <XAxis dataKey={config.xKey} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} dy={6} interval={0} angle={displayRows.length > 10 ? -30 : 0} textAnchor={displayRows.length > 10 ? 'end' : 'middle'} height={displayRows.length > 10 ? 50 : 30} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} dx={-4} tickFormatter={formatCurrency} />
              <Tooltip formatter={(v) => `Rs ${Number(v ?? 0).toLocaleString()}`} contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7' }} />
              <Bar dataKey={config.yKey} fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              {config.yKey2 && <Bar dataKey={config.yKey2} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
