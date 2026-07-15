import { LedgerResponse } from '../types/accounts';
import { format } from 'date-fns';
import { DataExportMenu, ExportColumn } from '@/components/ui/DataExportMenu';
import Link from 'next/link';
import { getReferenceLink } from '@/utils/auditUtils';
import { useMemo } from 'react';

interface Props { 
  data: LedgerResponse; 
  isLoading: boolean;
  searchRef?: string;
}

const fmt = (v: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(v);

export default function GeneralLedgerTable({ data, isLoading, searchRef = '' }: Props) {
  
  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    if (!searchRef) return data.rows;
    const q = searchRef.toLowerCase();
    return data.rows.filter(row => 
      (row.reference && row.reference.toLowerCase().includes(q)) || 
      (row.line_desc && row.line_desc.toLowerCase().includes(q)) ||
      (row.journal_desc && row.journal_desc.toLowerCase().includes(q))
    );
  }, [data, searchRef]);

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-zinc-800" />)}
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300/50 bg-white/50 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/50 gap-3 shadow-lg">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">No ledger entries found</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Select an account or run Force Rebuild.</p>
      </div>
    );
  }

  const renderReferenceLink = (row: any) => {
    const ref = row.reference || '';
    if (!ref) return <span className="font-mono text-gray-500 dark:text-zinc-500">—</span>;

    const link = getReferenceLink(ref);
    if (link) {
      return (
        <Link href={link} className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold font-mono whitespace-nowrap">
          {ref}
        </Link>
      );
    }
    
    // Fallbacks that are not in getReferenceLink yet
    if (ref.startsWith('PAYROLL-') && row.source_id) {
      return (
        <Link href={`/hr/payroll/${row.source_id}`} className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold font-mono whitespace-nowrap">
          {ref}
        </Link>
      );
    }

    return <span className="font-mono text-gray-500 dark:text-zinc-500 whitespace-nowrap">{ref}</span>;
  };

  const exportColumns: ExportColumn[] = [
    { header: 'Date', accessorKey: (row: any) => format(new Date(row.date), 'yyyy-MM-dd') },
    { header: 'Reference', accessorKey: 'reference' },
    { header: 'Account', accessorKey: 'account_name' },
    { header: 'Description', accessorKey: (row: any) => row.line_desc || row.journal_desc },
    { header: 'Status', accessorKey: 'status' },
    { header: 'Debit', accessorKey: 'debit' },
    { header: 'Credit', accessorKey: 'credit' },
    { header: 'Balance', accessorKey: 'balance' }
  ];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          { label: 'Total Debits',   value: data.total_debit,    color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20 dark:bg-blue-500/20' },
          { label: 'Total Credits',  value: data.total_credit,   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/20' },
          { label: 'Net Balance',    value: data.closing_balance, color: data.closing_balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-rose-600 dark:text-rose-400', bg: 'bg-white/70 dark:bg-gray-900/50 border-gray-200/50 dark:border-gray-700/50' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border backdrop-blur-xl p-6 shadow-xl transition-all hover:shadow-2xl ${s.bg}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`text-3xl font-bold mt-2 ${s.color}`}>{fmt(s.value)}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-zinc-500">{filteredRows.length} entries</span>
        <DataExportMenu 
          title="General Ledger Report" 
          data={filteredRows} 
          columns={exportColumns} 
          fileName="general_ledger"
        />
      </div>

      <div id="gl-print-area" className="overflow-hidden rounded-2xl border border-gray-200/50 bg-white/70 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/50 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200/50 dark:border-gray-700/50">
                {['Date', 'Reference', 'Account', 'Description', 'Status', 'Debit', 'Credit', 'Balance'].map((h) => (
                  <th key={h} className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${['Debit','Credit','Balance'].includes(h) ? 'text-right' : h === 'Status' ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
              {filteredRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                    {format(new Date(row.date), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {renderReferenceLink(row)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-zinc-300 whitespace-nowrap">{row.account_name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-zinc-400 max-w-[200px]">
                    <div className="truncate">{row.line_desc || row.journal_desc}</div>
                    {row.created_by_name && (
                      <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-medium tracking-tight mt-0.5 truncate uppercase">
                        By: {row.created_by_name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {row.status === 'Paid' ? (
                      <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Paid</span>
                    ) : row.status === 'Posted' || row.status === 'Approved' ? (
                      <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{row.status}</span>
                    ) : row.status === 'Pending' ? (
                      <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Pending</span>
                    ) : (
                      <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">Manual</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {row.debit > 0 ? fmt(row.debit) : <span className="text-gray-200 dark:text-zinc-700">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {row.credit > 0 ? fmt(row.credit) : <span className="text-gray-200 dark:text-zinc-700">—</span>}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold whitespace-nowrap ${row.balance >= 0 ? 'text-gray-900 dark:text-zinc-100' : 'text-red-600 dark:text-red-400'}`}>
                    {fmt(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50/80 dark:bg-gray-800/80 border-t-2 border-gray-200 dark:border-gray-700 font-bold">
                <td colSpan={5} className="px-6 py-4 text-right text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Totals</td>
                <td className="px-6 py-4 text-right font-mono text-sm text-blue-600 dark:text-blue-400">{fmt(data.total_debit)}</td>
                <td className="px-6 py-4 text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">{fmt(data.total_credit)}</td>
                <td className={`px-6 py-4 text-right font-mono text-sm ${data.closing_balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>{fmt(data.closing_balance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
