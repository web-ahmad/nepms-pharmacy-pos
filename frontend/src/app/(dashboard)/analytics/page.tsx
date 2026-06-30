"use client";

import { useAnalyticsKPIs } from '@/features/analytics/services/analytics.api';
import { useReportQuery } from '@/features/reports/services/reports.api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays } from 'date-fns';

export default function AnalyticsDashboardPage() {
  const { data: kpi, isLoading: kpiLoading } = useAnalyticsKPIs();

  // For charts we can use the sales summary endpoint 
  const { data: salesTrend, isLoading: chartLoading } = useReportQuery(
    '/api/v1/reports/sales/summary',
    {
      start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      end_date: format(new Date(), 'yyyy-MM-dd'),
      period: 'day'
    }
  );

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(val);

  if (kpiLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Executive Analytics</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Live multi-dimensional business performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI Cards */}
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Today Revenue</p>
          <p className="text-2xl font-bold mt-2">{formatCurrency(kpi?.today_revenue || 0)}</p>
        </div>
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">MTD Revenue</p>
          <p className="text-2xl font-bold mt-2">{formatCurrency(kpi?.mtd_revenue || 0)}</p>
        </div>
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">YTD Revenue</p>
          <p className="text-2xl font-bold mt-2">{formatCurrency(kpi?.ytd_revenue || 0)}</p>
        </div>
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Inventory Value</p>
          <p className="text-2xl font-bold mt-2">{formatCurrency(kpi?.inventory_value || 0)}</p>
        </div>
        
        <div className="p-6 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 shadow-sm">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">Low Stock / Expiry</p>
          <p className="text-2xl font-bold mt-2 text-red-700 dark:text-red-300">
            {kpi?.low_stock_count} <span className="text-sm font-normal">items</span>
          </p>
        </div>
        <div className="p-6 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 shadow-sm">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Outstanding Receivables</p>
          <p className="text-2xl font-bold mt-2 text-blue-700 dark:text-blue-300">{formatCurrency(kpi?.receivables || 0)}</p>
        </div>
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Active Customers</p>
          <p className="text-2xl font-bold mt-2">{kpi?.active_customers}</p>
        </div>
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Active Prescriptions</p>
          <p className="text-2xl font-bold mt-2">{kpi?.active_prescriptions}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-semibold mb-6">30-Day Sales Trend</h3>
          <div className="h-72 w-full">
            {chartLoading ? (
              <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrend?.rows || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#52525b" opacity={0.2} />
                  <XAxis dataKey="period" fontSize={12} tickMargin={10} stroke="#52525b" />
                  <YAxis fontSize={12} tickFormatter={(value) => `Rs ${value}`} stroke="#52525b" />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value || 0))}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="net_sales" stroke="#3b82f6" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Revenue vs Tax Collected</h3>
          <div className="h-72 w-full">
            {chartLoading ? (
               <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrend?.rows || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#52525b" opacity={0.2} />
                  <XAxis dataKey="period" fontSize={12} stroke="#52525b" />
                  <YAxis fontSize={12} tickFormatter={(value) => `Rs ${value}`} stroke="#52525b" />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0))} />
                  <Legend />
                  <Bar dataKey="gross_sales" name="Gross Sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tax_collected" name="Tax" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
