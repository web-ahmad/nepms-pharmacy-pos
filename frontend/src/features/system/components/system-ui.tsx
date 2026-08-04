'use client';
// Animated building blocks for the System module.

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, animate } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

/** Counts up to `value` once the element scrolls into view. */
export function AnimatedNumber({
  value, decimals = 0, suffix = '', prefix = '',
}: { value: number; decimals?: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{display.toLocaleString(undefined, {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals,
      })}{suffix}
    </span>
  );
}

const TONES = {
  emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/25',
  blue:    'from-blue-500 to-indigo-600 shadow-blue-500/25',
  violet:  'from-violet-500 to-purple-600 shadow-violet-500/25',
  amber:   'from-amber-500 to-orange-600 shadow-amber-500/25',
  rose:    'from-rose-500 to-red-600 shadow-rose-500/25',
  cyan:    'from-cyan-500 to-sky-600 shadow-cyan-500/25',
} as const;
export type Tone = keyof typeof TONES;

/** KPI tile with a shimmer sweep on hover and a counting value. */
export function MetricCard({
  icon: Icon, label, value, decimals = 0, suffix = '', hint, tone = 'blue', index = 0, isLoading,
}: {
  icon: LucideIcon; label: string; value: number; decimals?: number; suffix?: string;
  hint?: string; tone?: Tone; index?: number; isLoading?: boolean;
}) {
  if (isLoading) {
    return <div className="h-[104px] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/[0.04] to-transparent transition-transform duration-700 group-hover:translate-x-full dark:via-white/[0.06]" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-zinc-900 dark:text-zinc-50">
            <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
          </p>
          {hint && <p className="mt-1 truncate text-xs text-zinc-400">{hint}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg ${TONES[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
    </motion.div>
  );
}

/** Animated horizontal usage bar. */
export function UsageBar({ percent, tone = 'blue' }: { percent: number; tone?: Tone }) {
  const pct = Math.max(0, Math.min(100, percent));
  const danger = pct >= 90 ? 'rose' : pct >= 75 ? 'amber' : tone;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className={`h-full rounded-full bg-gradient-to-r ${TONES[danger as Tone]}`}
      />
    </div>
  );
}

export function Panel({
  title, subtitle, icon: Icon, action, children, index = 0,
}: {
  title: string; subtitle?: string; icon?: LucideIcon;
  action?: React.ReactNode; children: React.ReactNode; index?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, ease: [0.16, 1, 0.3, 1], duration: 0.45 }}
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <Icon size={17} />
            </div>
          )}
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
            {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </motion.section>
  );
}

/** Pulsing status dot + label. */
export function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
      ok
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-300 dark:ring-emerald-800'
        : 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/25 dark:text-rose-300 dark:ring-rose-800'
    }`}>
      <span className="relative flex h-2 w-2">
        {ok && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      </span>
      {label}
    </span>
  );
}

/** Primary action button with press/hover motion and a busy state. */
export function ActionButton({
  icon: Icon, label, onClick, busy, danger, disabled, subtle,
}: {
  icon: LucideIcon; label: string; onClick: () => void;
  busy?: boolean; danger?: boolean; disabled?: boolean; subtle?: boolean;
}) {
  const base = danger
    ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-rose-500/25'
    : subtle
      ? 'border border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'
      : 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-indigo-500/25';
  return (
    <motion.button
      onClick={onClick}
      disabled={busy || disabled}
      whileHover={busy || disabled ? undefined : { scale: 1.03, y: -1 }}
      whileTap={busy || disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg transition-shadow disabled:cursor-not-allowed disabled:opacity-60 ${base}`}
    >
      <Icon size={16} className={busy ? 'animate-spin' : ''} />
      {label}
    </motion.button>
  );
}

export const fmtBytesMb = (mb: number) =>
  mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;

export const fmtUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
};

export const fmtAgo = (hours: number | null) => {
  if (hours == null) return 'Never';
  if (hours < 1) return `${Math.round(hours * 60)} min ago`;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};
