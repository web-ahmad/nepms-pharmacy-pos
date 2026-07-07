"use client";
import { useTrialBalance } from '@/features/accounts/services/accounts.api';
import TrialBalanceTable from '@/features/accounts/components/TrialBalanceTable';
import { Scale } from 'lucide-react';

export default function TrialBalancePage() {
  const { data, isLoading, refetch } = useTrialBalance();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <Scale className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Trial Balance</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500">Verify Debits = Credits across all accounts</p>
          </div>
        </div>
        <button onClick={() => refetch()} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">↻ Refresh</button>
      </div>
      <TrialBalanceTable data={data!} isLoading={isLoading} />
    </div>
  );
}
