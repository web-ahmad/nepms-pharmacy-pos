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
      <p className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${color}`}>{title}</p>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm py-2 px-3 rounded-lg hover:bg-white/40 dark:hover:bg-gray-800/40 transition-colors">
            <span className="text-gray-600 dark:text-gray-300">{item.account_name}</span>
            <span className="font-mono font-medium text-gray-900 dark:text-white">{fmt(item.amount)}</span>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-gray-400 italic px-3 py-2">No entries</p>}
      </div>
      <div className="flex justify-between mt-3 pt-3 border-t border-dashed border-gray-200/50 dark:border-gray-700/50 text-sm font-bold px-3">
        <span className="text-gray-800 dark:text-gray-200">{totalLabel}</span>
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
            <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/20 px-3 py-1.5 rounded-full border border-rose-500/20">
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
      <div className={`rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xl border shadow-lg ${
        isBalanced 
          ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 dark:border-emerald-500/20' 
          : 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20 dark:border-rose-500/20'
      }`}>
        <p className={`text-xs font-bold uppercase tracking-widest ${isBalanced ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
          Accounting Equation: Assets = Liabilities + Equity
        </p>
        <div className="flex gap-4 text-sm font-mono font-bold items-center">
          <span className="text-blue-600 dark:text-blue-400">Assets: {fmt(data.total_assets)}</span>
          <span className="text-gray-400 dark:text-gray-500">=</span>
          <span className="text-purple-600 dark:text-purple-400">L+E: {fmt(totalLE)}</span>
          {isBalanced && <span className="text-emerald-600 dark:text-emerald-400 ml-2">✓ Balanced</span>}
        </div>
      </div>

      {/* Print area — two-column layout */}
      <div id="bs-print-area">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Assets */}
          <div className="rounded-2xl border border-blue-500/20 dark:border-blue-500/20 bg-blue-500/5 backdrop-blur-xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 bg-blue-500/10 dark:bg-blue-500/20 border-b border-blue-500/20 dark:border-blue-500/20">
              <h3 className="text-base font-bold text-blue-800 dark:text-blue-300">Assets</h3>
              <p className="text-[11px] text-blue-600/70 dark:text-blue-400/70 mt-1 uppercase tracking-wider">What the business owns</p>
            </div>
            <div className="p-6 flex-1 min-h-[300px]">
              <Section title="Current & Fixed Assets" items={data.assets} total={data.total_assets} totalLabel="Total Assets" color="text-blue-700 dark:text-blue-400" />
            </div>
          </div>

          {/* Liabilities + Equity */}
          <div className="rounded-2xl border border-purple-500/20 dark:border-purple-500/20 bg-purple-500/5 backdrop-blur-xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 bg-purple-500/10 dark:bg-purple-500/20 border-b border-purple-500/20 dark:border-purple-500/20">
              <h3 className="text-base font-bold text-purple-800 dark:text-purple-300">Liabilities &amp; Equity</h3>
              <p className="text-[11px] text-purple-600/70 dark:text-purple-400/70 mt-1 uppercase tracking-wider">What the business owes &amp; owner's stake</p>
            </div>
            <div className="p-6 flex-1 min-h-[300px] space-y-6">
              <Section title="Liabilities" items={data.liabilities} total={data.total_liabilities} totalLabel="Total Liabilities" color="text-orange-600 dark:text-orange-400" />
              <div className="border-t border-dashed border-purple-200/50 dark:border-purple-700/50 pt-6">
                <Section title="Equity" items={data.equity} total={data.total_equity} totalLabel="Total Equity" color="text-purple-700 dark:text-purple-400" />
              </div>
            </div>
            <div className="px-6 py-5 border-t border-purple-500/20 dark:border-purple-500/20 bg-purple-500/10 dark:bg-purple-500/20 flex justify-between items-center mt-auto">
              <span className="text-sm font-bold text-purple-900 dark:text-purple-200">Total L + E</span>
              <span className="font-mono text-lg font-bold text-purple-700 dark:text-purple-300">{fmt(totalLE)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
