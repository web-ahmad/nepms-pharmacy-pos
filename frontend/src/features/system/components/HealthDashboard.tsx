'use client';
// Detail view for /system/health. Reports the same measured values as the
// Control Center — the old CPU%/memory%/connection figures were placeholders
// and have been replaced by metrics the server can actually observe.

import { SystemHealth } from '../services/system.api';
import { Badge } from '@/components/ui/badge';
import { Database, HardDrive, Cpu, Clock, ListOrdered, DatabaseBackup } from 'lucide-react';
import { UsageBar, AnimatedNumber, fmtBytesMb, fmtUptime, fmtAgo } from './system-ui';

interface HealthDashboardProps {
  data?: SystemHealth;
  isLoading: boolean;
}

export default function HealthDashboard({ data, isLoading }: HealthDashboardProps) {
  if (isLoading || !data) {
    return <div className="h-48 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  const isHealthy = data.database_status === 'Healthy';
  const card = 'p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm flex flex-col justify-between';
  const label = 'text-sm font-medium text-zinc-500 flex items-center gap-2';

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className={card}>
        <div className="mb-4 flex items-center justify-between">
          <p className={label}><Database className="h-4 w-4" /> Database</p>
          <Badge className={isHealthy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
            {data.database_status}
          </Badge>
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {fmtBytesMb(data.database_size_mb)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {data.database_engine} · responds in {data.database_latency_ms} ms
          </p>
        </div>
      </div>

      <div className={card}>
        <div className="mb-4 flex items-center justify-between">
          <p className={label}><HardDrive className="h-4 w-4" /> Disk</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {data.disk_used_gb} <span className="text-sm font-normal text-zinc-500">/ {data.disk_total_gb} GB</span>
          </p>
          <div className="mt-3"><UsageBar percent={data.disk_used_percent} tone="violet" /></div>
          <p className="mt-1.5 text-xs text-zinc-500">{data.disk_free_gb} GB free</p>
        </div>
      </div>

      <div className={card}>
        <div className="mb-4 flex items-center justify-between">
          <p className={label}><Clock className="h-4 w-4" /> Uptime</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{fmtUptime(data.uptime_seconds)}</p>
          <p className="mt-1 text-xs text-zinc-500">Since the API process started</p>
        </div>
      </div>

      <div className={card}>
        <div className="mb-4 flex items-center justify-between">
          <p className={label}><Cpu className="h-4 w-4" /> Compute</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            <AnimatedNumber value={data.cpu_cores} /> <span className="text-sm font-normal text-zinc-500">cores</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">Available to the server process</p>
        </div>
      </div>

      <div className={card}>
        <div className="mb-4 flex items-center justify-between">
          <p className={label}><DatabaseBackup className="h-4 w-4" /> Backups</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            <AnimatedNumber value={data.backup_count} /> <span className="text-sm font-normal text-zinc-500">stored</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">Last taken {fmtAgo(data.last_backup_age_hours)}</p>
        </div>
      </div>

      <div className={card}>
        <div className="mb-4 flex items-center justify-between">
          <p className={label}><ListOrdered className="h-4 w-4" /> OCR queue</p>
        </div>
        <p className="mt-2 text-2xl font-bold text-orange-600 dark:text-orange-400">
          <AnimatedNumber value={data.queues_pending} /> <span className="text-sm font-normal text-zinc-500">jobs pending</span>
        </p>
      </div>
    </div>
  );
}
