"use client";

import { useLedger, useChartAccounts } from '@/features/accounts/services/accounts.api';
import GeneralLedgerTable from '@/features/accounts/components/GeneralLedgerTable';
import { useMemo, useState } from 'react';

export default function ExpensesPage() {
  const { data: accounts } = useChartAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const expenseAccounts = useMemo(() => {
    return accounts?.filter(a => a.category === 'Expense') || [];
  }, [accounts]);

  const { data, isLoading } = useLedger({
    account_id: selectedAccountId || expenseAccounts[0]?.id
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Expense Management</h2>
        
        <div className="flex gap-2">
          <select 
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
          >
            {expenseAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {expenseAccounts.length === 0 ? (
        <div className="animate-pulse h-48 w-full rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      ) : (
        <GeneralLedgerTable data={data!} isLoading={isLoading} />
      )}
    </div>
  );
}
