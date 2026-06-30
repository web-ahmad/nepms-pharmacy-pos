"use client";

import { usePayrollDetails, useEmployees } from '@/features/hr/services/hr.api';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function PayrollDetailsPage() {
  const { id } = useParams();
  const { data: run, isLoading: isRunLoading } = usePayrollDetails(id as string);
  const { data: employees, isLoading: isEmpLoading } = useEmployees();

  const isLoading = isRunLoading || isEmpLoading;

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(val);

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />;
  }

  if (!run) return <div>Payroll run not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Payroll Details: {run.month}/{run.year}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Generated on {format(new Date(run.created_at), 'PPP')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm py-1">Auto-Posted to Accounting</Badge>
          {run.status === 'Draft' && <Badge variant="outline" className="text-sm py-1 text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-900">Unpaid Liability</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Total Gross Base</p>
          <p className="text-2xl font-bold mt-2 font-mono text-zinc-900 dark:text-zinc-100">{formatCurrency(run.total_gross)}</p>
        </div>
        <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Total Deductions</p>
          <p className="text-2xl font-bold mt-2 font-mono text-red-600 dark:text-red-400">{formatCurrency(run.total_deductions)}</p>
        </div>
        <div className="p-6 rounded-xl border border-zinc-200 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-900/50 shadow-sm">
          <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Total Net Payout</p>
          <p className="text-2xl font-bold mt-2 font-mono text-indigo-700 dark:text-indigo-400">{formatCurrency(run.total_net)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 mt-8">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Employee Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-6 py-3 font-medium">Employee</th>
                <th className="px-6 py-3 font-medium text-right">Base Salary</th>
                <th className="px-6 py-3 font-medium text-right">Allowances</th>
                <th className="px-6 py-3 font-medium text-right">Deductions</th>
                <th className="px-6 py-3 font-medium text-right">Net Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {run.lines.map((line) => {
                const emp = employees?.find(e => e.id === line.employee_id);
                return (
                  <tr key={line.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                      {emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown Employee'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-mono">{formatCurrency(line.base_salary)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-green-600 dark:text-green-400">{formatCurrency(line.allowances)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-red-600 dark:text-red-400">{formatCurrency(line.deductions)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(line.net_pay)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
