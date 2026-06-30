"use client";

import { usePermissions } from '@/features/admin/services/admin.api';
import PermissionMatrix from '@/features/admin/components/PermissionMatrix';

export default function PermissionsPage() {
  const { data, isLoading } = usePermissions();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Global Permissions Matrix</h2>
          <p className="text-sm text-zinc-500 mt-1">These are the strict RBAC security policies hardcoded into the system.</p>
        </div>
      </div>

      <PermissionMatrix permissions={data || []} isLoading={isLoading} />
    </div>
  );
}
