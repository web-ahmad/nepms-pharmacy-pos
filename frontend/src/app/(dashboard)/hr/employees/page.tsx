"use client";

import ModuleGuard from '@/components/ModuleGuard';
import { useEmployees } from '@/features/hr/services/hr.api';
import EmployeeTable from '@/features/hr/components/EmployeeTable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function EmployeesPage() {
  const { data, isLoading } = useEmployees();

  return (
    <ModuleGuard moduleKey="employees">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Staff Directory</h2>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
        <EmployeeTable data={data!} isLoading={isLoading} />
      </div>
    </ModuleGuard>
  );
}
