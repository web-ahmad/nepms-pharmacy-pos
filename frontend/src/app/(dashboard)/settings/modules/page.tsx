"use client";

import { useModules } from '@/features/settings/services/settings.api';
import ModuleTable from '@/features/settings/components/ModuleTable';
import { Button } from '@/components/ui/button';

export default function ModulesManagementPage() {
  const { data, isLoading } = useModules();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Module Activation Center</h2>
          <p className="text-sm text-zinc-500 mt-1">Enable or disable specific features across the tenant. Disabled modules hide related UI elements and block API routes.</p>
        </div>
        <div className="flex gap-2">
          {/* Note: In a real implementation these buttons would call a bulk edit mutation */}
          <Button variant="outline" size="sm">Enable All</Button>
          <Button variant="outline" size="sm">Disable All</Button>
        </div>
      </div>

      <ModuleTable data={data!} isLoading={isLoading} />
    </div>
  );
}
