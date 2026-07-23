'use client';

import { useEffect, useRef, useState } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DateRange } from '../services/dashboard.api';

interface DashboardFilterProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'all', label: 'All Time' },
];

export default function DashboardFilter({ dateRange, onChange }: DashboardFilterProps) {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState('today');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (rangeType: string) => {
    const today = new Date();
    let from_date: string | undefined = undefined;
    let to_date: string | undefined = undefined;

    switch (rangeType) {
      case 'today':
        from_date = format(today, 'yyyy-MM-dd');
        to_date = format(today, 'yyyy-MM-dd');
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        from_date = format(yesterday, 'yyyy-MM-dd');
        to_date = format(yesterday, 'yyyy-MM-dd');
        break;
      case 'last7':
        from_date = format(subDays(today, 6), 'yyyy-MM-dd');
        to_date = format(today, 'yyyy-MM-dd');
        break;
      case 'last30':
        from_date = format(subDays(today, 29), 'yyyy-MM-dd');
        to_date = format(today, 'yyyy-MM-dd');
        break;
      case 'all':
        // Leave undefined to fetch all time (if backend supports it, which ours does)
        break;
    }

    setActiveKey(rangeType);
    onChange({ from_date, to_date });
    setOpen(false);
  };

  const getActiveLabel = () => {
    if (!dateRange.from_date && !dateRange.to_date) return 'All Time';
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (dateRange.from_date === todayStr && dateRange.to_date === todayStr) return 'Today';
    return `${dateRange.from_date} - ${dateRange.to_date}`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        <Calendar size={16} className="text-emerald-600 dark:text-emerald-400" />
        {getActiveLabel()}
        <ChevronDown size={14} className={`text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-50 mt-1.5 w-44 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => handleSelect(p.key)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-zinc-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
              >
                {p.label}
                {activeKey === p.key && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
