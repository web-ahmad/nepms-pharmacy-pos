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
                <th className="px-4 py-3 font-medium">Staff ID</th>
                <th className="px-4 py-3 font-medium text-right">Expected</th>
                <th className="px-4 py-3 font-medium text-right">Actual</th>
                <th className="px-4 py-3 font-medium text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {!data || data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">No shift data available.</td>
                </tr>
              ) : (
                data.map((row: any) => {
                  const variance = Number(row.variance);
                  const isNegative = variance < 0;
                  const isPositive = variance > 0;
                  
                  return (
                    <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="px-4 py-3">{row.shift_date}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.staff_id}</td>
                      <td className="px-4 py-3 text-right">${Number(row.expected_cash).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">${Number(row.actual_cash).toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${isNegative ? 'text-red-600 dark:text-red-400' : isPositive ? 'text-green-600 dark:text-green-400' : 'text-zinc-500'}`}>
                        {isPositive ? '+' : ''}${variance.toFixed(2)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
