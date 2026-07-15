import { TrialBalanceResponse } from '../types/accounts';
import { Printer, CheckCircle, AlertCircle, Scale } from 'lucide-react';
import { DataExportMenu, ExportColumn } from '@/components/ui/DataExportMenu';
import Link from 'next/link';

interface Props { 
  data: TrialBalanceResponse; 
  isLoading: boolean; 
  dateRange?: { start: string; end: string };
}

const fmt = (v: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(v);

const categoryColors: Record<string, string> = {
  Asset:     'bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20',
  Liability: 'bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-500/20',
  Equity:    'bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-500/20',
  Revenue:   'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20',
  Expense:   'bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20',
};

export default function TrialBalanceTable({ data, isLoading, dateRange }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-10 rounded-xl bg-gray-100 dark:bg-zinc-800" />
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-gray-50 dark:bg-zinc-900" />)}
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300/50 bg-white/50 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/50 gap-3 shadow-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
          <Scale className="h-6 w-6 text-emerald-500" />
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">No ledger balances found</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Run Force Rebuild to recalculate balances.</p>
      </div>
    );
  }

  const balanced = Math.abs(data.total_debit - data.total_credit) < 0.01;

  const exportColumns: ExportColumn[] = [
    { header: 'Code', accessorKey: 'account_code' },
    { header: 'Account Name', accessorKey: 'account_name' },
    { header: 'Category', accessorKey: 'category' },
    { header: 'Debit', accessorKey: 'debit' },
    { header: 'Credit', accessorKey: 'credit' }
  ];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {balanced
            ? <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/20"><CheckCircle className="h-3.5 w-3.5" />Balanced</span>
            : <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/20 px-3 py-1.5 rounded-full border border-rose-500/20"><AlertCircle className="h-3.5 w-3.5" />Unbalanced · variance {fmt(Math.abs(data.total_debit - data.total_credit))}</span>
          }
          <span className="text-xs text-gray-400 dark:text-zinc-500">{data.rows.length} accounts</span>
        </div>
        <div className="flex gap-2">
          <DataExportMenu 
            title="Trial Balance Report" 
            data={data.rows} 
            columns={exportColumns} 
            fileName="trial_balance"
          />
        </div>
      </div>

      {/* Print area */}
      <div id="tb-print-area">
        <div className="overflow-hidden rounded-2xl border border-gray-200/50 bg-white/70 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/50 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200/50 dark:border-gray-700/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Code</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Account Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Debit</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
                {data.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-600 dark:text-gray-400">{row.account_code}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                      <Link 
                        href={`/accounts/account-ledger/${row.account_code}?${new URLSearchParams({
                          ...(dateRange?.start && { start_date: dateRange.start }),
                          ...(dateRange?.end && { end_date: dateRange.end })
                        }).toString()}`}
                        className="text-indigo-600 hover:underline hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                      >
                        {row.account_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${categoryColors[row.category] || 'bg-gray-500/10 text-gray-600 border border-gray-500/20'}`}>
                        {row.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {row.debit > 0 ? fmt(row.debit) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {row.credit > 0 ? fmt(row.credit) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50/80 dark:bg-gray-800/80 border-t-2 border-gray-200 dark:border-gray-700 font-bold">
                  <td colSpan={3} className="px-6 py-4 text-right uppercase tracking-wider text-xs text-gray-500 dark:text-gray-400">Totals</td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-blue-600 dark:text-blue-400">{fmt(data.total_debit)}</td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">{fmt(data.total_credit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

