"use client";

import { useHRAnalytics } from '@/features/hr/services/hr.api';
import HRAnalyticsCards from '@/features/hr/components/HRAnalyticsCards';

export default function HRDashboardPage() {
  const { data, isLoading } = useHRAnalytics();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Dashboard Overview</h2>
      </div>

      <HRAnalyticsCards data={data} isLoading={isLoading} />
      
      {/* Visual gap for future charts */}
      <div className="h-64 w-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center dark:border-zinc-800 dark:bg-zinc-900/50">
        <p className="text-zinc-500 font-medium">Headcount Analytics (Coming Soon)</p>
      </div>
    </div>
  );
}
