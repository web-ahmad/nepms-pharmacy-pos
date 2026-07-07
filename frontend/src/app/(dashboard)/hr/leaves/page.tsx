"use client";

import ModuleGuard from '@/components/ModuleGuard';
import LeavesList from '@/features/hr/components/LeavesList';
import { Palmtree } from 'lucide-react';

export default function LeavesPage() {
  return (
    <ModuleGuard moduleKey="hr">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <Palmtree className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Leave Applications</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500">Track and review employee vacation and sick leave requests</p>
          </div>
        </div>
        
        <LeavesList />
      </div>
    </ModuleGuard>
  );
}
