import { ProfitLossResponse } from '../types/accounts';

interface ProfitLossViewProps {
  data: ProfitLossResponse;
  isLoading: boolean;
}

export default function ProfitLossView({ data, isLoading }: ProfitLossViewProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="h-6 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (!data) return null;

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(val);

  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Profit & Loss Statement</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">For the current period</p>
      </div>

      <div className="p-6 space-y-8">
        {/* REVENUE SECTION */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">Revenue</h4>
          <div className="space-y-2">
            {data.revenue.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">{item.account_name}</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-zinc-100 pt-2 text-sm font-semibold dark:border-zinc-800/50">
            <span className="text-zinc-900 dark:text-zinc-100">Total Revenue</span>
            <span className="font-mono text-zinc-900 dark:text-zinc-100">{formatCurrency(data.total_revenue)}</span>
          </div>
        </div>

        {/* EXPENSES SECTION */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">Expenses</h4>
          <div className="space-y-2">
            {data.expenses.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">{item.account_name}</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-zinc-100 pt-2 text-sm font-semibold dark:border-zinc-800/50">
            <span className="text-zinc-900 dark:text-zinc-100">Total Expenses</span>
            <span className="font-mono text-zinc-900 dark:text-zinc-100">{formatCurrency(data.total_expenses)}</span>
          </div>
        </div>
      </div>

      {/* NET PROFIT SECTION */}
      <div className={`border-t px-6 py-4 flex justify-between items-center ${
        data.net_profit >= 0 
          ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/50' 
          : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50'
      }`}>
        <h3 className={`text-lg font-bold ${data.net_profit >= 0 ? 'text-green-900 dark:text-green-400' : 'text-red-900 dark:text-red-400'}`}>
          Net Profit
        </h3>
        <span className={`text-xl font-mono font-bold ${data.net_profit >= 0 ? 'text-green-700 dark:text-green-500' : 'text-red-700 dark:text-red-500'}`}>
          {formatCurrency(data.net_profit)}
        </span>
      </div>
    </div>
  );
}
