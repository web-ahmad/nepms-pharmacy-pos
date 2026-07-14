'use client';

import { useStaffRiskScores } from '../hooks/useAuditData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function StaffRiskScoreList({ branchId }: { branchId?: string }) {
  const { data, isLoading, error } = useStaffRiskScores(branchId);

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
          Failed to load staff risk scores.
        </CardContent>
      </Card>
    );
  }

  const getBadgeColor = (level: string) => {
    switch (level) {
      case 'red': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'yellow': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'green':
      default:
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Staff Risk Scores</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-y border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 font-medium">Staff ID</th>
                <th className="px-4 py-3 font-medium text-right">Voids</th>
                <th className="px-4 py-3 font-medium text-right">Refunds</th>
                <th className="px-4 py-3 font-medium text-right">Risk Score</th>
                <th className="px-4 py-3 font-medium text-right">Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {!data || data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">No risk scores available.</td>
                </tr>
              ) : (
                data.map((row: any) => (
                  <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-4 py-3 font-medium font-mono text-xs">{row.staff_id}</td>
                    <td className="px-4 py-3 text-right">{row.void_count}</td>
                    <td className="px-4 py-3 text-right">{row.refund_count}</td>
                    <td className="px-4 py-3 text-right font-semibold">{row.risk_score}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getBadgeColor(row.risk_level)}`}>
                        {row.risk_level.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
