"use client";
import { useChartAccounts, useSeedAccounts } from '@/features/accounts/services/accounts.api';
import AccountTable from '@/features/accounts/components/AccountTable';
import { Plus, ListTree, Sparkles } from 'lucide-react';

export default function ChartOfAccountsPage() {
  const { data, isLoading, refetch } = useChartAccounts();
  const seedAccounts = useSeedAccounts();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <ListTree className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Chart of Accounts</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500">Master list of all financial accounts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">↻ Refresh</button>
          {data?.length === 0 && (
            <button
              onClick={() => seedAccounts.mutate()}
              disabled={seedAccounts.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {seedAccounts.isPending ? 'Seeding…' : 'Seed Default COA'}
            </button>
          )}
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm">
            <Plus className="h-3.5 w-3.5" /> New Account
          </button>
        </div>
      </div>
      <AccountTable data={data || []} isLoading={isLoading} />
    </div>
  );
}
