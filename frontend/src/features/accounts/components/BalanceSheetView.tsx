import { BalanceSheetResponse } from '../types/accounts';
import { Printer, AlertTriangle } from 'lucide-react';
import { DataExportMenu, ExportColumn } from '@/components/ui/DataExportMenu';

interface Props { data: BalanceSheetResponse; isLoading: boolean; }

const fmt = (v: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(v);

function Section({ title, items, total, totalLabel, color }: {
  title: string; items: { account_name: string; amount: number }[];
  total: number; totalLabel: string; color: string;
}) {
  return (
    <div>
      <p className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${color}`}>{title}</p>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
            <span className="text-gray-600 dark:text-zinc-400">{item.account_name}</span>
            <span className="font-mono font-medium text-gray-900 dark:text-zinc-100">{fmt(item.amount)}</span>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-gray-400 italic px-2 py-1">No entries</p>}
      </div>
      <div className="flex justify-between mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-zinc-700 text-sm font-bold px-2">
        <span className="text-gray-800 dark:text-zinc-200">{totalLabel}</span>
        <span className={`font-mono ${color}`}>{fmt(total)}</span>
      </div>
    </div>
  );
}

export default function BalanceSheetView({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 rounded-xl bg-gray-100 dark:bg-zinc-800" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-72 rounded-2xl bg-gray-50 dark:bg-zinc-900" />
          <div className="h-72 rounded-2xl bg-gray-50 dark:bg-zinc-900" />
        </div>
      </div>
    );
  }
  if (!data) return null;

  const totalLE = data.total_liabilities + data.total_equity;
  const isBalanced = Math.abs(data.total_assets - totalLE) < 0.01;

  const exportData = [
    { section: 'Assets', type: 'Header', account: '', amount: null },
    ...data.assets.map(a => ({ section: 'Assets', type: 'Item', account: a.account_name, amount: a.amount })),
    { section: 'Assets', type: 'Total Assets', account: '', amount: data.total_assets },
    { section: 'Liabilities', type: 'Header', account: '', amount: null },
    ...data.liabilities.map(l => ({ section: 'Liabilities', type: 'Item', account: l.account_name, amount: l.amount })),
    { section: 'Liabilities', type: 'Total Liabilities', account: '', amount: data.total_liabilities },
    { section: 'Equity', type: 'Header', account: '', amount: null },
    ...data.equity.map(e => ({ section: 'Equity', type: 'Item', account: e.account_name, amount: e.amount })),
    { section: 'Equity', type: 'Total Equity', account: '', amount: data.total_equity },
    { section: 'Summary', type: 'Total L+E', account: '', amount: totalLE }
  ];

  const exportColumns: ExportColumn[] = [
    { header: 'Section', accessorKey: 'section' },
    { header: 'Type', accessorKey: 'type' },
    { header: 'Account Name', accessorKey: 'account' },
    { header: 'Amount', accessorKey: 'amount' }
  ];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Balance Sheet</h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Statement of financial position · all approved entries</p>
        </div>
        <div className="flex items-center gap-2">
          {!isBalanced && (
            <span className="flex items-center gap-1 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-3 py-1.5 rounded-full border border-red-200 dark:border-red-800">
              <AlertTriangle className="h-3.5 w-3.5" /> Out of balance
            </span>
          )}
          <DataExportMenu 
            title="Balance Sheet Report" 
            data={exportData} 
            columns={exportColumns} 
            fileName="balance_sheet"
          />
        </div>
      </div>

      {/* Accounting equation banner */}
      <div className={`rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isBalanced ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
        <p className={`text-xs font-bold uppercase tracking-wide ${isBalanced ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
          Accounting Equation: Assets = Liabilities + Equity
        </p>
        <div className="flex gap-4 text-xs font-mono font-bold">
          <span className="text-blue-600 dark:text-blue-400">Assets: {fmt(data.total_assets)}</span>
          <span className="text-gray-400">=</span>
          <span className="text-violet-600 dark:text-violet-400">L+E: {fmt(totalLE)}</span>
          {isBalanced && <span className="text-emerald-600">✓ Balanced</span>}
        </div>
      </div>

      {/* Print area — two-column layout */}
      <div id="bs-print-area">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Assets */}
          <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900">
              <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300">Assets</h3>
              <p className="text-[11px] text-blue-500 dark:text-blue-500 mt-0.5">What the business owns</p>
            </div>
            <div className="p-5 min-h-[260px]">
              <Section title="Current & Fixed Assets" items={data.assets} total={data.total_assets} totalLabel="Total Assets" color="text-blue-700 dark:text-blue-400" />
            </div>
          </div>

          {/* Liabilities + Equity */}
          <div className="rounded-2xl border border-violet-200 dark:border-violet-900 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-violet-50 dark:bg-violet-950/40 border-b border-violet-100 dark:border-violet-900">
              <h3 className="text-sm font-bold text-violet-800 dark:text-violet-300">Liabilities &amp; Equity</h3>
              <p className="text-[11px] text-violet-500 dark:text-violet-500 mt-0.5">What the business owes &amp; owner's stake</p>
            </div>
            <div className="p-5 min-h-[260px] space-y-5">
              <Section title="Liabilities" items={data.liabilities} total={data.total_liabilities} totalLabel="Total Liabilities" color="text-orange-600 dark:text-orange-400" />
              <div className="border-t border-dashed border-gray-200 dark:border-zinc-700 pt-4">
                <Section title="Equity" items={data.equity} total={data.total_equity} totalLabel="Total Equity" color="text-violet-700 dark:text-violet-400" />
              </div>
            </div>
            <div className="px-5 py-4 border-t-2 border-violet-300 dark:border-violet-700 bg-violet-50/60 dark:bg-violet-950/20 flex justify-between items-center">
              <span className="text-sm font-bold text-violet-900 dark:text-violet-200">Total L + E</span>
              <span className="font-mono font-bold text-violet-700 dark:text-violet-300">{fmt(totalLE)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
