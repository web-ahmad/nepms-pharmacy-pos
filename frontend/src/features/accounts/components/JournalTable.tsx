import { JournalEntry } from '../types/accounts';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface JournalTableProps {
  data: JournalEntry[];
  isLoading: boolean;
}

export default function JournalTable({ data, isLoading }: JournalTableProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="h-6 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="text-center text-zinc-500">
          <p className="font-medium">No journal entries found.</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(val);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Reference</th>
              <th className="px-6 py-3 font-medium">Description</th>
              <th className="px-6 py-3 font-medium text-right">Debit</th>
              <th className="px-6 py-3 font-medium text-right">Credit</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.map((journal) => {
              const totalDebit = journal.lines.reduce((sum, line) => sum + line.debit, 0);
              const totalCredit = journal.lines.reduce((sum, line) => sum + line.credit, 0);
              return (
                <tr key={journal.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-xs">{format(new Date(journal.date), 'MMM dd, yyyy')}</td>
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{journal.reference}</td>
                  <td className="px-6 py-4">{journal.description}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right font-mono">{formatCurrency(totalDebit)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right font-mono">{formatCurrency(totalCredit)}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {journal.status === 'Approved' ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Approved</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
