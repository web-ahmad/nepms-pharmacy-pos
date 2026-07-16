import React, { useState } from 'react';
import { useAdvances, useApproveAdvance } from '../services/hr.api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IssueAdvanceModal } from './IssueAdvanceModal';
import { formatCurrency } from '@/utils/currency';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { DataExportMenu, ExportColumn } from '@/components/ui/DataExportMenu';
import { parseApiError } from '@/utils/errorParser';

export function AdvancesTab() {
  const { data: advances, isLoading } = useAdvances();
  const { mutate: approveAdvance, isPending: isApproving } = useApproveAdvance();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleApprove = (id: string) => {
    if (confirm("Are you sure you want to approve and disburse this advance? This will post to accounting immediately.")) {
      approveAdvance(id, {
        onSuccess: () => toast.success("Advance approved and disbursed"),
        onError: (err: any) => toast.error(parseApiError(err))
      });
    }
  };

  const exportColumns: ExportColumn[] = [
    { header: 'Employee', accessorKey: 'employee_name' },
    { header: 'Amount', accessorKey: 'amount' },
    { header: 'Request Date', accessorKey: (row: any) => row.request_date ? format(new Date(row.request_date), 'yyyy-MM-dd') : '' },
    { header: 'Deduction Month', accessorKey: 'deduction_month' },
    { header: 'Reason', accessorKey: 'reason' },
    { header: 'Status', accessorKey: 'status' }
  ];

  if (isLoading) return <div className="p-4 text-center">Loading advances...</div>;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-100">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Advance Salaries</h3>
          <p className="text-sm text-slate-500">Manage employee salary advances and deductions</p>
        </div>
        <div className="flex gap-2">
          <DataExportMenu 
            title="Advance Salaries" 
            data={advances || []} 
            columns={exportColumns} 
            fileName="advance_salaries"
          />
          <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
            Issue Advance
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
            <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-b border-emerald-100 dark:border-emerald-900">
              <tr>
                <th className="px-6 py-3 font-bold">Employee</th>
                <th className="px-6 py-3 font-bold">Amount</th>
                <th className="px-6 py-3 font-bold">Req Date</th>
                <th className="px-6 py-3 font-bold">Deduct Month</th>
                <th className="px-6 py-3 font-bold">Reason</th>
                <th className="px-6 py-3 font-bold">Status</th>
                <th className="px-6 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {advances?.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">No advances found</td>
              </tr>
            )}
            {advances?.map((adv) => (
              <tr key={adv.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{adv.employee_name}</td>
                <td className="px-6 py-4 text-emerald-700 font-semibold">{formatCurrency(adv.amount)}</td>
                <td className="px-6 py-4 text-xs font-mono">{adv.request_date ? format(new Date(adv.request_date), 'MMM d, yyyy') : '-'}</td>
                <td className="px-6 py-4">
                  <Badge variant="outline" className="bg-slate-100">{adv.deduction_month}</Badge>
                </td>
                <td className="px-6 py-4 max-w-[200px] truncate text-slate-500" title={adv.reason || ''}>
                  {adv.reason || '-'}
                </td>
                <td className="px-6 py-4">
                  <Badge 
                    variant={adv.status === 'Paid' ? 'default' : 'secondary'}
                    className={adv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}
                  >
                    {adv.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  {adv.status === 'Pending' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => handleApprove(adv.id)}
                      disabled={isApproving}
                    >
                      Approve & Pay
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>

      <IssueAdvanceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
