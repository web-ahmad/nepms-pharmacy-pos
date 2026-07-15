"use client";
import { useChartAccounts, useSeedAccounts } from '@/features/accounts/services/accounts.api';
import { ChartOfAccounts } from '@/features/accounts/components/ChartOfAccounts';
import { Sparkles, Plus } from 'lucide-react';

export default function ChartOfAccountsPage() {
  const { data, refetch } = useChartAccounts();
  const seedAccounts = useSeedAccounts();

  return (
    <div className="space-y-4">
      {data?.length === 0 && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200/50 bg-emerald-50/50 p-4 dark:border-emerald-900/30 dark:bg-emerald-900/10">
          <div>
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-400">Empty Chart of Accounts</h3>
            <p className="text-sm text-emerald-600 dark:text-emerald-500">Seed the default enterprise chart of accounts to get started.</p>
          </div>
          <button
            onClick={() => seedAccounts.mutate(undefined, { onSuccess: () => refetch() })}
            disabled={seedAccounts.isPending}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {seedAccounts.isPending ? 'Seeding...' : 'Seed Default COA'}
          </button>
        </div>
      )}
      
      <div className="flex justify-end mb-2">
         <button className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> New Account
         </button>
      </div>

      <ChartOfAccounts />
    </div>
  );
}
