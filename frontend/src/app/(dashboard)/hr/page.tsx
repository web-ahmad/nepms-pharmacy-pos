"use client";

import { useHRAnalytics } from '@/features/hr/services/hr.api';
import AttendanceTerminal from '@/features/hr/components/AttendanceTerminal';
import {
  Users, UserCheck, CalendarX, Clock, Banknote,
  TrendingUp, ArrowUpRight,
} from 'lucide-react';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(v);

function StatCard({
  label, value, icon: Icon, bg, iconColor, trend, suffix = '',
}: {
  label: string; value: string | number; icon: any;
  bg: string; iconColor: string; trend?: string; suffix?: string;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border p-5 bg-white dark:bg-zinc-950 shadow-sm hover:shadow-md transition-all duration-200 ${bg}`}>
      {/* subtle animated shimmer on hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-zinc-100">
            {value}{suffix}
          </p>
          {trend && (
            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />{trend}
            </p>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconColor} shrink-0 ml-3`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function HRDashboardPage() {
  const { data, isLoading } = useHRAnalytics();

  const cards = [
    { label: 'Total Employees',  value: data?.total_employees ?? 0,      icon: Users,      bg: 'border-gray-200 dark:border-zinc-800',          iconColor: 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300' },
    { label: 'Active Staff',     value: data?.active_employees ?? 0,     icon: UserCheck,  bg: 'border-emerald-200 dark:border-emerald-900',     iconColor: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' },
    { label: 'Attendance Rate',  value: data?.attendance_percent ?? 0,   icon: CalendarX,  bg: 'border-blue-200 dark:border-blue-900',           iconColor: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',    suffix: '%' },
    { label: 'Pending Leaves',   value: data?.pending_leaves ?? 0,       icon: Clock,      bg: 'border-orange-200 dark:border-orange-900',       iconColor: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400' },
    { label: 'Est. Monthly Cost', value: fmt(data?.monthly_payroll_cost ?? 0), icon: Banknote, bg: 'border-violet-200 dark:border-violet-900', iconColor: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Dashboard Overview</h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Live HR metrics for your organisation</p>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map((c) => <StatCard key={c.label} {...c as any} />)}
        </div>
      )}

      {/* Attendance Terminal + placeholder chart */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <AttendanceTerminal />
        </div>
        <div className="xl:col-span-2 flex flex-col items-center justify-center min-h-64 rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10 gap-2">
          <TrendingUp className="h-8 w-8 text-emerald-300 dark:text-emerald-700" />
          <p className="text-sm font-semibold text-gray-400 dark:text-zinc-500">Headcount Analytics</p>
          <p className="text-xs text-gray-300 dark:text-zinc-600">Coming soon</p>
        </div>
      </div>
    </div>
  );
}
