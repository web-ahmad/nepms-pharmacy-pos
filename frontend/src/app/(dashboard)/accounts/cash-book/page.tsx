"use client";

import { useLedger, useChartAccounts } from '@/features/accounts/services/accounts.api';
import GeneralLedgerTable from '@/features/accounts/components/GeneralLedgerTable';
import AccountingFilterBar from '@/features/accounts/components/AccountingFilterBar';
import { useMemo, useState } from 'react';

export default function CashBookPage() {
  const { data: accounts } = useChartAccounts();
  const cashAccount = useMemo(() => accounts?.find(a => a.name === 'Cash' || a.code === '1000'), [accounts]);
  
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchRef, setSearchRef] = useState('');

  const { data, isLoading } = useLedger({
    account_id: cashAccount?.id,
    start_date: dateRange.start || undefined,
    end_date: dateRange.end || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Cash Book</h2>
      </div>

      {!cashAccount ? (
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
