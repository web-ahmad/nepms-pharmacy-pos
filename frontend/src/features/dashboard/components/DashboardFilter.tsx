'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { Calendar, Check, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DateRange } from '../services/dashboard.api';

interface DashboardFilterProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS = [
  { key: 'today',      label: 'Today' },
  { key: 'yesterday',  label: 'Yesterday' },
  { key: 'this_week',  label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last7',      label: 'Last 7 Days' },
  { key: 'last30',     label: 'Last 30 Days' },
  { key: 'all',        label: 'All Time' },
];

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

export default function DashboardFilter({ dateRange, onChange }: DashboardFilterProps) {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState('today');
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  // NOTE: outside-click is handled by the portal overlay below — a document
  // `mousedown` listener here would fire on the portal menu items (they live
  // outside `ref`), closing the menu before their onClick could run.

  // Position the portal menu under the trigger; close on scroll/resize so it
  // never drifts. Rendering in a portal escapes the dashboard hero's
  // overflow-hidden (which was clipping the list to just the first row).
  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [open]);

  const handleSelect = (rangeType: string) => {
    const today = new Date();
    let from_date: string | undefined;
    let to_date: string | undefined;

    switch (rangeType) {
      case 'today':
        from_date = fmt(today); to_date = fmt(today); break;
      case 'yesterday': {
        const y = subDays(today, 1);
        from_date = fmt(y); to_date = fmt(y); break;
      }
      case 'this_week':
        from_date = fmt(startOfWeek(today, { weekStartsOn: 1 })); to_date = fmt(today); break;
      case 'this_month':
        from_date = fmt(startOfMonth(today)); to_date = fmt(today); break;
      case 'last7':
        from_date = fmt(subDays(today, 6)); to_date = fmt(today); break;
      case 'last30':
        from_date = fmt(subDays(today, 29)); to_date = fmt(today); break;
      case 'all':
        break; // undefined → all time
    }

    setActiveKey(rangeType);
    setShowCustom(false);
    onChange({ from_date, to_date });
    setOpen(false);
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    // Normalise order in case the user picks them backwards.
    const from = customFrom <= customTo ? customFrom : customTo;
    const to = customFrom <= customTo ? customTo : customFrom;
    setActiveKey('custom');
    onChange({ from_date: from, to_date: to });
    setOpen(false);
  };

  const getActiveLabel = () => {
    if (!dateRange.from_date && !dateRange.to_date) return 'All Time';
    const todayStr = fmt(new Date());
    if (dateRange.from_date === todayStr && dateRange.to_date === todayStr) return 'Today';
    const preset = PRESETS.find(p => p.key === activeKey);
    if (activeKey !== 'custom' && preset && dateRange.from_date && dateRange.to_date) {
      // Show the preset name when a named range is active.
      return preset.label;
    }
    return `${dateRange.from_date} → ${dateRange.to_date}`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        <Calendar size={16} className="text-emerald-600 dark:text-emerald-400" />
        {getActiveLabel()}
        <ChevronDown size={14} className={`text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {open && pos && (
            <>
              <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                style={{ top: pos.top, right: pos.right }}
                onClick={(e) => e.stopPropagation()}
                className="fixed z-[100] w-56 max-w-[calc(100vw-1rem)] rounded-xl border border-zinc-200 bg-white p-1.5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
              >
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => handleSelect(p.key)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-zinc-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
              >
                {p.label}
                {activeKey === p.key && !showCustom && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
              </button>
            ))}

            {/* Custom range */}
            <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
            <button
              onClick={() => setShowCustom((s) => !s)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 ${
                activeKey === 'custom' ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <span className="flex items-center gap-2"><SlidersHorizontal size={13} /> Custom Range</span>
              {activeKey === 'custom' && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
            </button>

            <AnimatePresence>
              {showCustom && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden px-2 pt-1"
                >
                  <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">From</label>
                  <input
                    type="date"
                    value={customFrom}
                    max={customTo || undefined}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="mb-2 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-800 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">To</label>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom || undefined}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="mb-2 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-800 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <button
                    onClick={applyCustom}
                    disabled={!customFrom || !customTo}
                    className="mb-1 w-full rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Apply Range
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
