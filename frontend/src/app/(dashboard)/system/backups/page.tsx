"use client";

import { useBackups, useTriggerBackup } from '@/features/system/services/system.api';
import BackupTable from '@/features/system/components/BackupTable';
import { Button } from '@/components/ui/button';
import { DatabaseBackup } from 'lucide-react';

export default function BackupsPage() {
  const { data, isLoading } = useBackups();
  const triggerBackup = useTriggerBackup();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Database Backups</h2>
          <p className="text-sm text-zinc-500 mt-1">Manual and automated database snapshots.</p>
        </div>
        <Button 
          onClick={() => triggerBackup.mutate()} 
          disabled={triggerBackup.isPending}
        >
          <DatabaseBackup className="mr-2 h-4 w-4" />
          {triggerBackup.isPending ? 'Generating...' : 'Trigger Backup'}
        </Button>
      </div>

      <BackupTable data={data!} isLoading={isLoading} />
    </div>
  );
}
