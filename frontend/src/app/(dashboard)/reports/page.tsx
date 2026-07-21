"use client";

import { useAuthStore } from '@/stores/auth-store';
import { 
  TrendingUp, DollarSign, Package, AlertTriangle, 
  ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { useDynamicReport } from '@/features/reports/api/dynamic-reports.api';
import UniversalDataTable from '@/features/reports/components/UniversalDataTable';

export default function ReportsHubPage() {
  const { hasPermission } = useAuthStore();

  const { data: kpiData, isLoading: isLoadingKpis } = useDynamicReport('executive_kpis');
  const { data: salesTrendData, isLoading: isLoadingTrend } = useDynamicReport('sales_trend');
  const { data: topMedsData, isLoading: isLoadingMeds } = useDynamicReport('top_medicines');
  const { data: alertsData, isLoading: isLoadingAlerts } = useDynamicReport('recent_alerts');

  const getKpiIcon = (title: string) => {
    if (title.includes('Revenue')) return DollarSign;
    if (title.includes('Profit')) return TrendingUp;
    if (title.includes('Stock')) return Package;
    return AlertTriangle;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Analytics Dashboard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Your high-level business intelligence overview.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoadingKpis ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-zinc-100 animate-pulse dark:bg-zinc-900" />
          ))
        ) : (
          kpiData?.rows?.map((kpi: any) => {
            const Icon = getKpiIcon(kpi.title);
            return (
              <div key={kpi.title} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{kpi.title}</p>
                  <div className={`rounded-lg p-2 ${kpi.critical ? 'bg-red-100 text-red-600 dark:bg-red-500/20' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{kpi.value}</h2>
                  <div className={`flex items-center text-xs font-medium ${kpi.trend === 'up' && !kpi.critical ? 'text-emerald-600 dark:text-emerald-400' : kpi.trend === 'down' && kpi.critical ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {kpi.trend === 'up' ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                    {kpi.change}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sales Trend Line Chart */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50 lg:col-span-2">
          <h3 className="mb-6 text-sm font-semibold text-zinc-900 dark:text-zinc-50">30-Day Revenue Trend</h3>
          <div className="h-72 w-full">
            {isLoadingTrend ? (
               <div className="h-full w-full bg-zinc-100 animate-pulse rounded-lg dark:bg-zinc-900" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrendData?.rows || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dx={-10} tickFormatter={(value) => `Rs ${value / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#09090b', fontWeight: 600 }}
                    labelStyle={{ color: '#71717a', marginBottom: '4px' }}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }} activeDot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Products Bar Chart */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
          <h3 className="mb-6 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Top Selling Medicines</h3>
          <div className="h-72 w-full">
            {isLoadingMeds ? (
               <div className="h-full w-full bg-zinc-100 animate-pulse rounded-lg dark:bg-zinc-900" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMedsData?.rows || []} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#3f3f46', fontSize: 11, fontWeight: 500 }} dx={-10} />
                  <Tooltip 
                    cursor={{ fill: '#f4f4f5', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e4e4e7' }}
                  />
                  <Bar dataKey="qty" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Alerts Table via UniversalDataTable */}
      <UniversalDataTable 
        data={alertsData || null} 
        isLoading={isLoadingAlerts} 
        rowsPerPage={5} 
      />
    </div>
  );
}
