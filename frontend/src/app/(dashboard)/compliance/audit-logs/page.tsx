"use client";

import ModuleGuard from '@/components/ModuleGuard';
import { useAuditLogs } from '@/features/compliance/services/compliance.api';
import AuditLogTable from '@/features/compliance/components/AuditLogTable';
import { Button } from '@/components/ui/button';
import { DownloadCloud } from 'lucide-react';

export default function AuditLogsPage() {
  const { data, isLoading } = useAuditLogs();

  return (
    <ModuleGuard moduleKey="audit">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Global Audit Log</h2>
            <p className="text-sm text-zinc-500 mt-1">An immutable record of all actions performed in the system.</p>
          </div>
          <Button variant="outline">
            <DownloadCloud className="mr-2 h-4 w-4" />
            Export to CSV
          </Button>
        </div>
        <AuditLogTable data={data!} isLoading={isLoading} />
      </div>
    </ModuleGuard>
  );
}
