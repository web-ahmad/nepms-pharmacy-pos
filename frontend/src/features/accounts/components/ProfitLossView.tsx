import { ProfitLossResponse } from '../types/accounts';
import { Printer, TrendingUp, TrendingDown } from 'lucide-react';
import { DataExportMenu, ExportColumn } from '@/components/ui/DataExportMenu';

interface Props { data: ProfitLossResponse; isLoading: boolean; }

const fmt = (v: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(v);

function LineItem({ name, amount }: { name: string; amount: number }) {
  return (
    <div className="flex items-center justify-between py-3 px-6 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-xl transition-all group">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{name}</span>
      <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{fmt(amount)}</span>
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          { label: 'Total Revenue',  value: data.total_revenue,  color: 'bg-blue-500/10 border-blue-500/20 dark:bg-blue-500/20', textColor: 'text-blue-600 dark:text-blue-400' },
          { label: 'Total Expenses', value: data.total_expenses, color: 'bg-orange-500/10 border-orange-500/20 dark:bg-orange-500/20',                 textColor: 'text-orange-600 dark:text-orange-400' },
          { label: `Net ${isProfit ? 'Profit' : 'Loss'}`, value: Math.abs(data.net_profit), color: isProfit ? 'bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20 dark:bg-rose-500/20', textColor: isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400' },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border backdrop-blur-xl p-6 shadow-xl transition-all hover:shadow-2xl ${kpi.color}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider ${kpi.textColor}`}>{kpi.label}</p>
            <p className={`text-3xl font-bold mt-2 ${kpi.textColor}`}>{fmt(kpi.value)}</p>
          </div>
        ))}
      </div>

      <div id="pl-print-area" className="rounded-2xl border border-gray-200/50 bg-white/70 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/50 overflow-hidden shadow-xl">
        {/* Revenue */}
        <div className="border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-2 px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200/50 dark:border-gray-700/50">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Revenue</span>
          </div>
          <div className="py-2 px-2">
            {data.revenue.length > 0
              ? data.revenue.map((item, i) => <LineItem key={i} name={item.account_name} amount={item.amount} />)
              : <p className="text-center text-sm text-gray-400 py-6">No revenue entries</p>
            }
          </div>
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-200/50 dark:border-gray-700/50">
            <span className="text-sm font-bold text-gray-900 dark:text-white">Total Revenue</span>
            <span className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmt(data.total_revenue)}</span>
          </div>
        </div>

        {/* Expenses */}
        <div className="border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-2 px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200/50 dark:border-gray-700/50">
            <TrendingDown className="h-5 w-5 text-rose-500" />
            <span className="text-sm font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Expenses</span>
          </div>
          <div className="py-2 px-2">
            {data.expenses.length > 0
              ? data.expenses.map((item, i) => <LineItem key={i} name={item.account_name} amount={item.amount} />)
              : <p className="text-center text-sm text-gray-400 py-6">No expense entries</p>
            }
          </div>
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-200/50 dark:border-gray-700/50">
            <span className="text-sm font-bold text-gray-900 dark:text-white">Total Expenses</span>
            <span className="font-mono text-lg font-bold text-rose-600 dark:text-rose-400">{fmt(data.total_expenses)}</span>
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
