"use client";
import { useLedger } from '@/features/accounts/services/accounts.api';
import GeneralLedgerTable from '@/features/accounts/components/GeneralLedgerTable';
import { BookOpen } from 'lucide-react';
import AccountingFilterBar from '@/features/accounts/components/AccountingFilterBar';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';

function GeneralLedgerContent() {
  const searchParams = useSearchParams();
  const initialAccountId = searchParams.get('account_id') || '';
  
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchRef, setSearchRef] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccountId);

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

export default function GeneralLedgerPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-48 rounded-xl bg-zinc-100 dark:bg-zinc-900" />}>
      <GeneralLedgerContent />
    </Suspense>
  );
}
