'use client';

import { motion } from 'framer-motion';
import { CalendarClock, TrendingDown } from 'lucide-react';
import { useExpiryForecast, type ExpiryItem } from '../services/autopilot.api';

const rs = (n: number) => `Rs ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
const riskCls: Record<ExpiryItem['risk'], string> = {
  high: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800',
  low: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800',
};

export default function ExpiryForecastCard() {
  const { data, isLoading } = useExpiryForecast();

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white"><CalendarClock size={18} /></div>
        <div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Expiry &amp; Nuqsan ka Andaza</h3>
          <p className="text-xs text-zinc-400">90 din me expire hone wali batches aur na-bikne wali value</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">Khatre me value</p>
              <p className="text-xl font-bold text-zinc-800 dark:text-zinc-100">{rs(data?.total_value_at_risk || 0)}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-3 dark:bg-red-900/15">
              <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-red-500"><TrendingDown size={12} /> Andaza-e-nuqsan</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{rs(data?.predicted_waste_value || 0)}</p>
            </div>
          </div>
          {!data?.items?.length ? (
            <div className="flex h-24 items-center justify-center text-center text-sm text-zinc-400">90 din me koi batch expire nahi ho rahi. </div>
          ) : (
            <div className="max-h-56 space-y-1.5 overflow-y-auto">
              {data.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{it.medicine}</p>
                    <p className="text-[11px] text-zinc-400">Batch {it.batch} · {it.qty} units · {it.days_left} din baqi</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${riskCls[it.risk]}`}>{rs(it.value)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
