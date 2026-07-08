"use client";

import { useLedger, useChartAccounts } from '@/features/accounts/services/accounts.api';
import GeneralLedgerTable from '@/features/accounts/components/GeneralLedgerTable';
import AccountingFilterBar from '@/features/accounts/components/AccountingFilterBar';
import { useMemo, useState } from 'react';

export default function BankBookPage() {
  const { data: accounts } = useChartAccounts();
  const bankAccount = useMemo(() => accounts?.find(a => a.name === 'Bank' || a.code === '1010'), [accounts]);
  
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchRef, setSearchRef] = useState('');

  const { data, isLoading } = useLedger({
    account_id: bankAccount?.id,
    start_date: dateRange.start || undefined,
    end_date: dateRange.end || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Bank Book</h2>
      </div>

      {!bankAccount ? (
        <div className="animate-pulse h-48 w-full rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      ) : (
        <>
          <AccountingFilterBar
            dateRange={dateRange}
            setDateRange={setDateRange}
            searchRef={searchRef}
            setSearchRef={setSearchRef}
          />
          <GeneralLedgerTable data={data!} isLoading={isLoading} searchRef={searchRef} />
        </>
      )}
    </div>
  );
}
