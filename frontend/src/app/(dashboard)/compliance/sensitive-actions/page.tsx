"use client";

import { useSensitiveActions } from '@/features/compliance/services/compliance.api';
import SensitiveActionsTable from '@/features/compliance/components/SensitiveActionsTable';

export default function SensitiveActionsPage() {
  const { data, isLoading } = useSensitiveActions();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Sensitive Actions Monitor</h2>
          <p className="text-sm text-zinc-500 mt-1">Filtered view of high-risk actions such as Exports, Deletions, and Payroll generation.</p>
        </div>
      </div>

      <SensitiveActionsTable data={data!} isLoading={isLoading} />
    </div>
  );
}
