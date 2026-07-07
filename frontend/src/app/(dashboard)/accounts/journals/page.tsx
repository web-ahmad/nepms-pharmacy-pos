"use client";
import { useJournalEntries } from '@/features/accounts/services/accounts.api';
import JournalTable from '@/features/accounts/components/JournalTable';
import CreateJournalDialog from '@/features/accounts/components/CreateJournalDialog';
import { Button } from '@/components/ui/button';
import { Plus, FileSignature } from 'lucide-react';

export default function JournalsPage() {
  const { data, isLoading, refetch } = useJournalEntries();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <FileSignature className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Journal Entries</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500">All double-entry accounting records</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">↻ Refresh</button>
          <CreateJournalDialog>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm">
              <Plus className="h-3.5 w-3.5" /> New Entry
            </button>
          </CreateJournalDialog>
        </div>
      </div>
      <JournalTable data={data!} isLoading={isLoading} />
    </div>
  );
}
