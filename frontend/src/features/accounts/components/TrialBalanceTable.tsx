import { TrialBalanceResponse } from '../types/accounts';

interface TrialBalanceTableProps {
  data: TrialBalanceResponse;
  isLoading: boolean;
}

export default function TrialBalanceTable({ data, isLoading }: TrialBalanceTableProps) {
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
          <p className="font-medium">No ledger balances found.</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(val);

  const isBalanced = Math.abs(data.total_debit - data.total_credit) < 0.01;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-6 py-3 font-medium">Account Code</th>
                <th className="px-6 py-3 font-medium">Account Name</th>
                <th className="px-6 py-3 font-medium text-right">Debit</th>
                <th className="px-6 py-3 font-medium text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.rows.map((row, i) => (
                <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-zinc-900 dark:text-zinc-100">{row.account_code}</td>
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                    {row.account_name}
                    <span className="ml-2 inline-flex items-center rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {row.category}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right font-mono">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right font-mono">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-zinc-50 font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
              <tr>
                <td colSpan={2} className="px-6 py-4 text-right">Total:</td>
                <td className="px-6 py-4 text-right font-mono">{formatCurrency(data.total_debit)}</td>
                <td className="px-6 py-4 text-right font-mono">{formatCurrency(data.total_credit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {!isBalanced && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Trial Balance Mismatch</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>The total debits do not equal total credits. Variance: {formatCurrency(Math.abs(data.total_debit - data.total_credit))}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
