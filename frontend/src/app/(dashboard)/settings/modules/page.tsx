"use client";

import { useModules, useBulkUpdateModules } from '@/features/settings/services/settings.api';
import ModuleTable from '@/features/settings/components/ModuleTable';
import { Button } from '@/components/ui/button';
import { Blocks } from 'lucide-react';
import toast from 'react-hot-toast';
import { SettingsPageHeader } from '@/features/settings/components/SettingsUI';

export default function ModulesManagementPage() {
  const { data, isLoading } = useModules();
  const bulkUpdate = useBulkUpdateModules();

  const handleBulk = async (is_enabled: boolean) => {
    if (!data || data.length === 0) return;
    const ids = data.map((m) => m.id);
    try {
      await bulkUpdate.mutateAsync({ ids, is_enabled });
      toast.success(`${ids.length} module${ids.length === 1 ? '' : 's'} ${is_enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update modules');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SettingsPageHeader
          icon={Blocks}
          title="Module Activation Center"
          description="Enable or disable specific features across the tenant. Disabled modules hide related UI elements and block API routes."
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleBulk(true)} disabled={bulkUpdate.isPending || isLoading}>
            Enable All
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleBulk(false)} disabled={bulkUpdate.isPending || isLoading}>
            Disable All
          </Button>
        </div>
      </div>

      <ModuleTable data={data || []} isLoading={isLoading} />
    </div>
  );
}
