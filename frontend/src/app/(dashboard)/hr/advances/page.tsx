'use client';

import { AdvancesTab } from '@/features/hr/components/AdvancesTab';

export default function AdvancesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">Advance Salaries</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Manage and track employee advances.</p>
        </div>
      </div>
      
      <AdvancesTab />
    </div>
  );
}
