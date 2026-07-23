"use client";

import { useState, ReactNode } from 'react';
import UniversalDataTable from './UniversalDataTable';
import DateRangeBar, { DateRange } from './DateRangeBar';
import ReportChartPanel from './ReportChartPanel';
import { useDynamicReport } from '@/features/reports/api/dynamic-reports.api';
import { useAuthStore } from '@/stores/auth-store';

export type ReportTab = {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
};

type AccentColor = 'emerald' | 'blue' | 'violet' | 'amber' | 'red' | 'teal' | 'orange' | 'indigo' | 'zinc';

const ACCENT_ACTIVE: Record<AccentColor, string> = {
  emerald: 'bg-emerald-600 text-white shadow-lg shadow-emerald-200/60 dark:shadow-emerald-900/30',
  blue:    'bg-blue-600 text-white shadow-lg shadow-blue-200/60 dark:shadow-blue-900/30',
  violet:  'bg-violet-600 text-white shadow-lg shadow-violet-200/60 dark:shadow-violet-900/30',
  amber:   'bg-amber-500 text-white shadow-lg shadow-amber-200/60 dark:shadow-amber-900/30',
  red:     'bg-red-600 text-white shadow-lg shadow-red-200/60 dark:shadow-red-900/30',
  teal:    'bg-teal-600 text-white shadow-lg shadow-teal-200/60 dark:shadow-teal-900/30',
  orange:  'bg-orange-500 text-white shadow-lg shadow-orange-200/60 dark:shadow-orange-900/30',
  indigo:  'bg-indigo-600 text-white shadow-lg shadow-indigo-200/60 dark:shadow-indigo-900/30',
  zinc:    'bg-zinc-800 text-white shadow-lg shadow-zinc-300/60 dark:bg-zinc-100 dark:text-zinc-900',
};

const ACCENT_BADGE: Record<AccentColor, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  blue:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  violet:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  amber:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  red:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  teal:    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  orange:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  indigo:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  zinc:    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

const GRADIENT_MAP: Record<AccentColor, string> = {
  emerald: 'from-emerald-500 to-teal-600',
  blue:    'from-blue-500 to-blue-700',
  violet:  'from-violet-500 to-purple-700',
  amber:   'from-amber-400 to-orange-500',
  red:     'from-red-500 to-rose-700',
  teal:    'from-teal-500 to-cyan-600',
  orange:  'from-orange-500 to-amber-600',
  indigo:  'from-indigo-500 to-violet-600',
  zinc:    'from-zinc-700 to-zinc-900',
};

interface ReportPageShellProps {
  title: string;
  icon: React.ElementType;
  accent?: AccentColor;
  tabs: ReportTab[];
  showChart?: boolean;
  rowsPerPage?: number;
  extra?: ReactNode;
}

export default function ReportPageShell({
  title,
  icon: TitleIcon,
  accent = 'blue',
  tabs,
  showChart = true,
  rowsPerPage = 25,
  extra,
}: ReportPageShellProps) {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [dateRange, setDateRange] = useState<DateRange>({ start_date: '', end_date: '' });
  const { branchId } = useAuthStore();

  // Always include active branch so franchise branches only see their own data
  const params = {
    ...(dateRange.start_date ? dateRange : {}),
    ...(branchId ? { branch_id: branchId } : {}),
  };
  const { data, isLoading } = useDynamicReport(activeTab, params);

  const currentTab = tabs.find(t => t.id === activeTab)!;
  const gradientClass = GRADIENT_MAP[accent];

  return (
    <div className="space-y-0 animate-in fade-in duration-300">
      {/* Hero header */}
      <div className={`-mx-6 -mt-6 md:-mx-8 md:-mt-8 mb-6 bg-gradient-to-br ${gradientClass} px-6 py-7 md:px-8`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <TitleIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{title}</h1>
            <p className="text-sm text-white/70">{currentTab.description}</p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {/* Date Range Bar */}
        <DateRangeBar onChange={setDateRange} />

        {/* Tab Selector — scrollable pill row */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? ACCENT_ACTIVE[accent]
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:bg-zinc-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active tab context */}
        <div className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs ${ACCENT_BADGE[accent]}`}>
          {(() => { const Icon = currentTab.icon; return <Icon className="h-3.5 w-3.5 flex-shrink-0" />; })()}
          <span className="font-semibold">{currentTab.label}</span>
          <span className="opacity-60">&mdash;</span>
          <span className="opacity-75">{currentTab.description}</span>
        </div>

        {extra}

        {/* Chart */}
        {showChart && (
          <ReportChartPanel reportId={activeTab} rows={data?.rows || []} isLoading={isLoading} />
        )}

        {/* Table */}
        <UniversalDataTable data={data || null} isLoading={isLoading} rowsPerPage={rowsPerPage} />
      </div>
    </div>
  );
}
