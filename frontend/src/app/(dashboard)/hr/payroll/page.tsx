"use client";

import { usePayrollRuns } from '@/features/hr/services/hr.api';
import { useState } from 'react';
import PayrollRunModal from '@/features/hr/components/PayrollRunModal';
import { Button } from '@/components/ui/button';
import { Plus, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';

export default function PayrollPage() {
  const { data, isLoading } = usePayrollRuns();
  const [showModal, setShowModal] = useState(false);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Payroll History</h2>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Run Payroll Batch
        </Button>
      </div>

      {showModal && <PayrollRunModal onClose={() => setShowModal(false)} />}

      {isLoading ? (
        <div className="animate-pulse space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="h-6 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Period</th>
                  <th className="px-6 py-3 font-medium text-right">Total Gross</th>
                  <th className="px-6 py-3 font-medium text-right">Deductions</th>
                  <th className="px-6 py-3 font-medium text-right">Net Payout</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Generated On</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {data?.map((run) => (
                  <tr key={run.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="whitespace-nowrap px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100">
                      {run.month}/{run.year}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-mono">{formatCurrency(run.total_gross)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-red-600 dark:text-red-400">{formatCurrency(run.total_deductions)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(run.total_net)}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {run.status === 'Draft' && <Badge variant="secondary">Draft (Auto-Posted)</Badge>}
                      {run.status === 'Paid' && <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Paid</Badge>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-xs font-mono">{format(new Date(run.created_at), 'MMM dd, yyyy HH:mm')}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Link href={`/hr/payroll/${run.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
