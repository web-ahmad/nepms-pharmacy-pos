'use client';

import AttendanceLogs from '@/features/hr/components/AttendanceLogs';
import AttendanceTerminal from '@/features/hr/components/AttendanceTerminal';
import AttendanceWeeklyChart from '@/features/hr/components/AttendanceWeeklyChart';
import { CalendarCheck } from 'lucide-react';

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
          <CalendarCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Attendance Center</h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500">Clock in/out in real-time and review organizational logs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <AttendanceTerminal />
        </div>
        <div className="xl:col-span-2">
          <AttendanceWeeklyChart />
        </div>
      </div>

      <div className="border-t border-gray-100 dark:border-zinc-800 pt-6">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-wider text-emerald-700">Attendance Registry</h3>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">HR view of daily clock-in records with shift status</p>
        </div>
        <AttendanceLogs />
      </div>
    </div>
  );
}
