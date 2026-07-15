"use client";

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useDashboardStats } from '../services/accounts.api';
import { 
  TrendingUp, TrendingDown, DollarSign, Activity, 
  Wallet, Landmark, CreditCard, Receipt
} from 'lucide-react';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

export function AccountsDashboard() {
  const { data, isLoading, error } = useDashboardStats();

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
      
      {/* Chart Section Placeholder */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <div className="rounded-2xl border border-gray-200/50 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/50">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue vs Expenses</h3>
           <div className="mt-4 flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
             <p className="text-sm text-gray-500 dark:text-gray-400">Detailed charting available in analytics module.</p>
           </div>
        </div>
        
        <div className="rounded-2xl border border-gray-200/50 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/50">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cash Flow Trend</h3>
           <div className="mt-4 flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
             <p className="text-sm text-gray-500 dark:text-gray-400">Detailed charting available in analytics module.</p>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
