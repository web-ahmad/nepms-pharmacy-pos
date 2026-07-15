'use client';
// features/branches/components/BranchKPICards.tsx
// Animated KPI summary cards for the branch list page header.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, CheckCircle2, AlertTriangle, TrendingUp, Clock, Wrench,
} from 'lucide-react';
import type { BranchDashboardSummary } from '../types/branch';

function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span>{display}</span>;
}

interface CardData {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}

interface Props {
  summary?: BranchDashboardSummary;
  isLoading?: boolean;
}

export function BranchKPICards({ summary, isLoading }: Props) {
  const cards: CardData[] = [
    {
      label:  'Total Branches',
      value:  summary?.total_branches ?? 0,
      icon:   Building2,
      color:  'text-indigo-600 dark:text-indigo-400',
      bg:     'bg-indigo-50 dark:bg-indigo-900/20',
      border: 'border-indigo-100 dark:border-indigo-800',
    },
    {
      label:  'Active',
      value:  summary?.active_branches ?? 0,
      icon:   CheckCircle2,
      color:  'text-emerald-600 dark:text-emerald-400',
      bg:     'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-100 dark:border-emerald-800',
    },
    {
      label:  'Inactive / Closed',
      value:  (summary?.by_status?.inactive ?? 0) + (summary?.by_status?.closed ?? 0),
      icon:   AlertTriangle,
      color:  'text-amber-600 dark:text-amber-400',
      bg:     'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-100 dark:border-amber-800',
    },
    {
      label:  'Suspended',
      value:  summary?.by_status?.suspended ?? 0,
      icon:   AlertTriangle,
      color:  'text-red-600 dark:text-red-400',
      bg:     'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-100 dark:border-red-800',
    },
    {
      label:  'Under Construction',
      value:  summary?.by_status?.under_construction ?? 0,
      icon:   TrendingUp,
      color:  'text-blue-600 dark:text-blue-400',
      bg:     'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-100 dark:border-blue-800',
    },
    {
      label:  'Maintenance',
      value:  summary?.by_status?.maintenance ?? 0,
      icon:   Wrench,
      color:  'text-zinc-600 dark:text-zinc-400',
      bg:     'bg-zinc-50 dark:bg-zinc-800',
      border: 'border-zinc-200 dark:border-zinc-700',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
            className={`rounded-xl border p-4 flex flex-col gap-2 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow cursor-default ${card.border}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.bg}`}>
              <Icon size={16} className={card.color} />
            </div>
            <div>
              <p className={`text-2xl font-bold tabular-nums ${card.color}`}>
                <AnimatedCounter value={card.value} />
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                {card.label}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
