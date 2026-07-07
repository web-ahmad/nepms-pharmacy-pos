"use client";
import { useBalanceSheet } from '@/features/accounts/services/accounts.api';
import BalanceSheetView from '@/features/accounts/components/BalanceSheetView';
import { Landmark } from 'lucide-react';

export default function BalanceSheetPage() {
  const { data, isLoading, refetch } = useBalanceSheet();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <Landmark className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Balance Sheet</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500">Assets = Liabilities + Owner's Equity</p>
          </div>
        </div>
        <button onClick={() => refetch()} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">↻ Refresh</button>
      </div>
      <BalanceSheetView data={data!} isLoading={isLoading} />
    </div>
  );
}
