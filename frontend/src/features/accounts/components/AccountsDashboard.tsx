"use client";

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useDashboardStats, useFinancialTrends } from '../services/accounts.api';
import {
  TrendingUp, TrendingDown, DollarSign, Activity,
  Wallet, Landmark, CreditCard, Receipt, BarChart3, LineChart as LineChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area,
} from 'recharts';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

// Compact tooltip for the financial charts
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <p className="mb-1 font-semibold text-zinc-700 dark:text-zinc-200">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-1.5" style={{ color: p.color }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: Rs {Number(p.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  );
}

export function AccountsDashboard() {
  const { data, isLoading, error } = useDashboardStats();
  const { data: trends, isLoading: trendsLoading } = useFinancialTrends(6);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-500">
        Failed to load dashboard statistics.
      </div>
    );
  }

  const kpis = [
    {
      title: "Net Profit",
      value: data.net_profit,
      icon: <TrendingUp className="h-6 w-6" />,
      color: "from-emerald-500 to-teal-400",
      bgLight: "bg-emerald-500/10",
      textClass: "text-emerald-500",
      trend: "+12.5%",
      isPositive: true,
    },
    {
      title: "Total Revenue",
      value: data.total_revenue,
      icon: <DollarSign className="h-6 w-6" />,
      color: "from-blue-500 to-indigo-500",
      bgLight: "bg-blue-500/10",
      textClass: "text-blue-500",
      trend: "+8.2%",
      isPositive: true,
    },
    {
      title: "Total Expenses",
      value: data.total_expenses,
      icon: <Activity className="h-6 w-6" />,
      color: "from-rose-500 to-pink-500",
      bgLight: "bg-rose-500/10",
      textClass: "text-rose-500",
      trend: "-2.1%",
      isPositive: false,
    },
    {
      title: "Total Assets",
      value: data.total_assets,
      icon: <Landmark className="h-6 w-6" />,
      color: "from-purple-500 to-indigo-400",
      bgLight: "bg-purple-500/10",
      textClass: "text-purple-500",
      trend: "+5.4%",
      isPositive: true,
    },
    {
      title: "Cash Balance",
      value: data.cash_balance,
      icon: <Wallet className="h-6 w-6" />,
      color: "from-amber-500 to-orange-400",
      bgLight: "bg-amber-500/10",
      textClass: "text-amber-500",
      trend: "+1.2%",
      isPositive: true,
    },
    {
      title: "Bank Balance",
      value: data.bank_balance,
      icon: <Landmark className="h-6 w-6" />,
      color: "from-cyan-500 to-blue-400",
      bgLight: "bg-cyan-500/10",
      textClass: "text-cyan-500",
      trend: "+3.8%",
      isPositive: true,
    },
    {
      title: "Accounts Receivable",
      value: data.ar_balance,
      icon: <Receipt className="h-6 w-6" />,
      color: "from-sky-500 to-cyan-400",
      bgLight: "bg-sky-500/10",
      textClass: "text-sky-500",
      trend: "-1.5%",
      isPositive: false,
    },
    {
      title: "Accounts Payable",
      value: data.ap_balance,
      icon: <CreditCard className="h-6 w-6" />,
      color: "from-orange-500 to-red-400",
      bgLight: "bg-orange-500/10",
      textClass: "text-orange-500",
      trend: "-4.2%",
      isPositive: true,
    }
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Financial Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Real-time overview of enterprise financial health and performance.
          </p>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {kpis.map((kpi, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -4 }}
            className="group relative overflow-hidden rounded-2xl border border-gray-200/50 bg-white/70 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:shadow-2xl dark:border-gray-700/50 dark:bg-gray-900/50"
          >
            {/* Background Gradient Blob */}
            <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${kpi.color} opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40`} />
            
            <div className="relative z-10 flex items-center justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${kpi.bgLight} ${kpi.textClass}`}>
                {kpi.icon}
              </div>
              <div className={`flex items-center space-x-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                kpi.isPositive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
              }`}>
                {kpi.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{kpi.trend}</span>
              </div>
            </div>
            
            <div className="relative z-10 mt-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {kpi.title}
              </h3>
              <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {formatCurrency(kpi.value)}
              </p>
            </div>
            
            {/* Bottom Glow line on hover */}
            <div className={`absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r ${kpi.color} transition-all duration-300 group-hover:w-full`} />
          </motion.div>
        ))}
      </motion.div>
      
      {/* Charts — real data (last 6 months, branch-scoped) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        {/* Revenue vs Expenses */}
        <div className="rounded-2xl border border-gray-200/50 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/50">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <BarChart3 className="h-5 w-5 text-indigo-500" /> Revenue vs Expenses
          </h3>
          <p className="mb-3 text-xs text-gray-400">Last 6 months</p>
          <div className="h-64">
            {trendsLoading ? (
              <div className="h-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            ) : !trends || trends.every((t) => !t.revenue && !t.expenses) ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-400 dark:border-gray-700">
                No financial activity yet for this branch.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={26} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Net Cash Flow Trend */}
        <div className="rounded-2xl border border-gray-200/50 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/50">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <LineChartIcon className="h-5 w-5 text-emerald-500" /> Cash Flow Trend
          </h3>
          <p className="mb-3 text-xs text-gray-400">Net (revenue − expenses) per month</p>
          <div className="h-64">
            {trendsLoading ? (
              <div className="h-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            ) : !trends || trends.every((t) => !t.net) ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-400 dark:border-gray-700">
                No cash flow yet for this branch.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netFlowFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="net" name="Net Cash Flow" stroke="#10b981" strokeWidth={2} fill="url(#netFlowFill)" dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
