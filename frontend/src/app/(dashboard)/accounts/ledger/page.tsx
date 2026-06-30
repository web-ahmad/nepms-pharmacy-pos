"use client";

import { useLedger } from '@/features/accounts/services/accounts.api';
import GeneralLedgerTable from '@/features/accounts/components/GeneralLedgerTable';

export default function GeneralLedgerPage() {
  const { data, isLoading } = useLedger({});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">General Ledger</h2>
      </div>

      <GeneralLedgerTable data={data!} isLoading={isLoading} />
    </div>
  );
}
