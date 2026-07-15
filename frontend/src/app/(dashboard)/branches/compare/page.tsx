'use client';
// app/(dashboard)/branches/compare/page.tsx — Branch Comparison Page

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, GitCompare, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useBranchComparison } from '@/features/branches/services/branch.api';
import { BranchHealthScore } from '@/features/branches/components/BranchHealthScore';
import type { BranchStats } from '@/features/branches/types/branch';

type MetricKey = keyof Pick<
  BranchStats,
  'total_sales' | 'monthly_sales' | 'daily_sales' | 'inventory_value' |
  'staff_count' | 'total_customers' | 'low_stock_count' | 'expiry_count' | 'health_score'
>;

const METRICS: { key: MetricKey; label: string; prefix?: string; higherIsBetter: boolean }[] = [
  { key: 'health_score',    label: 'Health Score',     higherIsBetter: true },
  { key: 'total_sales',     label: 'Total Sales',      prefix: 'Rs ', higherIsBetter: true },
  { key: 'monthly_sales',   label: 'Monthly Sales',    prefix: 'Rs ', higherIsBetter: true },
  { key: 'daily_sales',     label: 'Daily Sales',      prefix: 'Rs ', higherIsBetter: true },
  { key: 'inventory_value', label: 'Inventory Value',  prefix: 'Rs ', higherIsBetter: true },
  { key: 'staff_count',     label: 'Staff Count',                     higherIsBetter: true },
  { key: 'total_customers', label: 'Total Customers',                 higherIsBetter: true },
  { key: 'low_stock_count', label: 'Low Stock Items',                 higherIsBetter: false },
  { key: 'expiry_count',    label: 'Expiring Items',                  higherIsBetter: false },
];

function formatVal(val: number | undefined, prefix = ''): string {
  if (val == null) return '—';
  if (val >= 1_000_000) return `${prefix}${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000)     return `${prefix}${(val / 1_000).toFixed(1)}K`;
  return `${prefix}${val.toLocaleString()}`;
}

export default function BranchComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ids = (searchParams.get('ids') || '').split(',').filter(Boolean);
  const { mutate: compare, data: result, isPending } = useBranchComparison();

  useEffect(() => {
    if (ids.length >= 2) {
      compare({ branch_ids: ids, period: 'monthly' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ids.length || ids.length < 2) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <GitCompare size={40} className="text-zinc-300" />
        <p className="text-sm font-medium text-zinc-500">Select at least 2 branches to compare.</p>
        <button onClick={() => router.push('/branches')} className="px-4 py-2 text-sm rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition">
          Back to Branches
        </button>
      </div>
    );
  }

  const branches = result?.branches ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-6xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/branches')}
          className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Branch Comparison</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Comparing {ids.length} branches — monthly period</p>
        </div>
      </div>

      {isPending && (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-indigo-600" />
            <p className="text-sm text-zinc-500">Fetching comparison data…</p>
          </div>
        </div>
      )}

      {!isPending && branches.length >= 2 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
          {/* Branch headers */}
          <div className="grid" style={{ gridTemplateColumns: `200px repeat(${branches.length}, 1fr)` }}>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 border-b border-zinc-200 dark:border-zinc-800" />
            {branches.map((b) => (
              <div key={b.branch_id} className="p-4 border-b border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-center">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{b.branch_name}</p>
                <BranchHealthScore score={b.health_score} size={40} showLabel={false} />
              </div>
            ))}
          </div>

          {/* Metric rows */}
          {METRICS.map(({ key, label, prefix, higherIsBetter }, i) => {
            const values = branches.map((b) => b[key] as number ?? 0);
            const max = Math.max(...values);
            const min = Math.min(...values);

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                className={`grid ${i % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50/50 dark:bg-zinc-800/20'}`}
                style={{ gridTemplateColumns: `200px repeat(${branches.length}, 1fr)` }}
              >
                <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
                </div>
                {branches.map((b) => {
                  const val = b[key] as number ?? 0;
                  const isBest  = val === (higherIsBetter ? max : min);
                  const isWorst = val === (higherIsBetter ? min : max);
                  const allSame = max === min;

                  return (
                    <div
                      key={b.branch_id}
                      className={`px-4 py-3 border-b border-l border-zinc-100 dark:border-zinc-800 flex items-center justify-center gap-1.5 ${
                        !allSame && isBest  ? 'text-emerald-600 dark:text-emerald-400' :
                        !allSame && isWorst ? 'text-red-500 dark:text-red-400' :
                        'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {!allSame && isBest  && <TrendingUp  size={13} />}
                      {!allSame && isWorst && <TrendingDown size={13} />}
                      {allSame && <Minus size={13} className="text-zinc-300" />}
                      <span className="text-sm font-semibold tabular-nums">
                        {formatVal(val, prefix)}
                      </span>
                    </div>
                  );
                })}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
