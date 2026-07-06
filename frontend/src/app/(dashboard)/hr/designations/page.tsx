'use client';

import DesignationsTable from '@/features/hr/components/DesignationsTable';

export default function DesignationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Designations</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Manage job titles and their department connections.
        </p>
      </div>
      
      <DesignationsTable />
    </div>
  );
}
