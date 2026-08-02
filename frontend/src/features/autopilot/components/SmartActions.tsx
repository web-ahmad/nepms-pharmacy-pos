'use client';

import { motion } from 'framer-motion';
import { Zap, Package, Clock, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useSmartActions, type SmartAction } from '../services/autopilot.api';

const iconMap: Record<string, React.ElementType> = { package: Package, clock: Clock, alert: AlertTriangle, trending: TrendingUp };
const prio: Record<SmartAction['priority'], string> = {
  high: 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10',
  medium: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10',
  low: 'border-l-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10',
};
const prioBadge: Record<SmartAction['priority'], string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  low: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
};

export default function SmartActions() {
  const { data, isLoading } = useSmartActions();
  const actions = data ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white"><Zap size={18} /></div>
        <div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Smart Actions</h3>
          <p className="text-xs text-zinc-400">Aap ke live data se banaye gaye zaroori kaam</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />)}</div>
      ) : actions.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"><Zap size={18} /></div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Sab theek hai — abhi koi kaam zaroori nahi.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {actions.map((a, i) => {
            const Icon = iconMap[a.icon] || Zap;
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className={`flex items-center justify-between gap-3 rounded-xl border border-l-4 border-zinc-100 p-3 dark:border-zinc-800 ${prio[a.priority]}`}>
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-600 shadow-sm dark:bg-zinc-800 dark:text-zinc-300"><Icon size={16} /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">{a.title}</p>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${prioBadge[a.priority]}`}>{a.priority === 'high' ? 'Zaroori' : a.priority === 'medium' ? 'Darmiyana' : 'Aam'}</span>
                    </div>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{a.detail}</p>
                  </div>
                </div>
                <Link href={a.href} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
                  {a.cta} <ArrowRight size={12} />
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
