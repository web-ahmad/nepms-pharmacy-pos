"use client";

import { useSystemHealth } from '@/features/system/services/system.api';
import HealthDashboard from '@/features/system/components/HealthDashboard';

export default function SystemHealthPage() {
  const { data, isLoading } = useSystemHealth();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">System Telemetry</h2>
          <p className="text-sm text-zinc-500 mt-1">Live metrics from the Postgres database and server compute.</p>
        </div>
      </div>

      <HealthDashboard data={data} isLoading={isLoading} />
    </div>
  );
}
