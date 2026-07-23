"use client";

import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import {
  TrendingUp, DollarSign, Package, AlertTriangle,
  ArrowUpRight, ArrowDownRight,
  BarChart3, ShoppingCart, Users, Briefcase,
  UserCheck, HardHat, Shield, Wand2, ChevronRight
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { useDynamicReport } from '@/features/reports/api/dynamic-reports.api';
import UniversalDataTable from '@/features/reports/components/UniversalDataTable';

const MODULE_CARDS = [
  {
    title: 'Sales', icon: TrendingUp, href: '/reports/sales', count: 15,
    color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-100 dark:shadow-emerald-900/20',
    desc: 'Revenue, returns, cashier, best sellers',
  },
  {
    title: 'Inventory', icon: Package, href: '/reports/inventory', count: 12,
    color: 'from-teal-500 to-cyan-600', shadow: 'shadow-teal-100 dark:shadow-teal-900/20',
    desc: 'Stock, expiry, ABC, reorder alerts',
  },
  {
    title: 'Purchases', icon: ShoppingCart, href: '/reports/purchases', count: 6,
    color: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-100 dark:shadow-orange-900/20',
    desc: 'POs, supplier ledger, price analysis',
  },
  {
    title: 'Financial', icon: DollarSign, href: '/reports/financial', count: 7,
    color: 'from-violet-500 to-purple-700', shadow: 'shadow-violet-100 dark:shadow-violet-900/20',
    desc: 'P&L, cash book, margins, tax',
  },
  {
    title: 'Customers', icon: Users, href: '/reports/customers', count: 6,
    color: 'from-blue-500 to-blue-700', shadow: 'shadow-blue-100 dark:shadow-blue-900/20',
    desc: 'RFM, loyalty, top spenders',
  },
  {
    title: 'Suppliers', icon: Briefcase, href: '/reports/suppliers', count: 9,
    color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-100 dark:shadow-amber-900/20',
    desc: 'Rankings, aging, catalog, GRN',
  },
  {
    title: 'Staff', icon: UserCheck, href: '/reports/staff', count: 3,
    color: 'from-indigo-500 to-violet-600', shadow: 'shadow-indigo-100 dark:shadow-indigo-900/20',
    desc: 'Sales performance, voids, discounts',
  },
  {
    title: 'HR & Payroll', icon: HardHat, href: '/reports/hr', count: 6,
    color: 'from-amber-400 to-yellow-500', shadow: 'shadow-yellow-100 dark:shadow-yellow-900/20',
    desc: 'Attendance, payroll, leaves, headcount',
  },
  {
    title: 'Audit & Security', icon: Shield, href: '/reports/audit', count: 6,
    color: 'from-red-500 to-rose-700', shadow: 'shadow-red-100 dark:shadow-red-900/20',
    desc: 'Event log, severity, alert history',
  },
];

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

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Analytics Hub</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            71 live reports across 9 modules — real-time data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Live</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoadingKpis ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-zinc-100 animate-pulse dark:bg-zinc-900" />
          ))
        ) : (
          kpiData?.rows?.map((kpi: any) => {
            const Icon = getKpiIcon(kpi.title);
            const isUp = kpi.trend === 'up';
            const isCritical = kpi.critical;
            const positive = isUp && !isCritical || (!isUp && isCritical);
            return (
              <div
                key={kpi.title}
                className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{kpi.title}</p>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${isCritical ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                    <Icon className={`h-4 w-4 ${isCritical ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`} />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{kpi.value}</p>
                <div className={`mt-1.5 flex items-center gap-1 text-xs font-semibold ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                  {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  <span>{kpi.change}</span>
                </div>
                {/* Subtle background glow */}
                <div className={`pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 ${isCritical ? 'bg-red-500' : 'bg-blue-500'}`} />
              </div>
            );
          })
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sales Trend */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">30-Day Revenue Trend</h3>
            <Link href="/reports/sales" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Details <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="h-64 w-full">
            {isLoadingTrend ? (
              <div className="h-full w-full rounded-xl bg-zinc-100 animate-pulse dark:bg-zinc-800" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrendData?.rows || []}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 11 }} dx={-8} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e4e4e7', boxShadow: '0 8px 24px -4px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#09090b', fontWeight: 600 }}
                    labelStyle={{ color: '#71717a', marginBottom: '4px' }}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Medicines */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Top Selling Medicines</h3>
            <Link href="/reports/sales" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              More <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="h-64 w-full">
            {isLoadingMeds ? (
              <div className="h-full w-full rounded-xl bg-zinc-100 animate-pulse dark:bg-zinc-800" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMedsData?.rows?.slice(0, 7) || []} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#3f3f46', fontSize: 10, fontWeight: 500 }} width={90} />
                  <Tooltip cursor={{ fill: '#f4f4f5', opacity: 0.5 }} contentStyle={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e4e4e7' }} />
                  <Bar dataKey="qty" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Module Cards Grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">All Report Modules</h2>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">71 total reports</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MODULE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className={`group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${card.shadow} dark:border-zinc-800 dark:bg-zinc-900/50`}
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} shadow-lg shadow-black/10`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">
                    <BarChart3 className="h-3 w-3 text-zinc-500" />
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{card.count}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{card.title}</h3>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{card.desc}</p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-zinc-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Open reports
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
                {/* Gradient shine on hover */}
                <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${card.color} opacity-0 blur-2xl transition-opacity group-hover:opacity-10`} />
              </Link>
            );
          })}

          {/* Custom Builder card */}
          <Link
            href="/reports/custom"
            className="group relative overflow-hidden rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/30 dark:border-zinc-700 dark:bg-zinc-900/20 dark:hover:border-blue-700"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
                <Wand2 className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
              </div>
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">PRO</span>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold text-zinc-700 dark:text-zinc-300">Custom Report Builder</h3>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Build any report with filters, groupings, and custom columns</p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-zinc-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
              Open builder
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Alerts */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">Recent Alerts</h2>
        <UniversalDataTable data={alertsData || null} isLoading={isLoadingAlerts} rowsPerPage={5} />
      </div>
    </div>
  );
}
