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
      <div className="flex h-60 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 gap-2">
        <p className="text-sm font-medium text-gray-400 dark:text-zinc-500">No journal entries yet.</p>
        <p className="text-xs text-gray-400 dark:text-zinc-600">Make a POS sale or click Force Rebuild to auto-post.</p>
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

      <div id="jnl-print-area" className="overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900">
                {['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Status'].map((h) => (
                  <th key={h} className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 ${h === 'Debit' || h === 'Credit' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
              {data.map((j) => {
                const totalDebit  = j.lines.reduce((s, l) => s + l.debit, 0);
                const totalCredit = j.lines.reduce((s, l) => s + l.credit, 0);
                return (
                  <tr key={j.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500 dark:text-zinc-400 whitespace-nowrap">
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
                    <td className="px-5 py-3.5 text-gray-600 dark:text-zinc-400 max-w-xs truncate">{j.description}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-gray-900 dark:text-zinc-100 whitespace-nowrap">{fmt(totalDebit)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-gray-900 dark:text-zinc-100 whitespace-nowrap">{fmt(totalCredit)}</td>
                    <td className="px-5 py-3.5">
                      {j.status === 'Approved'
                        ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle className="h-3 w-3" />Approved</span>
                        : <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"><Clock className="h-3 w-3" />Draft</span>
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
