'use client';

import { motion } from 'framer-motion';
import { Sparkles, Lightbulb, ShieldAlert, Rocket, ListChecks, RefreshCw, Cpu } from 'lucide-react';
import { useAutopilotInsights, type AIRecommendation } from '../services/autopilot.api';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

function Col({ title, icon: Icon, tint, children }: { title: string; icon: React.ElementType; tint: string; children: React.ReactNode }) {
  return (
    <motion.div variants={item} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tint}`}><Icon size={16} /></div>
        <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{title}</h4>
      </div>
      <div className="space-y-2">{children}</div>
    </motion.div>
  );
}

export default function AICopilotPanel() {
  const { data, isLoading, isFetching, refetch } = useAutopilotInsights();
  const ai = data?.ai;

  return (
    <section className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 p-5 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ repeat: Infinity, duration: 4 }}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25"><Sparkles className="h-6 w-6" /></motion.div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">AI Business Copilot</h2>
              <p className="text-sm text-white/85">Aap ki pharmacy ke liye live insights, predictions aur mashwaray.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ai && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25"><Cpu size={13} /> {ai.source === 'gemini' ? 'Gemini AI' : 'AI Engine'}</span>}
            <button onClick={() => refetch()} disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/25 transition hover:bg-white/25 disabled:opacity-60">
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Dobara banayein
            </button>
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />)}</div>
      ) : !ai ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">Abhi koi insight nahi.</div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-900/10">
            <p className="flex items-start gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200"><Sparkles size={16} className="mt-0.5 shrink-0 text-violet-500" /> {ai.summary}</p>
          </motion.div>
          <motion.div variants={container} initial="hidden" animate="show" className="grid gap-3 lg:grid-cols-2">
            <Col title="Ahem Baatein" icon={Lightbulb} tint="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              {ai.insights?.map((t, i) => <p key={i} className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">{t}</p>)}
            </Col>
            <Col title="Mashwaray" icon={ListChecks} tint="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              {ai.recommendations?.map((r, i) => {
                const rec = typeof r === 'string' ? { title: r, detail: '' } as AIRecommendation : r;
                return (<div key={i} className="rounded-lg bg-indigo-50/60 px-3 py-2 dark:bg-indigo-900/15">
                  <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">{rec.title}</p>
                  {rec.detail && <p className="text-xs text-zinc-600 dark:text-zinc-400">{rec.detail}</p>}
                </div>);
              })}
            </Col>
            <Col title="Khatray / Alerts" icon={ShieldAlert} tint="bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
              {ai.risks?.length ? ai.risks.map((t, i) => <p key={i} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/15 dark:text-red-300">{t}</p>) : <p className="px-1 text-sm text-zinc-400">Filhaal koi bara khatra nahi.</p>}
            </Col>
            <Col title="Faiday ke Mauqay" icon={Rocket} tint="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              {ai.opportunities?.map((t, i) => <p key={i} className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/15 dark:text-emerald-300">{t}</p>)}
            </Col>
          </motion.div>
        </>
      )}
    </section>
  );
}
