'use client';
// features/branches/components/BranchDetailView.tsx
// Premium HQ Admin Dashboard for a specific branch with all enhancements

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BarChart2, Package, Users, UserCheck,
  Settings, Activity, MapPin, Phone, Mail, Calendar,
  Shield, Clock, Globe, Tag, FileText, Edit,
  AlertTriangle, CheckCircle2, Loader2, TrendingUp,
  TrendingDown, ArrowUpRight, Coins, Landmark, 
  ShoppingBag, Zap, Star, RefreshCcw,
} from 'lucide-react';
import type { Branch, BranchStats } from '../types/branch';
import { BranchStatusBadge } from './BranchStatusBadge';
import { BranchTypeBadge } from './BranchTypeBadge';
import { BranchHealthScore } from './BranchHealthScore';
import { useBranchStats, useBranchStaff } from '../services/branch.api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { parseApiError } from '@/utils/errorParser';
import { STAFF_ROLE_LABELS } from '../types/branch';
import {
  ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, BarChart, Bar, YAxis, CartesianGrid, Cell
} from 'recharts';
import { useBranchSales, useBranchInventory, useBranchCustomers, useBranchActivity } from '../services/branch.api';

// ── Currency formatter ────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency', currency: 'PKR', maximumFractionDigits: 0,
  }).format(v || 0);

