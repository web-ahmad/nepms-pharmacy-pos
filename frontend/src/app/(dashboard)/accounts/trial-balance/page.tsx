"use client";

import { useTrialBalance } from '@/features/accounts/services/accounts.api';
import TrialBalanceTable from '@/features/accounts/components/TrialBalanceTable';

export default function TrialBalancePage() {
  const { data, isLoading } = useTrialBalance();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Trial Balance</h2>
      </div>

      <TrialBalanceTable data={data!} isLoading={isLoading} />
    </div>
  );
}
