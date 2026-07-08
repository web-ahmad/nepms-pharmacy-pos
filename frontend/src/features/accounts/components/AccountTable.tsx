import { Account } from '../types/accounts';
import { Printer, Edit2, ShieldCheck, Settings, Eye } from 'lucide-react';
import Link from 'next/link';
import { DataExportMenu, ExportColumn } from '@/components/ui/DataExportMenu';

interface Props { data: Account[]; isLoading: boolean; }

const categoryColors: Record<string, string> = {
  Asset:     'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-100 dark:border-blue-800',
  Liability: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-100 dark:border-orange-800',
  Equity:    'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-100 dark:border-violet-800',
  Revenue:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
  Expense:   'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-100 dark:border-red-800',
};

const fmt = (v: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(v);

export default function AccountTable({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-zinc-800" />)}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-60 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 gap-2">
        <p className="text-sm font-medium text-gray-400 dark:text-zinc-500">No accounts found.</p>
        <p className="text-xs text-gray-400 dark:text-zinc-600">Click "Seed Default COA" to create standard accounts.</p>
      </div>
    );
  }

  // Group by category
  const groups: Record<string, Account[]> = {};
  data.forEach(acc => {
    if (!groups[acc.category]) groups[acc.category] = [];
    groups[acc.category].push(acc);
  });

  const exportColumns: ExportColumn[] = [
    { header: 'Code', accessorKey: 'code' },
    { header: 'Account Name', accessorKey: 'name' },
    { header: 'Category', accessorKey: 'category' },
    { header: 'Current Balance', accessorKey: 'current_balance' },
    { header: 'Status', accessorKey: (row: Account) => row.is_active ? 'Active' : 'Inactive' },
    { header: 'Type', accessorKey: (row: Account) => row.is_system ? 'System' : 'Custom' }
  ];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-zinc-500">{data.length} accounts across {Object.keys(groups).length} categories</span>
        <DataExportMenu 
          title="Chart of Accounts" 
          data={data} 
          columns={exportColumns} 
          fileName="chart_of_accounts"
        />
      </div>

      <div id="coa-print-area" className="overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900">
                {['Code', 'Account Name', 'Category', 'Current Balance', 'Status', 'Type', ''].map((h, i) => (
                  <th key={i} className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 ${h === 'Current Balance' ? 'text-right' : h === '' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
              {data.map((acc) => (
                <tr key={acc.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-bold text-xs text-gray-700 dark:text-zinc-300">{acc.code}</td>
                  <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-zinc-100">{acc.name}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${categoryColors[acc.category] || 'bg-gray-100 text-gray-600'}`}>
                      {acc.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-sm font-semibold text-gray-900 dark:text-zinc-100">
                    {fmt(acc.current_balance ?? 0)}
                  </td>
                  <td className="px-5 py-3.5">
                    {acc.is_active
                      ? <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Active</span>
                      : <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">Inactive</span>
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    {acc.is_system
                      ? <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400"><ShieldCheck className="h-3 w-3" />System</span>
                      : <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 dark:text-zinc-500"><Settings className="h-3 w-3" />Custom</span>
                    }
                  </td>
                  <td className="px-5 py-3.5 text-right flex items-center justify-end gap-1">
                    <Link href={`/accounts/account-ledger/${acc.code}`} className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors" title="View Ledger">
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <button className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-gray-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors" title="Edit Account">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 px-5 py-3 text-xs text-gray-400 dark:text-zinc-500">
          {data.length} accounts total
        </div>
      </div>
    </div>
  );
}
