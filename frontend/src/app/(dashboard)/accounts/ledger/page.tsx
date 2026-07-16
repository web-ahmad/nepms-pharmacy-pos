"use client";
import { useLedger, useChartAccounts } from '@/features/accounts/services/accounts.api';
import GeneralLedgerTable from '@/features/accounts/components/GeneralLedgerTable';
import { BookOpen, Book, Coins, ArrowRightLeft, Landmark, ShoppingCart, RefreshCcw } from 'lucide-react';
import AccountingFilterBar from '@/features/accounts/components/AccountingFilterBar';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense, useMemo } from 'react';

function getBookInfo(accountName: string) {
  const name = accountName.toLowerCase();
  if (name.includes('cash')) return { icon: <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />, color: 'bg-amber-100 dark:bg-amber-900/40' };
  if (name.includes('bank')) return { icon: <Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />, color: 'bg-blue-100 dark:bg-blue-900/40' };
  if (name.includes('return')) return { icon: <ArrowRightLeft className="h-5 w-5 text-rose-600 dark:text-rose-400" />, color: 'bg-rose-100 dark:bg-rose-900/40' };
  if (name.includes('purchase')) return { icon: <ShoppingCart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />, color: 'bg-emerald-100 dark:bg-emerald-900/40' };
  return { icon: <Book className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />, color: 'bg-indigo-100 dark:bg-indigo-900/40' };
}

function GeneralLedgerContent() {
  const searchParams = useSearchParams();
  const initialAccountId = searchParams.get('account_id') || '';
  
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchRef, setSearchRef] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccountId);

  const { data: accounts } = useChartAccounts();
  const selectedAccount = useMemo(() => accounts?.find(a => a.id === selectedAccountId), [accounts, selectedAccountId]);

  const { data, isLoading, refetch, isRefetching } = useLedger({
    start_date: dateRange.start || undefined,
    end_date: dateRange.end || undefined,
    account_id: selectedAccountId || undefined,
  });

  const pageTitle = selectedAccount ? `${selectedAccount.name} Book` : 'General Ledger';
  const pageSubtitle = selectedAccount ? `Dedicated chronological ledger for ${selectedAccount.name}` : 'Complete chronological record of all transactions';
  const bookInfo = selectedAccount ? getBookInfo(selectedAccount.name) : { icon: <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />, color: 'bg-indigo-100 dark:bg-indigo-900/40' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bookInfo.color} shadow-inner`}>
            {bookInfo.icon}
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">{pageTitle}</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{pageSubtitle}</p>
          </div>
        </div>
        <button 
          onClick={() => refetch()} 
          disabled={isRefetching}
          className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50"
        >
          <RefreshCcw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-200/50 bg-white/50 p-1 shadow-sm backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/50">
        <AccountingFilterBar
          dateRange={dateRange}
          setDateRange={setDateRange}
          searchRef={searchRef}
          setSearchRef={setSearchRef}
          showAccountFilter={true}
          selectedAccountId={selectedAccountId}
          setSelectedAccountId={setSelectedAccountId}
        />
      </div>

      <GeneralLedgerTable data={data!} isLoading={isLoading} searchRef={searchRef} bookName={pageTitle} />
    </div>
  );
}

export default function GeneralLedgerPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-48 rounded-2xl bg-zinc-100 dark:bg-zinc-900" />}>
      <GeneralLedgerContent />
    </Suspense>
  );
}
