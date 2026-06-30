import { SystemHealth } from '../services/system.api';
import { Badge } from '@/components/ui/badge';
import { Database, Server, HardDrive, Cpu, Activity, ListOrdered } from 'lucide-react';

interface HealthDashboardProps {
  data?: SystemHealth;
  isLoading: boolean;
}

export default function HealthDashboard({ data, isLoading }: HealthDashboardProps) {
  if (isLoading || !data) {
    return <div className="h-48 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  const isHealthy = data.database_status === 'Healthy';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-zinc-500 flex items-center gap-2"><Database className="h-4 w-4" /> Database Status</p>
          <Badge className={isHealthy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{data.database_status}</Badge>
        </div>
        <p className="text-2xl font-bold mt-2 text-zinc-900 dark:text-zinc-100">
          {data.active_connections} <span className="text-sm font-normal text-zinc-500">connections</span>
        </p>
      </div>

      <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-zinc-500 flex items-center gap-2"><HardDrive className="h-4 w-4" /> Storage Allocation</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {data.storage_used_gb} <span className="text-sm font-normal text-zinc-500">/ {data.storage_total_gb} GB</span>
          </p>
          <div className="w-full bg-zinc-200 rounded-full h-2 mt-3 dark:bg-zinc-800">
            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${(data.storage_used_gb / data.storage_total_gb) * 100}%` }}></div>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-zinc-500 flex items-center gap-2"><Cpu className="h-4 w-4" /> Compute Usage</p>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-zinc-500 mb-1">CPU</p>
            <p className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{data.cpu_usage_percent}%</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Memory</p>
            <p className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{data.memory_usage_percent}%</p>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-zinc-500 flex items-center gap-2"><ListOrdered className="h-4 w-4" /> OCR Pending Queues</p>
        </div>
        <p className="text-2xl font-bold mt-2 text-orange-600 dark:text-orange-400">
          {data.queues_pending} <span className="text-sm font-normal text-zinc-500">jobs processing</span>
        </p>
      </div>
    </div>
  );
}
