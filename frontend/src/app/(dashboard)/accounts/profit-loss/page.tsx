"use client";

import { useProfitLoss } from '@/features/accounts/services/accounts.api';
import ProfitLossView from '@/features/accounts/components/ProfitLossView';

export default function ProfitLossPage() {
  const { data, isLoading } = useProfitLoss();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Profit & Loss</h2>
      </div>

      <ProfitLossView data={data!} isLoading={isLoading} />
    </div>
  );
}
