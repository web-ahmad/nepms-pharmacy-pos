'use client';

import { useInventoryFlags } from '../hooks/useAuditData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function InventoryAuditTable({ branchId }: { branchId?: string }) {
  const { data, isLoading, error } = useInventoryFlags(branchId);

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
          Failed to load inventory audit flags.
        </CardContent>
      </Card>
    );
  }

  const getFlagBadge = (flag: string) => {
    switch (flag) {
      case 'expired': 
        return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200 text-xs font-semibold">Expired</span>;
      case 'shrinkage': 
        return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded border border-orange-200 text-xs font-semibold">Shrinkage</span>;
      case 'near_expiry':
        return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded border border-yellow-200 text-xs font-semibold">Near Expiry</span>;
      default:
        return <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded border border-zinc-200 text-xs">{flag}</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Inventory Flags</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-y border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Product ID</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium text-right">Expected</th>
                <th className="px-4 py-3 font-medium text-right">Actual</th>
                <th className="px-4 py-3 font-medium text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {!data || data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No inventory flags found.</td>
                </tr>
              ) : (
                data.map((row: any) => (
                  <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-4 py-3 text-xs">{new Date(row.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.product_id}</td>
                    <td className="px-4 py-3">{getFlagBadge(row.flag_type)}</td>
                    <td className="px-4 py-3 text-right">{row.expected_qty}</td>
                    <td className="px-4 py-3 text-right">{row.actual_qty}</td>
                    <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-semibold">{row.variance}</td>
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
