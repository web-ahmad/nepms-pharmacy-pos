"use client";
import { useLedger } from '@/features/accounts/services/accounts.api';
import GeneralLedgerTable from '@/features/accounts/components/GeneralLedgerTable';
import { BookOpen } from 'lucide-react';
import AccountingFilterBar from '@/features/accounts/components/AccountingFilterBar';
import { useState } from 'react';

export default function GeneralLedgerPage() {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchRef, setSearchRef] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const { data, isLoading, refetch } = useLedger({
    start_date: dateRange.start || undefined,
    end_date: dateRange.end || undefined,
    account_id: selectedAccountId || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <BookOpen className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">General Ledger</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500">Complete chronological record of all transactions</p>
          </div>
        </div>
        <button onClick={() => refetch()} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">↻ Refresh</button>
      </div>

      <AccountingFilterBar
        dateRange={dateRange}
        setDateRange={setDateRange}
        searchRef={searchRef}
        setSearchRef={setSearchRef}
        showAccountFilter={true}
        selectedAccountId={selectedAccountId}
        setSelectedAccountId={setSelectedAccountId}
      />

      <GeneralLedgerTable data={data!} isLoading={isLoading} searchRef={searchRef} />
    </div>
  );
}