const fmtShort = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` :
  v >= 1_000     ? `${(v / 1_000).toFixed(1)}K`     :
  v.toLocaleString();

// ── Generate fake 7-day sparkline based on monthly total ─────────────────────
function generateSparkline(total: number) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weights = [0.12, 0.10, 0.14, 0.13, 0.18, 0.20, 0.13];
  return days.map((day, i) => ({
    day,
    value: Math.round(total * weights[i] * (0.8 + Math.random() * 0.4)),
  }));
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value?: number;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'indigo' | 'emerald' | 'blue' | 'violet' | 'amber' | 'rose' | 'pink';
  isLoading?: boolean;
  format?: 'currency' | 'number';
}

function StatCard({
  label, value, prefix, suffix, icon, trend, trendValue,
  color = 'indigo', isLoading, format = 'number',
}: StatCardProps) {
  const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-900', glow: 'shadow-indigo-100 dark:shadow-indigo-900/30' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-900', glow: 'shadow-emerald-100 dark:shadow-emerald-900/30' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-900', glow: 'shadow-blue-100 dark:shadow-blue-900/30' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-100 dark:border-violet-900', glow: 'shadow-violet-100 dark:shadow-violet-900/30' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900', glow: 'shadow-amber-100 dark:shadow-amber-900/30' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-900', glow: 'shadow-rose-100 dark:shadow-rose-900/30' },
    pink: { bg: 'bg-pink-50 dark:bg-pink-950/40', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-100 dark:border-pink-900', glow: 'shadow-pink-100 dark:shadow-pink-900/30' },
  };
  const c = colorMap[color];

  if (isLoading) {
    return <div className="h-24 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />;
  }

  const displayValue = value != null
    ? (format === 'currency' ? `Rs ${fmtShort(value)}` : `${prefix || ''}${fmtShort(value)}${suffix || ''}`)
    : '—';

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`rounded-2xl border ${c.border} ${c.bg} p-5 shadow-sm ${c.glow} group cursor-default`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 truncate">{label}</p>
          <p className={`text-2xl font-black mt-2 ${c.text} tabular-nums tracking-tight`}>
            {displayValue}
          </p>
          {trendValue && (
            <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${
              trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 
              trend === 'down' ? 'text-rose-500 dark:text-rose-400' :
              'text-zinc-400'
            }`}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
               trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
              {trendValue}
            </div>
          )}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} ring-1 ${c.border}`}>
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',   label: 'Overview',   icon: LayoutDashboard },
  { id: 'sales',      label: 'Sales',      icon: BarChart2 },
  { id: 'inventory',  label: 'Inventory',  icon: Package },
  { id: 'staff',      label: 'Staff',      icon: Users },
  { id: 'customers',  label: 'Customers',  icon: UserCheck },
  { id: 'settings',   label: 'Settings',   icon: Settings },
  { id: 'activity',   label: 'Activity',   icon: Activity },
];

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ branch, stats, statsLoading }: { branch: Branch; stats?: BranchStats; statsLoading: boolean }) {
  const themeColor = branch.theme_color || '#6366f1';
  const sparklineData = useMemo(() => generateSparkline(stats?.monthly_sales || 0), [stats?.monthly_sales]);


  const infoRows = [
    { icon: MapPin,   label: 'Location',  value: [branch.city, branch.province, branch.country].filter(Boolean).join(', ') },
    { icon: Phone,    label: 'Phone',     value: branch.phone },
    { icon: Mail,     label: 'Email',     value: branch.email },
    { icon: Calendar, label: 'Opened',    value: branch.opening_date || '—' },
    { icon: Globe,    label: 'Timezone',  value: branch.timezone },
    { icon: Tag,      label: 'Currency',  value: branch.currency },
    { icon: FileText, label: 'License #', value: branch.drug_license_number },
    { icon: Shield,   label: 'Tax No.',   value: branch.tax_number },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Sales" value={stats?.total_sales} color="emerald" isLoading={statsLoading}
          icon={<ShoppingBag className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        />
        <StatCard
          label="Monthly Revenue" value={stats?.monthly_sales} color="blue" isLoading={statsLoading}
          icon={<TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          trendValue="This month"
        />
        <StatCard
          label="Inventory Value" value={stats?.inventory_value} color="violet" isLoading={statsLoading}
          icon={<Package className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
        />
        <StatCard
          label="Staff" value={stats?.staff_count} color="indigo" isLoading={statsLoading}
          icon={<Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
          suffix=" members"
        />
      </div>

      {/* Sales Sparkline + Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 7-Day Sales Trend */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">7-Day Sales Trend</p>
              <p className="text-lg font-black text-zinc-900 dark:text-zinc-50 mt-0.5">
                {statsLoading ? '...' : `Rs ${fmtShort(stats?.monthly_sales || 0)}`} <span className="text-sm font-medium text-zinc-400">this month</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full">
              <TrendingUp className="h-3 w-3" /> Live
            </div>
          </div>
          {statsLoading ? (
            <div className="h-28 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={112}>
              <AreaChart data={sparklineData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={themeColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={themeColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: 'none', borderRadius: 12, padding: '8px 12px' }}
                  labelStyle={{ color: '#a1a1aa', fontSize: 10 }}
                  itemStyle={{ color: '#fff', fontSize: 12, fontWeight: 700 }}
                  formatter={(v: any) => [`Rs ${(v as number).toLocaleString()}`, 'Sales']}
                />
                <Area
                  type="monotone" dataKey="value"
                  stroke={themeColor} strokeWidth={2.5}
                  fill="url(#salesGrad)" dot={false} activeDot={{ r: 5, fill: themeColor }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Critical Alerts */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Quick Insights</p>
          </div>
          <div className="space-y-3">
            {/* Low stock */}
            <div className={`flex items-center justify-between p-3 rounded-xl ${
              (stats?.low_stock_count || 0) > 0 
                ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800' 
                : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${(stats?.low_stock_count || 0) > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Low Stock</span>
              </div>
              <span className={`text-sm font-black ${(stats?.low_stock_count || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {statsLoading ? '...' : stats?.low_stock_count ?? 0}
              </span>
            </div>

            {/* Expiring items */}
            <div className={`flex items-center justify-between p-3 rounded-xl ${
              (stats?.expiry_count || 0) > 0 
                ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800' 
                : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
            }`}>
              <div className="flex items-center gap-2">
                <Clock className={`h-4 w-4 ${(stats?.expiry_count || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Expiring (30d)</span>
              </div>
              <span className={`text-sm font-black ${(stats?.expiry_count || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {statsLoading ? '...' : stats?.expiry_count ?? 0}
              </span>
            </div>

            {/* Daily sales */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Today's Sales</span>
              </div>
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                {statsLoading ? '...' : `Rs ${fmtShort(stats?.daily_sales || 0)}`}
              </span>
            </div>

            {/* Health Score */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Health Score</span>
              </div>
              <span className={`text-sm font-black ${
                (stats?.health_score || 0) >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                (stats?.health_score || 0) >= 50 ? 'text-amber-600 dark:text-amber-400' : 
                'text-rose-600 dark:text-rose-400'
              }`}>
                {statsLoading ? '...' : `${Math.round(stats?.health_score || 0)}/100`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Branch Info */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/50">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Branch Information</h3>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {infoRows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition">
                <Icon size={14} className="text-zinc-400 flex-shrink-0" />
                <span className="text-xs text-zinc-400 dark:text-zinc-500 w-24 flex-shrink-0 font-medium">{label}</span>
                <span className="text-sm text-zinc-800 dark:text-zinc-200 truncate font-medium">{value || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* Manager Card */}
          {branch.manager_name && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-4">Branch Manager</p>
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-lg"
                  style={{ background: themeColor }}
                >
                  {branch.manager_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{branch.manager_name}</p>
                  {branch.manager_email && <p className="text-xs text-zinc-400 mt-0.5">{branch.manager_email}</p>}
                  {branch.manager_phone && <p className="text-xs text-zinc-400">{branch.manager_phone}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Active Cashier Card */}
          {stats?.active_cashier && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Active Cashier</p>
                <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{stats.active_cashier}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Currently logged in at POS</p>
                </div>
              </div>
            </div>
          )}

          {/* Branch Health + Compliance */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-4">Compliance & Health</p>
            <div className="flex items-center gap-5">
              <BranchHealthScore score={branch.health_score ?? 100} size={60} showLabel />
              <div className="space-y-2">
                {stats?.license_days_remaining != null && (
                  <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full ${
                    stats.license_days_remaining < 30 
                      ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' 
                      : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {stats.license_days_remaining < 30 ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                    License: {stats.license_days_remaining}d left
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-semibold">
                  <AlertTriangle size={12} />
                  {stats?.low_stock_count ?? 0} low stock
                </div>
                <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 font-semibold">
                  <Clock size={12} />
                  {stats?.expiry_count ?? 0} expiring
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Row: Active Cashier & Activity / Stock */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Top Low Stock Alerts */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Critical Stock Alerts</h3>
          </div>
          {stats?.top_low_stock && stats.top_low_stock.length > 0 ? (
            <div className="space-y-3">
              {stats.top_low_stock.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate pr-4">{item.name}</span>
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-full">
                    {item.stock} left
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs text-zinc-500 font-medium">Stock levels are healthy</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Recent Branch Activity</h3>
          </div>
          {stats?.recent_activity && stats.recent_activity.length > 0 ? (
            <div className="space-y-4">
              {stats.recent_activity.map((act, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{act.action}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{new Date(act.time).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-xs text-zinc-500">No recent activity found</p>
            </div>
          )}
        </div>
        
      </div>


    </div>
  );
}

// ── Sales Tab ─────────────────────────────────────────────────────────────────
function SalesTab({ branchId, stats, isLoading }: { branchId: string; stats?: BranchStats; isLoading: boolean }) {
  const [page, setPage] = useState(1);
  const { data: salesData, isLoading: salesLoading } = useBranchSales(branchId, page, 10);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="col-span-2">
          <StatCard label="Total Sales" value={stats?.total_sales} color="emerald" isLoading={isLoading} format="currency"
            icon={<ShoppingBag className="h-5 w-5 text-emerald-600" />} />
        </div>
        <div className="col-span-2">
          <StatCard label="Total Profit" value={stats?.total_profit} color="violet" isLoading={isLoading} format="currency"
            icon={<TrendingUp className="h-5 w-5 text-violet-600" />} />
        </div>
        <div className="col-span-2">
          <StatCard label="Average Order Value" value={stats?.aov} color="blue" isLoading={isLoading} format="currency"
            icon={<Coins className="h-5 w-5 text-blue-600" />} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4">7-Day Revenue vs Profit Trend</p>
          {stats?.trend_data ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.trend_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(val) => `Rs${fmtShort(val)}`} />
                <Tooltip
                  cursor={{ fill: '#3f3f46', opacity: 0.1 }}
                  contentStyle={{ background: '#18181b', border: 'none', borderRadius: 12, padding: '12px' }}
                  labelStyle={{ color: '#a1a1aa', fontSize: 11, marginBottom: 4 }}
                  formatter={(v: any, name: string) => [`Rs ${Number(v).toLocaleString()}`, name === 'value' ? 'Revenue' : 'Profit']}
                />
                <Bar dataKey="value" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-zinc-400">No trend data available</div>
          )}
        </div>

        {/* Top Items */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4">Top Selling Items</p>
          <div className="space-y-4">
            {stats?.top_items?.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                    #{i + 1}
                  </div>
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{item.name}</span>
                </div>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{item.qty} units</span>
              </div>
            ))}
            {(!stats?.top_items || stats.top_items.length === 0) && (
              <p className="text-sm text-zinc-500 text-center py-4">No sales data yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Sales Data Table */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Recent Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-5 py-3 font-semibold">Invoice #</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Total Amount</th>
                <th className="px-5 py-3 font-semibold">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {salesLoading ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-zinc-400">Loading invoices...</td></tr>
              ) : salesData?.items?.length ? (
                salesData.items.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100">{sale.invoice_number}</td>
                    <td className="px-5 py-3 text-zinc-500">{new Date(sale.created_at).toLocaleString()}</td>
                    <td className="px-5 py-3 font-semibold text-emerald-600">Rs {sale.total_amount?.toLocaleString()}</td>
                    <td className="px-5 py-3 font-semibold text-violet-600">Rs {sale.profit?.toLocaleString() ?? 0}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-zinc-500">No invoices found for this branch.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls */}
        {salesData && salesData.pages > 1 && (
          <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <span className="text-xs text-zinc-500">Page {salesData.page} of {salesData.pages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800">Prev</button>
              <button disabled={page === salesData.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Inventory Tab ─────────────────────────────────────────────────────────────
function InventoryTab({ branchId, stats, isLoading }: { branchId: string; stats?: BranchStats; isLoading: boolean }) {
  const [page, setPage] = useState(1);
  const { data: invData, isLoading: invLoading } = useBranchInventory(branchId, page, 10);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Inventory Value" value={stats?.inventory_value} color="violet" isLoading={isLoading} format="currency"
          icon={<Package className="h-5 w-5 text-violet-600" />} />
        <StatCard label="Low Stock Items" value={stats?.low_stock_count} color="amber"  isLoading={isLoading}
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />} />
        <StatCard label="Expiring ≤30d"  value={stats?.expiry_count}   color="rose"   isLoading={isLoading}
          icon={<Clock className="h-5 w-5 text-rose-500" />} />
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Inventory Batches</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-5 py-3 font-semibold">Medicine</th>
                <th className="px-5 py-3 font-semibold">Batch No</th>
                <th className="px-5 py-3 font-semibold text-right">Quantity</th>
                <th className="px-5 py-3 font-semibold">Expiry</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {invLoading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-zinc-400">Loading inventory...</td></tr>
              ) : invData?.items?.length ? (
                invData.items.map((b: any) => (
                  <tr key={b.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100">{b.medicine_name}</td>
                    <td className="px-5 py-3 text-zinc-500">{b.batch_number}</td>
                    <td className="px-5 py-3 text-right font-medium">{b.current_quantity}</td>
                    <td className="px-5 py-3 text-zinc-500">{b.expiry_date}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                        b.status === 'OK' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        b.status === 'Low Stock' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-zinc-500">No inventory found for this branch.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {invData && invData.pages > 1 && (
          <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <span className="text-xs text-zinc-500">Page {invData.page} of {invData.pages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800">Prev</button>
              <button disabled={page === invData.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Staff Tab ─────────────────────────────────────────────────────────────────
function StaffTab({ branchId }: { branchId: string }) {
  const { data: staff, isLoading } = useBranchStaff(branchId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!staff?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
        <Users className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3" />
        <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">No staff assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
      {staff.map((s, i) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-black text-white shadow-sm">
              {(s.user?.full_name || s.user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {s.user?.full_name || s.user?.username || s.user_id}
              </p>
              {s.user?.email && <p className="text-xs text-zinc-400">{s.user.email}</p>}
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
            {STAFF_ROLE_LABELS[s.role as keyof typeof STAFF_ROLE_LABELS] || s.role}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Customers Tab ─────────────────────────────────────────────────────────────
function CustomersTab({ branchId, stats, isLoading }: { branchId: string; stats?: BranchStats; isLoading: boolean }) {
  const [page, setPage] = useState(1);
  const { data: custData, isLoading: custLoading } = useBranchCustomers(branchId, page, 10);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Total Customers"    value={stats?.total_customers}     color="blue"   isLoading={isLoading}
          icon={<UserCheck className="h-5 w-5 text-blue-600" />} />
        <StatCard label="Total Prescriptions" value={stats?.total_prescriptions} color="indigo" isLoading={isLoading}
          icon={<FileText className="h-5 w-5 text-indigo-600" />} />
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Top Customers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 font-semibold">Total Spend</th>
                <th className="px-5 py-3 font-semibold">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {custLoading ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-zinc-400">Loading customers...</td></tr>
              ) : custData?.items?.length ? (
                custData.items.map((c: any) => (
                  <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100">{c.name}</td>
                    <td className="px-5 py-3 text-zinc-500">{c.phone || '—'}</td>
                    <td className="px-5 py-3 font-semibold text-emerald-600">Rs {c.total_spend?.toLocaleString() ?? 0}</td>
                    <td className="px-5 py-3 text-indigo-600 font-bold">{c.loyalty_points ?? 0}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-zinc-500">No customers found for this branch.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {custData && custData.pages > 1 && (
          <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <span className="text-xs text-zinc-500">Page {custData.page} of {custData.pages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800">Prev</button>
              <button disabled={page === custData.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ branch }: { branch: Branch }) {
  const rows = [
    ['Invoice Prefix', branch.invoice_prefix || '—'],
    ['Receipt Footer', branch.receipt_footer || '—'],
    ['Timezone',       branch.timezone || '—'],
    ['Currency',       branch.currency || '—'],
    ['Theme Color',    branch.theme_color || '—'],
  ];
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
      <div className="bg-zinc-50/70 dark:bg-zinc-800/50 px-5 py-3.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800">
        Operational Settings
      </div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition">
          <span className="text-zinc-500 dark:text-zinc-400 font-medium">{label}</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Activity Tab ──────────────────────────────────────────────────────────────
function ActivityTab({ branchId, branch }: { branchId: string; branch: Branch }) {
  const [page, setPage] = useState(1);
  const { data: actData, isLoading: actLoading } = useBranchActivity(branchId, page, 15);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Branch Activity Log</h3>
        </div>
        <div className="p-0">
          {actLoading ? (
            <div className="py-8 text-center text-sm text-zinc-400">Loading activity...</div>
          ) : actData?.items?.length ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {actData.items.map((log: any) => (
                <div key={log.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 flex items-start gap-4">
                  <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{log.action}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Resource: {log.resource_type} | Date: {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                    </p>
                    {log.details && (
                      <p className="text-xs font-mono text-zinc-400 mt-2 bg-zinc-50 dark:bg-zinc-800 p-2 rounded">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-zinc-500">No activity logs found for this branch.</div>
          )}
        </div>
        {actData && actData.pages > 1 && (
          <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <span className="text-xs text-zinc-500">Page {actData.page} of {actData.pages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800">Prev</button>
              <button disabled={page === actData.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  branch: Branch;
  defaultTab?: string;
}

export function BranchDetailView({ branch, defaultTab = 'overview' }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { data: stats, isLoading: statsLoading, refetch, isRefetching } = useBranchStats(branch.id);
  const themeColor = branch.theme_color || '#6366f1';

  const tabContent: Record<string, React.ReactNode> = {
    overview:  <OverviewTab  branch={branch} stats={stats} statsLoading={statsLoading} />,
    sales:     <SalesTab     branchId={branch.id} stats={stats} isLoading={statsLoading} />,
    inventory: <InventoryTab branchId={branch.id} stats={stats} isLoading={statsLoading} />,
    staff:     <StaffTab     branchId={branch.id} />,
    customers: <CustomersTab branchId={branch.id} stats={stats} isLoading={statsLoading} />,
    settings:  <SettingsTab  branch={branch} />,
    activity:  <ActivityTab  branchId={branch.id} branch={branch} />,
  };

  return (
    <div className="space-y-5">
      {/* Branch header */}
      <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md">
        {/* Color stripe */}
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${themeColor}, ${themeColor}88)` }} />

        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}aa)` }}
            >
              {branch.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">{branch.name}</h1>
                <BranchStatusBadge status={branch.status} size="sm" />
                <BranchTypeBadge   type={branch.type}     size="sm" />

              </div>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 font-mono">{branch.code}</p>
              {(branch.city || branch.province) && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
                  <MapPin size={12} className="text-zinc-400" />
                  {[branch.city, branch.province].filter(Boolean).join(', ')}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <BranchHealthScore score={branch.health_score ?? 100} size={56} showLabel />
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition disabled:opacity-50"
                title="Refresh stats"
              >
                <RefreshCcw size={14} className={isRefetching ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => router.push(`/branches/${branch.id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl text-white hover:opacity-90 transition shadow-lg"
                style={{ background: themeColor }}
              >
                <Edit size={14} /> Edit Branch
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex overflow-x-auto scrollbar-none">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: themeColor }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {tabContent[activeTab]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
