import { TrialBalanceResponse } from '../types/accounts';
import { Printer, CheckCircle, AlertCircle, Scale } from 'lucide-react';
import { DataExportMenu, ExportColumn } from '@/components/ui/DataExportMenu';

interface Props { data: TrialBalanceResponse; isLoading: boolean; }

const fmt = (v: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(v);

const categoryColors: Record<string, string> = {
  Asset:     'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Liability: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Equity:    'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  Revenue:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Expense:   'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function TrialBalanceTable({ data, isLoading }: Props) {
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
      <div className="flex h-60 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 gap-2">
        <Scale className="h-8 w-8 text-emerald-300" />
        <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">No ledger balances found. Run Force Rebuild first.</p>
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
            ? <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800"><CheckCircle className="h-3.5 w-3.5" />Balanced</span>
            : <span className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-3 py-1.5 rounded-full border border-red-200 dark:border-red-800"><AlertCircle className="h-3.5 w-3.5" />Unbalanced · variance {fmt(Math.abs(data.total_debit - data.total_credit))}</span>
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
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900">
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Code</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Account Name</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Category</th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Debit</th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
                {data.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-gray-700 dark:text-zinc-300">{row.account_code}</td>
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-zinc-100">{row.account_name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${categoryColors[row.category] || 'bg-gray-100 text-gray-600'}`}>
                        {row.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-900 dark:text-zinc-100">
                      {row.debit > 0 ? fmt(row.debit) : <span className="text-gray-300 dark:text-zinc-600">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-900 dark:text-zinc-100">
                      {row.credit > 0 ? fmt(row.credit) : <span className="text-gray-300 dark:text-zinc-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50 dark:bg-emerald-950/40 border-t-2 border-emerald-300 dark:border-emerald-700 font-bold text-sm">
                  <td colSpan={3} className="px-5 py-4 text-right text-emerald-800 dark:text-emerald-300 uppercase tracking-wide text-xs">Totals</td>
                  <td className="px-5 py-4 text-right font-mono text-emerald-800 dark:text-emerald-300">{fmt(data.total_debit)}</td>
                  <td className="px-5 py-4 text-right font-mono text-emerald-800 dark:text-emerald-300">{fmt(data.total_credit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

