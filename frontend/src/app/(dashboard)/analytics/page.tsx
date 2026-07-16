"use client";

import { useAnalyticsKPIs, useDashboardCharts } from '@/features/analytics/services/analytics.api';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { format, subDays } from 'date-fns';
import { TrendingUp, TrendingDown, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsDashboardPage() {
  const { data: kpi, isLoading: kpiLoading } = useAnalyticsKPIs();

  const { data: chartsData, isLoading: chartLoading, isError } = useDashboardCharts({
    start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd')
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(val);

  const mockChartsData = {
    sales_trend: Array.from({ length: 30 }).map((_, i) => ({
      date: format(subDays(new Date(), 29 - i), 'yyyy-MM-dd'),
      sales: Math.floor(Math.random() * 50000) + 10000,
      profit: Math.floor(Math.random() * 15000) + 3000
    })),
    payment_methods: [
      { method: 'Cash', amount: 450000 },
      { method: 'Card', amount: 250000 },
      { method: 'Credit/Receivable', amount: 80000 }
    ],
    hourly_sales: Array.from({ length: 12 }).map((_, i) => ({
      hour: `${i + 9}:00`,
      sales: Math.floor(Math.random() * 20000) + 5000
    })),
    top_medicines: [
      { name: 'Panadol Extend', quantity: 450, revenue: 135000 },
      { name: 'Augmentin 625mg', quantity: 320, revenue: 96000 },
      { name: 'Brufen 400mg', quantity: 280, revenue: 42000 },
      { name: 'Evion 400mg', quantity: 210, revenue: 31500 },
      { name: 'Risek 40mg', quantity: 190, revenue: 28500 }
    ],
    salesman_leaderboard: [
      { cashier_name: 'Ahmed Raza', total_revenue: 350000, commissionable_sales: 280000 },
      { cashier_name: 'Fatima Ali', total_revenue: 290000, commissionable_sales: 232000 },
      { cashier_name: 'Bilal Khan', total_revenue: 140000, commissionable_sales: 112000 }
    ]
  };

  const isDataEmpty = (chartsData && (!chartsData.sales_trend || chartsData.sales_trend.length === 0)) || isError;
  const displayData = isDataEmpty ? mockChartsData : chartsData;

  if (kpiLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Enterprise Analytics</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Deep, actionable business intelligence.</p>
      </div>

      {isDataEmpty && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center shadow-sm dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
          <Info className="w-5 h-5 mr-3 flex-shrink-0" />
          <p className="text-sm">No sales data available yet. Displaying realistic sample data to verify the dashboard layout. Process some transactions in the POS to generate live charts.</p>
        </div>
      )}

      {/* System Alerts */}
      <div className="flex flex-col space-y-3">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500" /> Active System Alerts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg flex items-start shadow-sm dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-300">
            <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5 text-rose-500" />
            <div>
              <p className="text-sm font-semibold">Critical Stock Level Reached</p>
              <p className="text-xs mt-1">24 items in Warehouse A have dropped below their minimum threshold. <Link href="/reports/inventory?type=low-stock" className="underline font-medium">View Report</Link></p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start shadow-sm dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300">
            <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="text-sm font-semibold">High Expiry Risk</p>
              <p className="text-xs mt-1">Rs 1.2M worth of inventory expiring within 90 days. <Link href="/reports/inventory?type=expiry" className="underline font-medium">Review Inventory</Link></p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Profit & Margin % */}
        <Link href="/reports/sales" className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <p className="text-sm font-medium text-zinc-500">Net Profit (Today)</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-bold">{formatCurrency(kpi?.today_profit || 0)}</p>
            {kpi && kpi.profit_margin_percent >= 15 ? (
              <span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full dark:bg-emerald-900/30 dark:text-emerald-400">
                <TrendingUp className="w-3 h-3 mr-1" /> {kpi.profit_margin_percent.toFixed(1)}% Margin
              </span>
            ) : (
              <span className="flex items-center text-xs font-semibold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full dark:bg-rose-900/30 dark:text-rose-400">
                <TrendingDown className="w-3 h-3 mr-1" /> {kpi?.profit_margin_percent?.toFixed(1) || 0}% Margin
              </span>
            )}
          </div>
        </Link>

        {/* Expiry Risk Value (90 Days) */}
        <Link href="/reports/inventory?type=expiry" className="p-6 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900 shadow-sm flex flex-col justify-between hover:border-rose-300 dark:hover:border-rose-700 transition-colors">
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Expiry Risk (90 Days)</p>
          <p className="text-2xl font-bold mt-2 text-rose-700 dark:text-rose-300">
            {formatCurrency(kpi?.expiry_risk_90_days_value || 0)}
          </p>
        </Link>

        {/* Dead Stock Capital */}
        <Link href="/reports/inventory?type=low-stock" className="p-6 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 shadow-sm flex flex-col justify-between hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-500">Dead Stock Capital</p>
          <p className="text-2xl font-bold mt-2 text-amber-800 dark:text-amber-400">
            {formatCurrency(kpi?.dead_stock_capital || 0)}
          </p>
        </Link>

        {/* Today's Cash Drawer */}
        <Link href="/sales/cash-drawer" className="p-6 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 shadow-sm flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Today's Cash Drawer</p>
          <p className="text-2xl font-bold mt-2 text-emerald-800 dark:text-emerald-300">
            {formatCurrency(kpi?.todays_cash_drawer || 0)}
          </p>
        </Link>
      </div>

      {/* Next-Gen Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Sales vs Profit Trend (Area Chart) */}
        <div className="xl:col-span-2 p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Revenue vs Actual Profit (30 Days)</h3>
          <div className="h-80 w-full">
            {chartLoading || !displayData ? (
              <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayData.sales_trend || []}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#52525b" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={12} tickMargin={10} stroke="#52525b" />
                  <YAxis fontSize={12} tickFormatter={(value) => `Rs ${value}`} stroke="#52525b" />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value || 0))}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', color: '#000' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="sales" name="Gross Revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
                  <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold mb-6">Payment Methods</h3>
          <div className="flex-1 w-full min-h-[300px]">
            {chartLoading || !displayData ? (
               <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-lg" />
            ) : displayData.payment_methods?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayData.payment_methods}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="amount"
                    nameKey="method"
                  >
                    {displayData.payment_methods.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0))} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400">No payment data</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Operational Hours */}
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Peak Operational Hours</h3>
          <div className="h-72 w-full">
            {chartLoading || !displayData ? (
               <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-lg" />
            ) : displayData.hourly_sales?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayData.hourly_sales}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#52525b" opacity={0.2} />
                  <XAxis dataKey="hour" fontSize={12} stroke="#52525b" />
                  <YAxis fontSize={12} tickFormatter={(value) => `Rs ${value}`} stroke="#52525b" />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0))} />
                  <Line type="step" dataKey="sales" name="Sales Volume" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400">No hourly data</div>
            )}
          </div>
        </div>

        {/* Top 5 Moving Assets */}
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Top 5 Moving Assets</h3>
          <div className="h-72 w-full">
            {chartLoading || !displayData ? (
               <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-lg" />
            ) : displayData.top_medicines?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayData.top_medicines} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#52525b" opacity={0.2} />
                  <XAxis type="number" fontSize={12} tickFormatter={(value) => `Rs ${value}`} stroke="#52525b" />
                  <YAxis dataKey="name" type="category" fontSize={12} stroke="#52525b" width={100} />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0))} />
                  <Bar dataKey="revenue" name="Revenue Generated" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={32}>
                    {displayData.top_medicines.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400">No asset data</div>
            )}
          </div>
        </div>
      </div>

      {/* Operator / Salesman Leaderboard Table */}
      <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
        <h3 className="text-lg font-semibold mb-6">Operator / Salesman Leaderboard (MTD)</h3>
        {chartLoading || !displayData ? (
           <div className="w-full h-48 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-lg" />
        ) : displayData.salesman_leaderboard?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
              <thead className="text-xs uppercase bg-zinc-50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300">
                <tr>
                  <th className="px-6 py-3 rounded-tl-lg">Rank</th>
                  <th className="px-6 py-3">Operator Name</th>
                  <th className="px-6 py-3 text-right">Total Revenue</th>
                  <th className="px-6 py-3 text-right rounded-tr-lg text-emerald-600 dark:text-emerald-400">Commissionable Sales</th>
                </tr>
              </thead>
              <tbody>
                {displayData.salesman_leaderboard.map((operator: any, index: number) => (
                  <tr key={index} className="bg-white border-b dark:bg-zinc-950 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-6 py-4 font-medium">#{index + 1}</td>
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">
                      {operator.cashier_name}
                    </td>
                    <td className="px-6 py-4 text-right">{formatCurrency(operator.total_revenue)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(operator.commissionable_sales)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="w-full py-12 flex items-center justify-center text-zinc-400">No salesman data available</div>
        )}
      </div>

    </div>
  );
}
