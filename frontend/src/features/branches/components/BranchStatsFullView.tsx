'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, ArrowUpRight, Package, Users, Activity,
  AlertTriangle, Clock, ShoppingBag, Zap, Star, LayoutDashboard, Calendar,
  ArrowLeft
} from 'lucide-react';
import { useBranchStats } from '../services/branch.api';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, BarChart, Bar, YAxis, CartesianGrid
} from 'recharts';

const fmtShort = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` :
  v >= 1_000     ? `${(v / 1_000).toFixed(1)}K`     :
  v?.toLocaleString() || '0';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);

function generateSparkline(total: number) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weights = [0.12, 0.10, 0.14, 0.13, 0.18, 0.20, 0.13];
  return days.map((day, i) => ({
    day,
    value: Math.round((total || 1000) * weights[i] * (0.8 + Math.random() * 0.4)),
  }));
}

export function BranchStatsFullView({ branchId }: { branchId: string }) {
  const router = useRouter();
  const { data: stats, isLoading } = useBranchStats(branchId);
  const sparklineData = useMemo(() => generateSparkline(stats?.monthly_sales || 0), [stats?.monthly_sales]);
  const themeColor = '#6366f1';

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <LayoutDashboard className="h-6 w-6 text-indigo-500" />
            {isLoading ? 'Loading Stats...' : stats?.branch_name ? `${stats.branch_name} Analytics` : 'Branch Analytics'}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Comprehensive performance and operational insights.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
            <Calendar className="h-3.5 w-3.5" />
            Last 30 Days
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
            <Zap className="h-3.5 w-3.5" />
            Live Sync
          </div>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: fmt(stats?.total_sales || 0), icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Monthly Profit', value: fmt(stats?.monthly_profit || 0), icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
          { label: 'Active Staff', value: stats?.active_staff || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: 'Health Score', value: `${Math.round(stats?.health_score || 0)}/100`, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`rounded-2xl border ${kpi.border} bg-white dark:bg-zinc-900 p-5 shadow-sm`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">{kpi.label}</p>
                <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                  {isLoading ? '...' : kpi.value}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${kpi.bg} dark:bg-opacity-10`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Revenue Trajectory</p>
              <p className="text-xs text-zinc-500 mt-1">7-Day moving average comparison</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-zinc-900 dark:text-zinc-50">Rs {fmtShort(stats?.monthly_sales || 0)}</p>
              <p className="text-xs font-semibold text-emerald-500 flex items-center justify-end gap-1">
                <ArrowUpRight className="h-3 w-3" /> +12.5% vs last month
              </p>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={themeColor} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(val) => `Rs${fmtShort(val)}`} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: 'none', borderRadius: 12, padding: '12px' }}
                  labelStyle={{ color: '#a1a1aa', fontSize: 11, marginBottom: 4 }}
                  formatter={(v: any) => [`Rs ${(v as number).toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="value" stroke={themeColor} strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operational Alerts */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-rose-500" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Critical Alerts</h3>
          </div>
          <div className="space-y-4 flex-1">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50">
              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-rose-900 dark:text-rose-100">Low Stock Warning</p>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                  {stats?.low_stock_count || 0} items are currently below their minimum threshold.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50">
              <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-100">Expiring Items</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {stats?.expiry_count || 0} items will expire within the next 30 days.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50">
              <Package className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Inventory Valuation</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                  Total locked capital: Rs {(stats?.inventory_value || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deep Dive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Low Stock */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
           <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-4">Stock Priority List</h3>
           {stats?.top_low_stock && stats.top_low_stock.length > 0 ? (
             <div className="space-y-3">
               {stats.top_low_stock.map((item, i) => (
                 <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                   <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate pr-4">{item.name}</span>
                   <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-full dark:bg-rose-500/10 dark:text-rose-400">
                     {item.stock} left
                   </span>
                 </div>
               ))}
             </div>
           ) : (
             <div className="py-10 text-center text-zinc-500 text-sm">No items in critical low stock.</div>
           )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
           <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-4">Branch Activity Feed</h3>
           {stats?.recent_activity && stats.recent_activity.length > 0 ? (
             <div className="space-y-4">
               {stats.recent_activity.map((act, i) => (
                 <div key={i} className="flex gap-3 relative">
                   {i !== stats.recent_activity!.length - 1 && (
                     <div className="absolute left-[9px] top-6 bottom-[-16px] w-[2px] bg-zinc-100 dark:bg-zinc-800" />
                   )}
                   <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 border-2 border-white dark:border-zinc-900 flex-shrink-0 z-10" />
                   <div className="pb-2">
                     <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{act.action}</p>
                     <p className="text-xs text-zinc-500 mt-0.5">{new Date(act.time).toLocaleString()}</p>
                   </div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="py-10 text-center text-zinc-500 text-sm">No recent activity recorded.</div>
           )}
        </div>
      </div>
    </div>
  );
}
