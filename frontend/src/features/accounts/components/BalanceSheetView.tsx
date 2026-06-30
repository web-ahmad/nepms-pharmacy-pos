import { BalanceSheetResponse } from '../types/accounts';

interface BalanceSheetViewProps {
  data: BalanceSheetResponse;
  isLoading: boolean;
}

export default function BalanceSheetView({ data, isLoading }: BalanceSheetViewProps) {
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

  const isBalanced = Math.abs(data.total_assets - (data.total_liabilities + data.total_equity)) < 0.01;

  return (
    <div className="space-y-6">
      {!isBalanced && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Balance Sheet Equation Mismatch</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>Assets must equal Liabilities + Equity. The current calculation is out of balance.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ASSETS SECTION (Left Side) */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Assets</h3>
          </div>
          <div className="p-6 space-y-2 min-h-[300px]">
            {data.assets.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">{item.account_name}</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-4 flex justify-between items-center dark:border-zinc-800 dark:bg-zinc-900">
            <span className="font-bold text-zinc-900 dark:text-zinc-100">Total Assets</span>
            <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{formatCurrency(data.total_assets)}</span>
          </div>
        </div>

        {/* LIABILITIES & EQUITY SECTION (Right Side) */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Liabilities & Equity</h3>
          </div>
          <div className="p-6 space-y-8 min-h-[300px]">
            
            {/* Liabilities */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">Liabilities</h4>
              <div className="space-y-2">
                {data.liabilities.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-zinc-700 dark:text-zinc-300">{item.account_name}</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t border-zinc-100 pt-2 text-sm font-semibold dark:border-zinc-800/50">
                <span className="text-zinc-900 dark:text-zinc-100">Total Liabilities</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">{formatCurrency(data.total_liabilities)}</span>
              </div>
            </div>

            {/* Equity */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">Equity</h4>
              <div className="space-y-2">
                {data.equity.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-zinc-700 dark:text-zinc-300">{item.account_name}</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t border-zinc-100 pt-2 text-sm font-semibold dark:border-zinc-800/50">
                <span className="text-zinc-900 dark:text-zinc-100">Total Equity</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">{formatCurrency(data.total_equity)}</span>
              </div>
            </div>

          </div>
          <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-4 flex justify-between items-center dark:border-zinc-800 dark:bg-zinc-900">
            <span className="font-bold text-zinc-900 dark:text-zinc-100">Total L & E</span>
            <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{formatCurrency(data.total_liabilities + data.total_equity)}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
