import React, { useState } from 'react';
import { X, Calendar, Clock, User, Info } from 'lucide-react';
import { useEmployees, useCreateAttendance } from '../services/hr.api';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

export default function MarkCustomDateModal({ onClose }: Props) {
  const [date, setDate] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [status, setStatus] = useState('Present');
  const [clockIn, setClockIn] = useState('');
  const [clockOut, setClockOut] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: employees } = useEmployees();
  const createAttendance = useCreateAttendance();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !employeeId || !status) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload: any = {
        employee_id: employeeId,
        date: date,
        status: status,
      };

      if (clockIn) {
        payload.clock_in = new Date(`${date}T${clockIn}:00`).toISOString();
      }
      
      if (clockOut) {
        payload.clock_out = new Date(`${date}T${clockOut}:00`).toISOString();
      }

      await createAttendance.mutateAsync(payload);
      toast.success('Custom attendance recorded successfully');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to record attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <Calendar className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Mark Custom Date</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Manually add backdated attendance. Times are optional for full-day leaves/absences.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Employee <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <select
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-zinc-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                >
                  <option value="">Select an employee...</option>
                  {employees?.filter(e => e.is_active).map(e => (
                    <option key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.employee_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                max={new Date().toISOString().split('T')[0]}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Half Day">Half Day</option>
                <option value="Leave">Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Clock In (Optional)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="time"
                    value={clockIn}
                    onChange={(e) => setClockIn(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Clock Out (Optional)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="time"
                    value={clockOut}
                    onChange={(e) => setClockOut(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
