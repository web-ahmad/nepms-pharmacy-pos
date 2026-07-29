'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useExpiryAlerts, useLowStockAlerts } from '../services/dashboard.api';
import { AlertTriangle, AlertCircle, CheckCircle2, PackageCheck, ChevronRight } from 'lucide-react';
import { ChartCard } from './DashboardUI';

export default function AlertsTable() {
  const router = useRouter();
  const { data: expiryAlerts, isLoading: expiryLoading } = useExpiryAlerts();
  const { data: lowStockAlerts, isLoading: lowStockLoading } = useLowStockAlerts();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ── EXPIRY ALERTS ─────────────────────────────────────────────── */}
      <ChartCard
        title="Expiry Alerts"
        icon={AlertCircle}
        delay={0.2}
        headerExtra={
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            {expiryAlerts?.length || 0} batches &le; 90 days
          </span>
        }
      >
        {expiryLoading ? (
          <div className="h-48 animate-pulse rounded-lg bg-zinc-50 dark:bg-zinc-900" />
        ) : expiryAlerts?.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            <span className="text-sm text-zinc-500">No expiring batches found.</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {expiryAlerts?.map((alert: any, idx: number) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.03 }}
                onClick={() => router.push('/inventory')}
                className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 text-left transition-all hover:border-amber-200 hover:bg-amber-50/50 dark:hover:border-amber-500/20 dark:hover:bg-amber-500/5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{alert.medicine_name}</p>
                  <p className="truncate text-[11px] text-zinc-400">
                    Batch <span className="font-mono">{alert.batch_number}</span> • Exp{' '}
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{alert.expiry_date}</span>
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-zinc-100 px-2 py-1 font-mono text-[11px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {alert.remaining_quantity} left
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-amber-500 dark:text-zinc-700" />
              </motion.button>
            ))}
          </div>
        )}
      </ChartCard>

      {/* ── LOW STOCK ALERTS ──────────────────────────────────────────── */}
      <ChartCard
        title="Low Stock Alerts"
        icon={AlertTriangle}
        delay={0.25}
        headerExtra={
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-400">
            {lowStockAlerts?.length || 0} items low
          </span>
        }
      >
        {lowStockLoading ? (
          <div className="h-48 animate-pulse rounded-lg bg-zinc-50 dark:bg-zinc-900" />
        ) : lowStockAlerts?.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <PackageCheck className="h-7 w-7 text-emerald-500" />
            <span className="text-sm text-zinc-500">All stock levels are optimal.</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {lowStockAlerts?.map((alert: any, idx: number) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.03 }}
                onClick={() => router.push('/inventory/low-stock')}
                className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 text-left transition-all hover:border-red-200 hover:bg-red-50/50 dark:hover:border-red-500/20 dark:hover:bg-red-500/5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{alert.medicine_name}</p>
                  <p className="truncate text-[11px] text-zinc-400">
                    Current <span className="font-bold text-red-600 dark:text-red-400">{alert.current_quantity}</span> • Min{' '}
                    {alert.minimum_level}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 font-mono text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  +{alert.suggested_reorder}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-red-500 dark:text-zinc-700" />
              </motion.button>
            ))}
          </div>
        )}
      </ChartCard>
    </div>
  );
}
