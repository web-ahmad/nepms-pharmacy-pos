"use client";

import { useHRAnalytics } from '@/features/hr/services/hr.api';
import HRAnalyticsCards from '@/features/hr/components/HRAnalyticsCards';
import AttendanceTerminal from '@/features/hr/components/AttendanceTerminal';

export default function HRDashboardPage() {
  const { data, isLoading } = useHRAnalytics();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Dashboard Overview</h2>
      </div>

      <HRAnalyticsCards data={data} isLoading={isLoading} />

      {/* Attendance Terminal + Headcount Analytics */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <AttendanceTerminal />
        </div>
        <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 xl:col-span-2 dark:border-zinc-800 dark:bg-zinc-900/50 min-h-64">
          <p className="text-zinc-500 font-medium">Headcount Analytics (Coming Soon)</p>
        </div>
      </div>
    </div>
  );
}
