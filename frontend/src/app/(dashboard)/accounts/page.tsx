"use client";

import { useDashboardStats, useForceRebuildAccounting } from '@/features/accounts/services/accounts.api';
import { useState } from 'react';
import {
  Zap, RefreshCw, TrendingUp, TrendingDown, Banknote,
  Building2, Users, CreditCard, BarChart3, ArrowUpRight,
} from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(v);

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number; icon: any; color: string; sub?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 bg-white dark:bg-zinc-950 shadow-sm transition-all hover:shadow-md ${color}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-zinc-100 truncate">{fmt(value)}</p>
          {sub && <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ml-3 shrink-0 ${color.replace('border-', 'bg-').replace('-200', '-50').replace('-800', '-900/30')}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function AccountsDashboardPage() {
  const { data: stats, isLoading, refetch } = useDashboardStats();
  const { mutate: forceRebuild, isPending: isRebuilding } = useForceRebuildAccounting();
  const [rebuildMsg, setRebuildMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleRebuild = () => {
    setRebuildMsg(null);
    forceRebuild(undefined, {
      onSuccess: (d) => {
        setRebuildMsg({ type: 'ok', text: `✅ Rebuilt: ${d.synced.sales} sales · ${d.synced.expenses} expenses · ${d.synced.payroll} payroll · ${d.accounts_recalculated} accounts recalculated.` });
        refetch();
      },
      onError: (e: any) => setRebuildMsg({ type: 'err', text: `❌ ${e?.response?.data?.detail || e.message}` }),
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  const profit = stats?.net_profit ?? 0;
  const isProfit = profit >= 0;

  return (
    <div className="space-y-6">
      {/* Actions row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Overview</h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Live balances from double-entry ledger</p>
        </div>
        <button
          onClick={handleRebuild}
          disabled={isRebuilding}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all shadow"
        >
          {isRebuilding ? <><RefreshCw className="h-4 w-4 animate-spin" />Rebuilding…</> : <><Zap className="h-4 w-4" />Force Rebuild</>}
        </button>
      </div>

      {rebuildMsg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${rebuildMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'}`}>
          {rebuildMsg.text}
        </div>
      )}

      {/* Net profit banner */}
      <div className={`rounded-2xl p-5 flex items-center justify-between gap-4 ${isProfit ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-rose-600'} shadow-md`}>
        <div>
          <p className="text-sm font-medium text-white/80">Net Profit / Loss</p>
          <p className="text-3xl font-bold text-white mt-1">{fmt(profit)}</p>
          <p className="text-xs text-white/70 mt-1">{isProfit ? 'Business is profitable ↑' : 'Operating at a loss ↓'}</p>
        </div>
        {isProfit ? <TrendingUp className="h-12 w-12 text-white/40" /> : <TrendingDown className="h-12 w-12 text-white/40" />}
      </div>

      {/* Primary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue"   value={stats?.total_revenue ?? 0}  icon={TrendingUp}    color="border-emerald-200 dark:border-emerald-800" sub="All approved credit entries" />
        <StatCard label="Total Expenses"  value={stats?.total_expenses ?? 0} icon={TrendingDown}  color="border-red-200 dark:border-red-800"         sub="All approved debit entries" />
        <StatCard label="Total Assets"    value={stats?.total_assets ?? 0}   icon={Building2}     color="border-blue-200 dark:border-blue-800"        sub="Cash + Bank + Inventory" />
        <StatCard label="A/R Receivable"  value={stats?.ar_balance ?? 0}     icon={Users}         color="border-violet-200 dark:border-violet-800"    sub="Outstanding customer balance" />
      </div>

      {/* Secondary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Cash in Hand"   value={stats?.cash_balance ?? 0} icon={Banknote}    color="border-emerald-200 dark:border-emerald-900" sub="Account 1000" />
        <StatCard label="Bank Balance"   value={stats?.bank_balance ?? 0} icon={CreditCard}  color="border-cyan-200 dark:border-cyan-900"       sub="Account 1010" />
        <StatCard label="A/P Payable"    value={stats?.ap_balance ?? 0}   icon={BarChart3}   color="border-orange-200 dark:border-orange-900"   sub="Outstanding to suppliers" />
      </div>
    </div>
  );
}
