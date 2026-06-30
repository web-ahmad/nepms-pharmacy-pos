"use client";

import { useChartAccounts, useSeedAccounts } from '@/features/accounts/services/accounts.api';
import AccountTable from '@/features/accounts/components/AccountTable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function ChartOfAccountsPage() {
  const { data, isLoading } = useChartAccounts();
  const seedAccounts = useSeedAccounts();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Chart of Accounts</h2>
        <div className="flex space-x-2">
          {data?.length === 0 && (
            <Button variant="outline" onClick={() => seedAccounts.mutate()} disabled={seedAccounts.isPending}>
              {seedAccounts.isPending ? 'Seeding...' : 'Seed Default COA'}
            </Button>
          )}
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Account
          </Button>
        </div>
      </div>

      <AccountTable data={data || []} isLoading={isLoading} />
    </div>
  );
}
