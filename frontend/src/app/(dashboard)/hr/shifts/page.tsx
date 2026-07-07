'use client';

import ShiftsTable from '@/features/hr/components/ShiftsTable';
import { Clock } from 'lucide-react';

export default function ShiftsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
          <Clock className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Shifts</h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500">Manage working hours, timings, and grace periods</p>
        </div>
      </div>
      
      <ShiftsTable />
    </div>
  );
}
