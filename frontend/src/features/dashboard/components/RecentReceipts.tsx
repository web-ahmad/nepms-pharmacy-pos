'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useSalesHistory } from '@/features/sales/services/sales.api';
import { Receipt, ChevronRight, ArrowRight, ScrollText } from 'lucide-react';
import { ChartCard } from './DashboardUI';

// Compact status pill for the receipts list
function MiniStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    'Partially Returned': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
    'Returned': 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
    'Voided': 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    'Held': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    'Partial': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    'Partially Paid': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  };
  const cls = map[status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${cls}`}>{status}</span>;
}

export default function RecentReceipts() {
  const router = useRouter();
  const { data, isLoading } = useSalesHistory({ page: 1, limit: 8 });

  const receipts = data?.items
    ? [...data.items].sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()).slice(0, 7)
    : [];

  return (
    <ChartCard
      title="Recent Receipts"
      icon={Receipt}
      delay={0.18}
      headerExtra={
        <button
          onClick={() => router.push('/sales')}
          className="group inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-[var(--brand)]/10"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
          ))}
        </div>
      ) : receipts.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2 text-zinc-400 dark:text-zinc-600">
          <ScrollText className="h-8 w-8 opacity-50" />
          <p className="text-sm">No receipts yet for this branch.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {receipts.map((sale, idx) => (
            <motion.button
              key={sale.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.28, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => router.push(`/sales?view_id=${sale.id}`)}
              className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 text-left transition-all hover:border-emerald-200 hover:bg-emerald-50/50 dark:hover:border-emerald-500/20 dark:hover:bg-[var(--brand)]/5"
            >
              {/* Icon chip */}
              <div className="brand-surface-br flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm transition-transform group-hover:scale-105">
                <Receipt className="h-4 w-4" />
              </div>

              {/* Invoice + time */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[13px] font-bold text-zinc-900 group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-400">
                  {sale.invoice_number}
                </p>
                <p className="truncate text-[11px] text-zinc-400">
                  {new Date(sale.sale_date.endsWith('Z') ? sale.sale_date : sale.sale_date + 'Z').toLocaleString('en-PK', {
                    timeZone: 'Asia/Karachi', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                  {sale.cashier_name ? ` • ${sale.cashier_name}` : ''}
                </p>
              </div>

              {/* Amount + status */}
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-mono text-[13px] font-extrabold text-zinc-900 dark:text-zinc-50">
                  Rs {sale.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <MiniStatus status={sale.status} />
              </div>

              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-emerald-500 dark:text-zinc-700" />
            </motion.button>
          ))}
        </div>
      )}
    </ChartCard>
  );
}
