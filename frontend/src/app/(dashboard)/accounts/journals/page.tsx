"use client";

import { useJournalEntries } from '@/features/accounts/services/accounts.api';
import JournalTable from '@/features/accounts/components/JournalTable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function JournalsPage() {
  const { data, isLoading } = useJournalEntries();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Journal Entries</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Journal Entry
        </Button>
      </div>

      <JournalTable data={data!} isLoading={isLoading} />
    </div>
  );
}
