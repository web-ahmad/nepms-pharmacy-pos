"use client";

import { useUsers } from '@/features/admin/services/admin.api';
import UserTable from '@/features/admin/components/UserTable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function UsersPage() {
  const { data, isLoading } = useUsers();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">User Directory</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      <UserTable data={data!} isLoading={isLoading} />
    </div>
  );
}
