'use client';

import { useAttendanceWeeklySummary } from '../services/hr.api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Loader2 } from 'lucide-react';

export default function AttendanceWeeklyChart() {
  const { data, isLoading, error } = useAttendanceWeeklySummary();

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !data || !data.days) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <p className="text-sm font-medium text-zinc-500">Failed to load chart data</p>
      </div>
    );
  }

  // Reverse data so oldest day is first (left to right)
  const chartData = [...data.days].reverse();

  return (
    <div className="flex h-full w-full flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Weekly Overview</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Last 7 days attendance trends</p>
      </div>

      <div className="mt-4 h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" className="stroke-zinc-200 dark:stroke-zinc-800" />
            <XAxis 
              dataKey="label" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
              dy={10}
              className="fill-zinc-500 dark:fill-zinc-400"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
              className="fill-zinc-500 dark:fill-zinc-400"
            />
            <Tooltip 
              cursor={{ fill: 'rgba(161, 161, 170, 0.1)' }}
              contentStyle={{ 
                borderRadius: '8px', 
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey="present" name="Present" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
            <Bar dataKey="late" name="Late" stackId="a" fill="#eab308" />
            <Bar dataKey="absent" name="Absent" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
