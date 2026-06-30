"use client";

import { useRoles } from '@/features/admin/services/admin.api';
import RoleTable from '@/features/admin/components/RoleTable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function RolesPage() {
  const { data, isLoading } = useRoles();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Role Definitions</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>

      <RoleTable data={data!} isLoading={isLoading} />
    </div>
  );
}
