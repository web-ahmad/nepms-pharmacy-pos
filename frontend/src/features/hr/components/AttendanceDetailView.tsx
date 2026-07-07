'use client';

import { useState } from 'react';
import { X, CalendarDays, Loader2, CheckCircle2, AlertCircle, Clock, Timer, LogIn, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Employee, Attendance } from '../types/hr';
import { useMonthlyAttendance, useUpdateAttendance } from '../services/hr.api';
import EditAttendanceModal from './EditAttendanceModal';

interface AttendanceDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

const STATUS_STYLE: Record<string, string> = {
  Present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  Late: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  Absent: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  'Half Day': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
  Holiday: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  Weekend: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  Leave: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  Present: <CheckCircle2 size={12} />,
  Late: <AlertCircle size={12} />,
  Absent: <AlertCircle size={12} />,
  'Half Day': <Clock size={12} />,
  Holiday: <CalendarDays size={12} />,
  Weekend: <CalendarDays size={12} />,
  Leave: <CalendarDays size={12} />,
};

function formatTime(isoString?: string) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatHours(hours?: number) {
  if (hours == null) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export default function AttendanceDetailView({
  isOpen,
  onClose,
  employee,
}: AttendanceDetailViewProps) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);

  const { data: logs, isLoading } = useMonthlyAttendance(employee?.id, month, year);
  const { mutateAsync: updateAttendance } = useUpdateAttendance();

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateAttendance({ id, data: { status: newStatus } });
      toast.success('Attendance updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update attendance');
    }
  };

  if (!isOpen || !employee) return null;

  const totalWorkedHours = (logs ?? []).reduce((acc, curr) => acc + (curr.total_hours_worked || 0), 0);
  const totalOvertime = (logs ?? []).reduce((acc, curr) => acc + (curr.overtime || 0), 0);
  const presentCount = (logs ?? []).filter(l => l.status === 'Present').length;
  const absentCount = (logs ?? []).filter(l => l.status === 'Absent').length;
  const lateCount = (logs ?? []).filter(l => l.status === 'Late').length;
  const leaveCount = (logs ?? []).filter(l => l.status === 'Leave').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-0">
      <div
        className="w-full max-w-5xl rounded-xl bg-white shadow-2xl dark:bg-zinc-950 flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Employee Monthly Detail
            </h2>
            <p className="text-sm text-zinc-500">
              {employee.first_name} {employee.last_name} ({employee.employee_id})
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800 flex items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {[year - 1, year, year + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Summary Cards */}
          <div className="flex items-center gap-4">
            <div className="text-center px-4 border-r border-zinc-200 dark:border-zinc-800">
              <p className="text-xs text-zinc-500">Present / Late / Absent / Leave</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{presentCount} / {lateCount} / {absentCount} / {leaveCount}</p>
            </div>
            <div className="text-center px-4 border-r border-zinc-200 dark:border-zinc-800">
              <p className="text-xs text-zinc-500">Total Worked</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatHours(totalWorkedHours)}</p>
            </div>
            <div className="text-center px-4">
              <p className="text-xs text-zinc-500">Total Overtime</p>
              <p className="text-sm font-semibold text-emerald-600">+{formatHours(totalOvertime)}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin text-zinc-400" size={32} />
            </div>
          ) : logs?.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="mx-auto mb-3 h-8 w-8 opacity-40 text-zinc-400" />
              <p className="font-medium text-zinc-900 dark:text-zinc-100">No records found for this month.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50/70 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 whitespace-nowrap"><span className="flex items-center gap-1.5"><LogIn size={13} /> Check In At</span></th>
                    <th className="px-6 py-4 whitespace-nowrap"><span className="flex items-center gap-1.5"><LogOut size={13} /> Check Out At</span></th>
                    <th className="px-6 py-4 whitespace-nowrap"><span className="flex items-center gap-1.5"><Timer size={13} /> Worked Hour</span></th>
                    <th className="px-6 py-4 whitespace-nowrap">Break Time</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4">Overtime</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {logs?.map((rec) => {
                    const statusStyle = STATUS_STYLE[rec.status] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
                    return (
                      <tr key={rec.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                          {rec.date ? new Date(rec.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {rec.clock_in ? <span className="font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">{formatTime(rec.clock_in)}</span> : <span className="text-zinc-400">—</span>}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {rec.clock_out ? <span className="font-mono text-xs font-medium text-red-500 dark:text-red-400">{formatTime(rec.clock_out)}</span> : <span className="text-zinc-400">—</span>}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                          {formatHours(rec.total_hours_worked)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                          {rec.break_time ? `${rec.break_time}h` : '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <select
                            value={rec.status}
                            onChange={(e) => handleStatusChange(rec.id, e.target.value)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 appearance-none text-center ${statusStyle}`}
                          >
                            <option value="Present">Present</option>
                            <option value="Late">Late</option>
                            <option value="Absent">Absent</option>
                            <option value="Half Day">Half Day</option>
                            <option value="Holiday">Holiday</option>
                            <option value="Weekend">Weekend</option>
                            <option value="Leave">Leave</option>
                          </select>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-xs">
                          {rec.overtime ? <span className="text-emerald-600 font-semibold">+{rec.overtime}h</span> : <span className="text-zinc-400">—</span>}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <button
                            onClick={() => setEditingRecord(rec)}
                            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800 dark:hover:text-blue-400 transition-colors"
                            title="Edit Daily Record"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <EditAttendanceModal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
      />
    </div>
  );
}
