'use client';

import { motion } from 'framer-motion';
import { Radar, AlertTriangle, Clock, CheckCircle2, ArrowRight, Zap, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useStockoutRadar, useAutoPO, type StockoutItem } from '../services/autopilot.api';

const meta: Record<StockoutItem['urgency'], { label: string; bar: string; chip: string; icon: React.ElementType }> = {
  critical: { label: 'Foran', bar: 'from-red-500 to-rose-600', chip: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800', icon: AlertTriangle },
  watch:    { label: 'Nazar rakhein', bar: 'from-amber-400 to-orange-500', chip: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800', icon: Clock },
  ok:       { label: 'Theek',  bar: 'from-emerald-400 to-green-600', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800', icon: CheckCircle2 },
};

export default function StockoutRadar() {
  const { data, isLoading } = useStockoutRadar();
  const autoPO = useAutoPO();
  const rows = (data ?? []).slice(0, 12);
  const maxDays = Math.max(30, ...rows.map((r) => r.days_to_stockout || 0));
  const hasCritical = (data ?? []).some((r) => r.urgency === 'critical' || r.urgency === 'watch');

  const runAutoPO = () => {
    toast.promise(autoPO.mutateAsync(true), {
      loading: 'Draft PO ban rahe hain…',
      success: (res) => res.message || 'Draft PO ban gaye.',
      error: 'PO banane me masla hua.',
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
            <Radar size={18} />
            <span className="absolute inset-0 rounded-xl bg-indigo-400/40 blur-md" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Stock Khatam Hone ka Radar</h3>
            <p className="text-xs text-zinc-400">AI batata hai konsi dawa kam ho rahi hai — aur kis din khatam hogi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasCritical && (
            <button onClick={runAutoPO} disabled={autoPO.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-60"
              title="Critical items ke liye draft Purchase Order khud bana dein">
              {autoPO.isPending ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />} Auto PO
            </button>
          )}
          <Link href="/inventory/low-stock" className="hidden items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400 sm:flex">
            Kam stock <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />)}</div>
      ) : rows.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-center text-sm text-zinc-400">Abhi itni sales nahi hui ke stock-out predict ho sake.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const m = meta[r.urgency];
            const Icon = m.icon;
            const pct = Math.max(4, Math.min(100, (r.days_to_stockout / maxDays) * 100));
            return (
              <motion.div key={r.medicine + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="group rounded-xl border border-zinc-100 p-3 transition-colors hover:border-indigo-200 dark:border-zinc-800 dark:hover:border-indigo-900/50">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${m.chip}`}><Icon size={11} /> {m.label}</span>
                    <span className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">{r.medicine}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-bold tabular-nums ${r.urgency === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-zinc-700 dark:text-zinc-200'}`}>{r.days_to_stockout} din</p>
                    <p className="text-[10px] text-zinc-400">khatam ~{format(new Date(r.stockout_date), 'd MMM')}</p>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <motion.div className={`h-full rounded-full bg-gradient-to-r ${m.bar}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.04 }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Stock: <b className="text-zinc-600 dark:text-zinc-300">{r.current_stock}</b> · {r.velocity_per_day}/din</span>
                  {r.suggested_order_qty > 0 && <span className="font-semibold text-indigo-600 dark:text-indigo-400">~{r.suggested_order_qty} mangwayein</span>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
