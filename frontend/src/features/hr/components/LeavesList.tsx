'use client';

import { useState } from 'react';
import { Plus, Check, X, Loader2, CalendarClock, CheckCircle2, XCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

import { useLeaveRequests, useApproveLeave, useRejectLeave } from '../services/hr.api';
import AddLeaveModal from './AddLeaveModal';

export default function LeavesList({ 
  employeeId, 
  hideHeader = false 
}: { 
  employeeId?: string; 
  hideHeader?: boolean; 
} = {}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  let { data: leaves, isLoading } = useLeaveRequests();
  if (employeeId && leaves) {
    leaves = leaves.filter(l => l.employee_id === employeeId);
  }
  const { mutate: approveLeave, isPending: isApproving } = useApproveLeave();
  const { mutate: rejectLeave, isPending: isRejecting } = useRejectLeave();

  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingApprovals = leaves?.filter(l => l.status === 'Pending').length || 0;
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const approvedCurrentMonth = leaves?.filter(l => {
    if (l.status !== 'Approved') return false;
    const sd = new Date(l.start_date);
    return sd.getMonth() === currentMonth && sd.getFullYear() === currentYear;
  }).length || 0;

  const rejectedCount = leaves?.filter(l => l.status === 'Rejected').length || 0;

  const handleApprove = (id: string) => {
    setProcessingId(id);
    approveLeave(id, {
      onSuccess: () => {
        toast.success('Leave request approved');
        setProcessingId(null);
      },
      onError: () => {
        toast.error('Failed to approve leave request');
        setProcessingId(null);
      }
    });
  };

  const handleReject = (id: string) => {
    setProcessingId(id);
    rejectLeave(id, {
      onSuccess: () => {
        toast.success('Leave request rejected');
        setProcessingId(null);
      },
      onError: () => {
        toast.error('Failed to reject leave request');
        setProcessingId(null);
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400"><CalendarClock size={14} /> Draft</span>;
      case 'Approved':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle2 size={14} /> Approved</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle size={14} /> Rejected</span>;
      case 'Cancelled':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400"><XCircle size={14} /> Cancelled</span>;
      case 'Pending':
      default:
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"><CalendarClock size={14} /> Pending</span>;
    }
  };

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Leave Requests</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage employee leave applications and balances
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
          >
            <Plus size={16} />
            New Leave Request
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
              <CalendarClock size={20} />
            </div>
            <h3 className="font-medium">Pending Approvals</h3>
          </div>
          <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{pendingApprovals}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/30">
              <CheckCircle2 size={20} />
            </div>
            <h3 className="font-medium">Approved (Current Month)</h3>
          </div>
          <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{approvedCurrentMonth}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
              <XCircle size={20} />
            </div>
            <h3 className="font-medium">Rejected</h3>
          </div>
          <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{rejectedCount}</p>
        </div>
      </div>

      {/* Data Grid */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
              <tr>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Leave Type</th>
                <th className="px-6 py-4 font-medium">Duration</th>
                <th className="px-6 py-4 font-medium">Total Days</th>
                <th className="px-6 py-4 font-medium">Reason</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                  </td>
                </tr>
              ) : !leaves || leaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                    No leave requests found
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => {
                  const days = Math.abs(differenceInDays(new Date(leave.end_date), new Date(leave.start_date))) + 1;
                  const isProcessingThis = processingId === leave.id;

                  return (
                    <tr key={leave.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                        {leave.employee_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {leave.leave_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {format(new Date(leave.start_date), 'MMM d, yyyy')} <span className="text-zinc-400 mx-1">➔</span> {format(new Date(leave.end_date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {days} Day{days !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4">
                        <p className="max-w-[200px] truncate" title={leave.reason}>
                          {leave.reason}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(leave.status)}
                      </td>
                      <td className="px-6 py-4">
                        {leave.status === 'Pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApprove(leave.id)}
                              disabled={isProcessingThis || isApproving || isRejecting}
                              className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-500 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => handleReject(leave.id)}
                              disabled={isProcessingThis || isApproving || isRejecting}
                              className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                              title="Reject"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddLeaveModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </div>
  );
}
