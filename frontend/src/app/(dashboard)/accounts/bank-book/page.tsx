"use client";

import { useLedger, useChartAccounts } from '@/features/accounts/services/accounts.api';
import GeneralLedgerTable from '@/features/accounts/components/GeneralLedgerTable';
import { useMemo } from 'react';

export default function BankBookPage() {
  const { data: accounts } = useChartAccounts();
  const bankAccount = useMemo(() => accounts?.find(a => a.name === 'Bank' || a.code === '1010'), [accounts]);
  
  const { data, isLoading } = useLedger({
    account_id: bankAccount?.id
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Bank Book</h2>
      </div>

      {!bankAccount ? (
        <div className="animate-pulse h-48 w-full rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      ) : (
        <GeneralLedgerTable data={data!} isLoading={isLoading} />
      )}
    </div>
  );
}
