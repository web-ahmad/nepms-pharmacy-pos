'use client';

import AttendanceLogs from '@/features/hr/components/AttendanceLogs';
import AttendanceTerminal from '@/features/hr/components/AttendanceTerminal';

export default function AttendancePage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Attendance
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Clock in/out in real-time and review the full HR attendance logs below.
        </p>
      </div>

      {/* Two-column layout: Terminal + Quick Stats */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Attendance Terminal — 1/3 width on large screens */}
        <div className="xl:col-span-1">
          <AttendanceTerminal />
        </div>

        {/* Placeholder for quick stats / charts */}
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-8 xl:col-span-2 dark:border-zinc-700 dark:bg-zinc-900/30">
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Attendance Analytics
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
              Charts and trend data — Coming Soon
            </p>
          </div>
        </div>
      </div>

      {/* Admin Attendance Logs */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Attendance Logs
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              HR view of daily clock-in records with shift and status tracking.
            </p>
          </div>
        </div>
        <AttendanceLogs />
      </div>
    </div>
  );
}
