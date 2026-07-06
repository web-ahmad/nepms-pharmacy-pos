'use client';

import ShiftsTable from '@/features/hr/components/ShiftsTable';

export default function ShiftsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Shifts</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Manage working hours, timings, and automated attendance grace periods.
        </p>
      </div>
      
      <ShiftsTable />
    </div>
  );
}
