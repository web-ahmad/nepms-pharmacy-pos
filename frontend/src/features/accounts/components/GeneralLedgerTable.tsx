import { LedgerResponse } from '../types/accounts';
import { format } from 'date-fns';

interface GeneralLedgerTableProps {
  data: LedgerResponse;
  isLoading: boolean;
}

export default function GeneralLedgerTable({ data, isLoading }: GeneralLedgerTableProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="h-6 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="text-center text-zinc-500">
          <p className="font-medium">No ledger entries found for the selected period.</p>
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
              <th className="px-6 py-3 font-medium">Account</th>
              <th className="px-6 py-3 font-medium">Description</th>
              <th className="px-6 py-3 font-medium text-right">Debit</th>
              <th className="px-6 py-3 font-medium text-right">Credit</th>
              <th className="px-6 py-3 font-medium text-right">Running Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.rows.map((row, i) => (
              <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="whitespace-nowrap px-6 py-4 font-mono text-xs">{format(new Date(row.date), 'MMM dd, yyyy')}</td>
                <td className="whitespace-nowrap px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{row.reference}</td>
                <td className="whitespace-nowrap px-6 py-4 text-zinc-900 dark:text-zinc-100">{row.account_name}</td>
                <td className="px-6 py-4">{row.line_desc || row.journal_desc}</td>
                <td className="whitespace-nowrap px-6 py-4 text-right font-mono">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                <td className="whitespace-nowrap px-6 py-4 text-right font-mono">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                <td className="whitespace-nowrap px-6 py-4 text-right font-mono font-medium text-blue-600 dark:text-blue-400">{formatCurrency(row.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-zinc-50 font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
            <tr>
              <td colSpan={4} className="px-6 py-4 text-right">Total:</td>
              <td className="px-6 py-4 text-right font-mono">{formatCurrency(data.total_debit)}</td>
              <td className="px-6 py-4 text-right font-mono">{formatCurrency(data.total_credit)}</td>
              <td className="px-6 py-4 text-right font-mono text-blue-600 dark:text-blue-400">{formatCurrency(data.closing_balance)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
