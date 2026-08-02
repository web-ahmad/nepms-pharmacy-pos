'use client';

import { motion } from 'framer-motion';
import { Globe2, Flame, CalendarRange, PackagePlus, ListChecks, RefreshCw, Cpu, TrendingUp } from 'lucide-react';
import { useMarketAnalysis, type MarketMedicine } from '../services/autopilot.api';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

const demandChip = (d: MarketMedicine['demand']) =>
  d === 'high'
    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';

export default function MarketAnalysis() {
  const { data, isLoading, isFetching, refetch } = useMarketAnalysis();

  return (
    <section className="space-y-4">
      {/* Banner */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-5 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <motion.div animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25"><Globe2 className="h-6 w-6" /></motion.div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Market Analysis — Pakistan</h2>
              <p className="text-sm text-white/85">Market me konsi dawa zyada bik rahi hai &amp; aap ko kya karna hoga.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25"><CalendarRange size={13} /> {data.season}</span>}
            {data && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25"><Cpu size={13} /> {data.source === 'gemini' ? 'Gemini AI' : 'AI Engine'}</span>}
            <button onClick={() => refetch()} disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/25 transition hover:bg-white/25 disabled:opacity-60">
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Dobara
            </button>
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />)}</div>
      ) : !data ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">Market data abhi available nahi.</div>
      ) : (
        <>
          {/* Summary */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/10">
            <p className="flex items-start gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200"><TrendingUp size={16} className="mt-0.5 shrink-0 text-emerald-500" /> {data.summary}</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {/* Top market medicines */}
            <motion.div variants={container} initial="hidden" animate="show"
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"><Flame size={16} /></div>
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Market me Top Bikne Wali Dawaiyan</h4>
              </div>
              <div className="space-y-2">
                {data.top_market_medicines?.map((m, i) => (
                  <motion.div key={i} variants={item} className="rounded-lg border border-zinc-100 p-2.5 dark:border-zinc-800">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">{m.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${demandChip(m.demand)}`}>{m.demand === 'high' ? 'Zyada demand' : 'Darmiyani'}</span>
                    </div>
                    <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{m.category}</p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{m.reason}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <div className="space-y-3">
              {/* Stock gap */}
              <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-900/40 dark:bg-zinc-900">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"><PackagePlus size={16} /></div>
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Aap ke Stock ka Gap (mangwayein)</h4>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.stock_gap?.length ? data.stock_gap.map((g, i) => (
                    <span key={i} className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/15 dark:text-amber-300 dark:ring-amber-800">{g}</span>
                  )) : <p className="text-sm text-zinc-400">Aap ka stock market ke hisaab se theek hai. 👍</p>}
                </div>
              </div>

              {/* Seasonal demand */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400"><CalendarRange size={16} /></div>
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Is Mausam ki Demand</h4>
                </div>
                <div className="space-y-1.5">
                  {data.seasonal_demand?.map((s, i) => (
                    <div key={i} className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{s.category}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{s.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action plan */}
          <motion.div variants={container} initial="hidden" animate="show"
            className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm dark:border-indigo-900/40 dark:bg-zinc-900">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"><ListChecks size={16} /></div>
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Kya Karna Hoga (Action Plan)</h4>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.action_plan?.map((a, i) => (
                <motion.div key={i} variants={item} className="rounded-lg bg-indigo-50/60 p-3 dark:bg-indigo-900/15">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">{i + 1}</span>
                    {a.title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{a.detail}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </section>
  );
}
