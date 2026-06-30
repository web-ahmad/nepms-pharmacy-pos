"use client";

import ModuleGuard from '@/components/ModuleGuard';
import { useLeaveRequests } from '@/features/hr/services/hr.api';
import LeaveRequestTable from '@/features/hr/components/LeaveRequestTable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function LeavesPage() {
  const { data, isLoading } = useLeaveRequests();

  return (
    <ModuleGuard moduleKey="leaves">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Leave Management</h2>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Request Leave
          </Button>
        </div>
        <LeaveRequestTable data={data!} isLoading={isLoading} />
      </div>
    </ModuleGuard>
  );
}
