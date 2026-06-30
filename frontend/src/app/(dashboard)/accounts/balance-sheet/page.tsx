"use client";

import { useBalanceSheet } from '@/features/accounts/services/accounts.api';
import BalanceSheetView from '@/features/accounts/components/BalanceSheetView';

export default function BalanceSheetPage() {
  const { data, isLoading } = useBalanceSheet();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Balance Sheet</h2>
      </div>

      <BalanceSheetView data={data!} isLoading={isLoading} />
    </div>
  );
}
