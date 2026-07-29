'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';

// Validated chart/accent green — passes the dataviz palette validator against
// both the light (#fcfcfb) and dark (#0a0a0a) chart surfaces (lightness band,
// chroma floor, contrast >= 3:1). Kept as one hex so marks look identical in
// both themes rather than swapping shade per-theme.
export const CHART_GREEN = '#059669';
export const CHART_GREEN_SOFT = 'rgba(5, 150, 105, 0.12)'; // ~10-12% wash for area fills

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, delay, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

type Accent = 'emerald' | 'blue' | 'amber' | 'red' | 'zinc';

const ACCENT_STYLES: Record<Accent, { icon: string; badge: string; value: string }> = {
  emerald: { icon: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-50 dark:bg-emerald-500/10', value: 'text-emerald-700 dark:text-emerald-400' },
  blue:    { icon: 'text-blue-600 dark:text-blue-400',       badge: 'bg-blue-50 dark:bg-blue-500/10',       value: 'text-blue-700 dark:text-blue-400' },
  amber:   { icon: 'text-amber-600 dark:text-amber-400',     badge: 'bg-amber-50 dark:bg-amber-500/10',     value: 'text-amber-700 dark:text-amber-400' },
  red:     { icon: 'text-red-600 dark:text-red-400',         badge: 'bg-red-50 dark:bg-red-500/10',         value: 'text-red-700 dark:text-red-400' },
  zinc:    { icon: 'text-zinc-500 dark:text-zinc-400',       badge: 'bg-zinc-100 dark:bg-zinc-800',         value: 'text-zinc-900 dark:text-zinc-50' },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'zinc',
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: Accent;
  delay?: number;
}) {
  const s = ACCENT_STYLES[accent];
  return (
    <motion.div
      custom={delay}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      whileHover={{ y: -2 }}
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.badge}`}>
          <Icon className={`h-5 w-5 ${s.icon}`} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className={`text-xl font-bold tracking-tight ${s.value}`}>{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function ChartCard({
  title,
  icon: Icon,
  headerExtra,
  children,
  delay = 0,
  className = '',
}: {
  title: string;
  icon?: React.ElementType;
  headerExtra?: ReactNode;
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      custom={delay}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className={`rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-50">
          {Icon && <Icon className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />}
          {title}
        </h3>
        {headerExtra}
      </div>
      {children}
    </motion.div>
  );
}

export function ChartEmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-400 dark:text-zinc-600">
      <Icon className="h-8 w-8 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function ChartTooltipCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      {children}
    </div>
  );
}

// ── Animated count-up number ────────────────────────────────────────────────
export function CountUp({
  value,
  format,
  duration = 0.9,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const start = fromRef.current;
    const end = Number.isFinite(value) ? value : 0;
    const startTime = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const current = start + (end - start) * eased;
      setDisplay(current);
      fromRef.current = current;
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = end;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{format ? format(display) : Math.round(display).toLocaleString()}</>;
}

// ── Premium gradient stat card (animated, optionally clickable) ─────────────
export type Tone = 'emerald' | 'blue' | 'amber' | 'red' | 'violet' | 'cyan' | 'rose' | 'indigo';

const GRAD: Record<Tone, { grad: string; glow: string; text: string; ring: string }> = {
  emerald: { grad: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400', ring: 'hover:border-emerald-300 dark:hover:border-emerald-500/40' },
  blue:    { grad: 'from-blue-500 to-indigo-600',   glow: 'shadow-blue-500/30',    text: 'text-blue-600 dark:text-blue-400',       ring: 'hover:border-blue-300 dark:hover:border-blue-500/40' },
  amber:   { grad: 'from-amber-500 to-orange-600',  glow: 'shadow-amber-500/30',   text: 'text-amber-600 dark:text-amber-400',     ring: 'hover:border-amber-300 dark:hover:border-amber-500/40' },
  red:     { grad: 'from-rose-500 to-red-600',       glow: 'shadow-rose-500/30',    text: 'text-rose-600 dark:text-rose-400',       ring: 'hover:border-rose-300 dark:hover:border-rose-500/40' },
  violet:  { grad: 'from-violet-500 to-purple-600',  glow: 'shadow-violet-500/30',  text: 'text-violet-600 dark:text-violet-400',   ring: 'hover:border-violet-300 dark:hover:border-violet-500/40' },
  cyan:    { grad: 'from-cyan-500 to-teal-600',      glow: 'shadow-cyan-500/30',    text: 'text-cyan-600 dark:text-cyan-400',       ring: 'hover:border-cyan-300 dark:hover:border-cyan-500/40' },
  rose:    { grad: 'from-pink-500 to-rose-600',      glow: 'shadow-pink-500/30',    text: 'text-pink-600 dark:text-pink-400',       ring: 'hover:border-pink-300 dark:hover:border-pink-500/40' },
  indigo:  { grad: 'from-indigo-500 to-blue-600',    glow: 'shadow-indigo-500/30',  text: 'text-indigo-600 dark:text-indigo-400',   ring: 'hover:border-indigo-300 dark:hover:border-indigo-500/40' },
};

export function GradientStatCard({
  label,
  value,
  format,
  icon: Icon,
  tone = 'emerald',
  sub,
  delay = 0,
  onClick,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  icon: React.ElementType;
  tone?: Tone;
  sub?: string;
  delay?: number;
  onClick?: () => void;
}) {
  const g = GRAD[tone];
  const clickable = !!onClick;
  return (
    <motion.div
      custom={delay}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-950 ${g.ring} ${clickable ? 'cursor-pointer' : ''}`}
    >
      {/* Top gradient strip */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${g.grad} opacity-80 transition-opacity group-hover:opacity-100`} />
      {/* Soft corner glow */}
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${g.grad} opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.14]`} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{label}</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
            <CountUp value={value} format={format} />
          </p>
          {sub && <p className="mt-1 truncate text-[11px] font-medium text-zinc-400">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${g.grad} text-white shadow-lg ${g.glow} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {clickable && (
        <ArrowUpRight className="absolute bottom-4 right-4 h-4 w-4 translate-y-1 text-zinc-300 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 dark:text-zinc-600" />
      )}
    </motion.div>
  );
}

// Shared formatters
export const fmtRs = (n: number) => `Rs ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtInt = (n: number) => Math.round(n).toLocaleString();
