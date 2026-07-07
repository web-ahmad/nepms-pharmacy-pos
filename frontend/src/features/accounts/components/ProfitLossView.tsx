import { ProfitLossResponse } from '../types/accounts';
import { Printer, TrendingUp, TrendingDown } from 'lucide-react';
import { DataExportMenu, ExportColumn } from '@/components/ui/DataExportMenu';

interface Props { data: ProfitLossResponse; isLoading: boolean; }

const fmt = (v: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(v);

function LineItem({ name, amount }: { name: string; amount: number }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-4 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors group">
      <span className="text-sm text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-zinc-100">{name}</span>
      <span className="font-mono text-sm font-semibold text-gray-900 dark:text-zinc-100">{fmt(amount)}</span>
    </div>
  );
}

export default function ProfitLossView({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse max-w-3xl mx-auto">
        <div className="h-10 rounded-xl bg-gray-100 dark:bg-zinc-800" />
        <div className="h-64 rounded-2xl bg-gray-50 dark:bg-zinc-900" />
        <div className="h-48 rounded-2xl bg-gray-50 dark:bg-zinc-900" />
      </div>
    );
  }
  if (!data) return null;

  const isProfit = data.net_profit >= 0;
  const grossMarginPct = data.total_revenue > 0
    ? ((data.net_profit / data.total_revenue) * 100).toFixed(1)
    : '0.0';

  const exportData = [
    ...data.revenue.map(r => ({ type: 'Revenue', account: r.account_name, amount: r.amount })),
    { type: 'Total Revenue', account: '', amount: data.total_revenue },
    ...data.expenses.map(e => ({ type: 'Expense', account: e.account_name, amount: e.amount })),
    { type: 'Total Expenses', account: '', amount: data.total_expenses },
    { type: 'Net Profit/Loss', account: '', amount: data.net_profit }
  ];

  const exportColumns: ExportColumn[] = [
    { header: 'Type', accessorKey: 'type' },
    { header: 'Account', accessorKey: 'account' },
    { header: 'Amount', accessorKey: 'amount' }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Profit &amp; Loss Statement</h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Cumulative period · all approved transactions</p>
        </div>
        <DataExportMenu 
          title="Profit and Loss Statement" 
          data={exportData} 
          columns={exportColumns} 
          fileName="profit_and_loss"
        />
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Revenue',  value: data.total_revenue,  color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', textColor: 'text-emerald-700 dark:text-emerald-400' },
          { label: 'Total Expenses', value: data.total_expenses, color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',                 textColor: 'text-red-700 dark:text-red-400' },
          { label: `Net ${isProfit ? 'Profit' : 'Loss'}`, value: Math.abs(data.net_profit), color: isProfit ? 'bg-emerald-600 dark:bg-emerald-700 border-emerald-600' : 'bg-red-600 border-red-600', textColor: 'text-white' },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.color}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${kpi.textColor} opacity-80`}>{kpi.label}</p>
            <p className={`text-xl font-bold font-mono mt-1 ${kpi.textColor}`}>{fmt(kpi.value)}</p>
          </div>
        ))}
      </div>

      {/* Print area */}
      <div id="pl-print-area" className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
        {/* Revenue */}
        <div className="border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Revenue</span>
          </div>
          <div className="py-2 px-1">
            {data.revenue.length > 0
              ? data.revenue.map((item, i) => <LineItem key={i} name={item.account_name} amount={item.amount} />)
              : <p className="text-center text-sm text-gray-400 py-4">No revenue entries</p>
            }
          </div>
          <div className="flex items-center justify-between px-5 py-3 bg-emerald-50/60 dark:bg-emerald-950/20 border-t border-emerald-100 dark:border-emerald-900">
            <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Total Revenue</span>
            <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">{fmt(data.total_revenue)}</span>
          </div>
        </div>

        {/* Expenses */}
        <div className="border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 px-5 py-3 bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">Expenses</span>
          </div>
          <div className="py-2 px-1">
            {data.expenses.length > 0
              ? data.expenses.map((item, i) => <LineItem key={i} name={item.account_name} amount={item.amount} />)
              : <p className="text-center text-sm text-gray-400 py-4">No expense entries</p>
            }
          </div>
          <div className="flex items-center justify-between px-5 py-3 bg-red-50/60 dark:bg-red-950/20 border-t border-red-100 dark:border-red-900">
            <span className="text-sm font-bold text-red-800 dark:text-red-300">Total Expenses</span>
            <span className="font-mono font-bold text-red-800 dark:text-red-300">{fmt(data.total_expenses)}</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className={`flex items-center justify-between px-6 py-5 ${isProfit ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-rose-600'}`}>
          <div>
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{isProfit ? 'Net Profit' : 'Net Loss'}</p>
            <p className="text-2xl font-bold font-mono text-white mt-0.5">{fmt(Math.abs(data.net_profit))}</p>
            <p className="text-xs text-white/60 mt-0.5">Net margin: {grossMarginPct}%</p>
          </div>
          {isProfit ? <TrendingUp className="h-10 w-10 text-white/30" /> : <TrendingDown className="h-10 w-10 text-white/30" />}
        </div>
      </div>
    </div>
  );
}
