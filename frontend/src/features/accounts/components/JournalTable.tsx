import { JournalEntry } from '../types/accounts';
import { Printer, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { DataExportMenu, ExportColumn } from '@/components/ui/DataExportMenu';
import Link from 'next/link';

interface Props { data: JournalEntry[]; isLoading: boolean; }

const fmt = (v: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(v);

export default function JournalTable({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-zinc-800" />)}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300/50 bg-white/50 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/50 gap-3 shadow-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20">
          <Printer className="h-6 w-6 text-indigo-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">No journal entries found</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Make a POS sale or click Force Rebuild to auto-post.</p>
        </div>
      </div>
    );
  }

  const exportColumns: ExportColumn[] = [
    { header: 'Date', accessorKey: (row: JournalEntry) => format(new Date(row.date), 'yyyy-MM-dd') },
    { header: 'Reference', accessorKey: 'reference' },
    { header: 'Description', accessorKey: 'description' },
    { header: 'Debit', accessorKey: (row: JournalEntry) => row.lines.reduce((s, l) => s + l.debit, 0) },
    { header: 'Credit', accessorKey: (row: JournalEntry) => row.lines.reduce((s, l) => s + l.credit, 0) },
    { header: 'Status', accessorKey: 'status' }
  ];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-zinc-500">{data.length} entries</span>
        <DataExportMenu 
          title="Journal Entries Report" 
          data={data} 
          columns={exportColumns} 
          fileName="journal_entries"
        />
      </div>

      <div id="jnl-print-area" className="overflow-hidden rounded-2xl border border-gray-200/50 bg-white/70 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/50 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200/50 dark:border-gray-700/50">
                {['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Status'].map((h) => (
                  <th key={h} className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${h === 'Debit' || h === 'Credit' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
              {data.map((j) => {
                const totalDebit  = j.lines.reduce((s, l) => s + l.debit, 0);
                const totalCredit = j.lines.reduce((s, l) => s + l.credit, 0);
                return (
                  <tr key={j.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {format(new Date(j.date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-zinc-100 whitespace-nowrap font-mono text-xs">
                      {j.reference.startsWith('INV-') || j.reference.startsWith('POS-') ? (
                        <Link href={`/sales?invoice=${j.reference}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">
                          {j.reference}
                        </Link>
                      ) : j.reference.startsWith('RET-') ? (
                        <Link href={`/sales?invoice=${j.reference}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">
                          {j.reference}
                        </Link>
                      ) : j.reference.startsWith('PO-') ? (
                        <Link href={`/purchase/invoices/${j.reference}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">
                          {j.reference}
                        </Link>
                      ) : j.reference.startsWith('EXP-') ? (
                        <Link href={`/accounts/expenses?view_expense=${j.reference}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">
                          {j.reference}
                        </Link>
                      ) : (
                        j.reference
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 max-w-xs truncate">{j.description}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmt(totalDebit)}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmt(totalCredit)}</td>
                    <td className="px-6 py-4">
                      {j.status === 'Approved'
                        ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20"><CheckCircle className="h-3.5 w-3.5" />Approved</span>
                        : <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-500/10 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-500/20 dark:text-gray-400 border border-gray-500/20"><Clock className="h-3.5 w-3.5" />Draft</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 px-5 py-3 text-xs text-gray-400 dark:text-zinc-500">
          Showing {data.length} journal entries (most recent first)
        </div>
      </div>
    </div>
  );
}
