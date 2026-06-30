"use client";

import { useProfitLoss, useBalanceSheet } from '@/features/accounts/services/accounts.api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AccountsDashboardPage() {
  const { data: plData, isLoading: plLoading } = useProfitLoss();
  const { data: bsData, isLoading: bsLoading } = useBalanceSheet();

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(val);

  if (plLoading || bsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  // Find specific accounts for quick view
  const cash = bsData?.assets.find(a => a.account_name === 'Cash')?.amount || 0;
  const bank = bsData?.assets.find(a => a.account_name === 'Bank')?.amount || 0;
  const receivables = bsData?.assets.find(a => a.account_name === 'Accounts Receivable')?.amount || 0;
  const payables = bsData?.liabilities.find(a => a.account_name === 'Accounts Payable')?.amount || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Total Revenue</p>
          <p className="text-2xl font-bold mt-2 text-zinc-900 dark:text-zinc-100">{formatCurrency(plData?.total_revenue || 0)}</p>
        </div>
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Total Expenses</p>
          <p className="text-2xl font-bold mt-2 text-red-600 dark:text-red-400">{formatCurrency(plData?.total_expenses || 0)}</p>
        </div>
        <div className={`p-6 rounded-xl border shadow-sm ${(plData?.net_profit || 0) >= 0 ? 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/50' : 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50'}`}>
          <p className={`text-sm font-medium ${(plData?.net_profit || 0) >= 0 ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>Net Profit</p>
          <p className={`text-2xl font-bold mt-2 ${(plData?.net_profit || 0) >= 0 ? 'text-green-700 dark:text-green-500' : 'text-red-700 dark:text-red-500'}`}>{formatCurrency(plData?.net_profit || 0)}</p>
        </div>
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Total Assets</p>
          <p className="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-400">{formatCurrency(bsData?.total_assets || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Cash Balance</p>
          <p className="text-xl font-mono mt-2">{formatCurrency(cash)}</p>
        </div>
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Bank Balance</p>
          <p className="text-xl font-mono mt-2">{formatCurrency(bank)}</p>
        </div>
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">A/R (Owed to Us)</p>
          <p className="text-xl font-mono mt-2 text-green-600 dark:text-green-400">{formatCurrency(receivables)}</p>
        </div>
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">A/P (Owed by Us)</p>
          <p className="text-xl font-mono mt-2 text-red-600 dark:text-red-400">{formatCurrency(payables)}</p>
        </div>
      </div>
      
    </div>
  );
}
