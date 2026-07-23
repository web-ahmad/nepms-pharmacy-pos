'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

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
          <Icon className={`h-4.5 w-4.5 ${s.icon}`} />
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
