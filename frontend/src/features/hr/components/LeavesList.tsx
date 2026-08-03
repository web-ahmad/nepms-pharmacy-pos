'use client';

import { useState } from 'react';
import { Plus, Check, X, Loader2, CalendarClock, CheckCircle2, XCircle, CalendarDays, Users } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

import { useLeaveRequests, useApproveLeave, useRejectLeave } from '../services/hr.api';
import { RejectReasonModal } from './RejectReasonModal';
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
  const [rejecting, setRejecting] = useState<any>(null);

  const pendingApprovals = leaves?.filter(l => l.status === 'Pending').length || 0;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const approvedCurrentMonth = leaves?.filter(l => {
    if (l.status !== 'Approved') return false;
    const sd = new Date(l.start_date);
    return sd.getMonth() === currentMonth && sd.getFullYear() === currentYear;
  }).length || 0;

  const rejectedCount = leaves?.filter(l => l.status === 'Rejected').length || 0;
  const totalCount = leaves?.length || 0;

  const handleApprove = (id: string) => {
    setProcessingId(id);
    approveLeave(id, {
      onSuccess: () => {
        toast.success('Leave request approved');
        setProcessingId(null);
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.detail || 'Failed to approve leave request';
        toast.error(typeof msg === 'string' ? msg : 'Failed to approve leave request');
        setProcessingId(null);
      }
    });
  };

  const handleReject = (rejection_reason: string) => {
    const id = rejecting.id;
    setProcessingId(id);
    rejectLeave({ id, rejection_reason }, {
      onSuccess: () => {
        toast.success('Leave request rejected');
        setProcessingId(null);
        setRejecting(null);
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.detail || 'Failed to reject leave request';
        toast.error(typeof msg === 'string' ? msg : 'Failed to reject leave request');
        setProcessingId(null);
      }
    });
  };

  const getStatusBadge = (status: string) => {
    const base = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset';
    switch (status) {
      case 'Draft':
        return <span className={`${base} bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-300 dark:ring-zinc-700`}><CalendarClock size={13} /> Draft</span>;
      case 'Approved':
        return <span className={`${base} bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-300 dark:ring-emerald-800`}><CheckCircle2 size={13} /> Approved</span>;
      case 'Rejected':
        return <span className={`${base} bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/25 dark:text-red-300 dark:ring-red-800`}><XCircle size={13} /> Rejected</span>;
      case 'Cancelled':
        return <span className={`${base} bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:ring-zinc-700`}><XCircle size={13} /> Cancelled</span>;
      case 'Pending':
      default:
        return <span className={`${base} bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/25 dark:text-amber-300 dark:ring-amber-800`}><CalendarClock size={13} /> Pending</span>;
    }
  };

  const initials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
  };

  const stats = [
    { label: 'Pending Approvals', value: pendingApprovals, icon: CalendarClock, accent: 'amber' },
    { label: 'Approved (This Month)', value: approvedCurrentMonth, icon: CheckCircle2, accent: 'emerald' },
    { label: 'Rejected', value: rejectedCount, icon: XCircle, accent: 'red' },
    { label: 'Total Requests', value: totalCount, icon: Users, accent: 'blue' },
  ] as const;

  const accentMap: Record<string, string> = {
    amber: 'from-amber-500 to-orange-500 text-amber-600 dark:text-amber-400',
    emerald: 'from-emerald-500 to-green-600 text-emerald-600 dark:text-emerald-400',
    red: 'from-red-500 to-rose-600 text-red-600 dark:text-red-400',
    blue: 'from-blue-500 to-indigo-600 text-blue-600 dark:text-blue-400',
  };

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25">
              <CalendarDays size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Leave Requests</h2>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Manage employee leave applications &amp; approvals
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:brightness-105 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
          >
            <Plus size={16} />
            New Leave Request
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-5"
          >
            <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-10 blur-xl transition-opacity group-hover:opacity-20 ${accentMap[accent]}`} />
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${accentMap[accent]}`}>
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
                <p className="text-2xl font-bold leading-tight text-zinc-900 dark:text-zinc-50">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Data Grid */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
            <thead className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Leave Type</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Days</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-500" />
                  </td>
                </tr>
              ) : !leaves || leaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-zinc-400">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800/60">
                        <CalendarDays size={26} className="text-zinc-400" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-600 dark:text-zinc-300">No leave requests yet</p>
                        <p className="text-xs text-zinc-400">Leave applications will appear here.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => {
                  const days = Math.abs(differenceInDays(new Date(leave.end_date), new Date(leave.start_date))) + 1;
                  const isProcessingThis = processingId === leave.id;
                  const isPending = leave.status === 'Pending';

                  return (
                    <tr key={leave.id} className="transition-colors hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-xs font-bold text-white">
                            {initials(leave.employee_name)}
                          </div>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {leave.employee_name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {leave.leave_type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                          <span>{format(new Date(leave.start_date), 'MMM d, yyyy')}</span>
                          <span className="text-zinc-300 dark:text-zinc-600">→</span>
                          <span>{format(new Date(leave.end_date), 'MMM d, yyyy')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300">
                          {days} Day{days !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="max-w-[200px] truncate text-zinc-600 dark:text-zinc-400" title={leave.reason}>
                          {leave.reason || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(leave.status)}
                      </td>
                      <td className="px-6 py-4">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(leave.id)}
                              disabled={isProcessingThis || isApproving || isRejecting}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 transition-all hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-900/25 dark:text-emerald-300 dark:ring-emerald-800 dark:hover:bg-emerald-900/40"
                            >
                              {isProcessingThis && isApproving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                              Approve
                            </button>
                            <button
                              onClick={() => setRejecting(leave)}
                              disabled={isProcessingThis || isApproving || isRejecting}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200 transition-all hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/25 dark:text-red-300 dark:ring-red-800 dark:hover:bg-red-900/40"
                            >
                              {isProcessingThis && isRejecting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <span className="text-xs text-zinc-400">No action</span>
                          </div>
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

      {rejecting && (
        <RejectReasonModal
          title="Reject leave request"
          subject={`${rejecting.leave_type || 'Leave'} · ${rejecting.employee_name || 'Employee'}`}
          isPending={isRejecting}
          onCancel={() => setRejecting(null)}
          onConfirm={handleReject}
        />
      )}
    </div>
  );
}
