'use client';

import { useCashReconciliation } from '../hooks/useAuditData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function CashReconciliationTable({ branchId }: { branchId?: string }) {
  const { data, isLoading, error } = useCashReconciliation(branchId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-red-500">
          Failed to load cash reconciliation data.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cash Reconciliation</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-y border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 font-medium">Shift Date</th>
                <th className="px-4 py-3 font-medium">Cashier</th>
                <th className="px-4 py-3 font-medium text-right">Expected (Rs)</th>
                <th className="px-4 py-3 font-medium text-right">Actual (Rs)</th>
                <th className="px-4 py-3 font-medium text-right">Variance</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {!data || data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No shift data available.</td>
                </tr>
              ) : (
                data.map((row: any) => {
                  const variance = Number(row.variance);
                  const isShort = variance < 0;
                  const isOver  = variance > 0;

                  return (
                    <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="px-4 py-3">{row.shift_date}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{row.staff_name || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">Rs {Number(row.expected_cash).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">Rs {Number(row.actual_cash).toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${isShort ? 'text-red-600 dark:text-red-400' : isOver ? 'text-green-600 dark:text-green-400' : 'text-zinc-500'}`}>
                        {isOver ? '+' : ''}Rs {variance.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isShort ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">SHORT</span>
                        ) : isOver ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">OVER</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">BALANCED</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
