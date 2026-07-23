'use client';

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export interface DateRange {
  start_date: string;
  end_date: string;
}

interface DateRangeBarProps {
  onChange: (range: DateRange) => void;
}

const PRESETS = [
  { label: 'Today', getDates: () => { const d = new Date().toISOString().split('T')[0]; return { start_date: d, end_date: d }; } },
  { label: 'Yesterday', getDates: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = d.toISOString().split('T')[0]; return { start_date: s, end_date: s }; } },
  { label: 'Last 7 Days', getDates: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 6); return { start_date: s.toISOString().split('T')[0], end_date: e.toISOString().split('T')[0] }; } },
  { label: 'Last 30 Days', getDates: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 29); return { start_date: s.toISOString().split('T')[0], end_date: e.toISOString().split('T')[0] }; } },
  { label: 'This Month', getDates: () => { const n = new Date(); const s = new Date(n.getFullYear(), n.getMonth(), 1); return { start_date: s.toISOString().split('T')[0], end_date: n.toISOString().split('T')[0] }; } },
  { label: 'This Year', getDates: () => { const n = new Date(); const s = new Date(n.getFullYear(), 0, 1); return { start_date: s.toISOString().split('T')[0], end_date: n.toISOString().split('T')[0] }; } },
  { label: 'All Time', getDates: () => ({ start_date: '', end_date: '' }) },
];

export default function DateRangeBar({ onChange }: DateRangeBarProps) {
  const [active, setActive] = useState('All Time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customOpen, setCustomOpen] = useState(false);

  const handlePreset = (preset: typeof PRESETS[0]) => {
    setActive(preset.label);
    setCustomOpen(false);
    const range = preset.getDates();
    setStartDate(range.start_date);
    setEndDate(range.end_date);
    onChange(range);
  };

  const handleCustomApply = () => {
    if (startDate && endDate) {
      setActive('Custom');
      setCustomOpen(false);
      onChange({ start_date: startDate, end_date: endDate });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePreset(preset)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              active === preset.label
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Range Picker */}
      <div className="relative">
        <button
          onClick={() => setCustomOpen(!customOpen)}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
            active === 'Custom'
              ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          {active === 'Custom' && startDate ? `${startDate} → ${endDate}` : 'Custom Range'}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${customOpen ? 'rotate-180' : ''}`} />
        </button>

        {customOpen && (
          <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCustomOpen(false)}
                  className="flex-1 rounded-lg border border-zinc-200 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCustomApply}
                  className="flex-1 rounded-lg bg-zinc-900 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
