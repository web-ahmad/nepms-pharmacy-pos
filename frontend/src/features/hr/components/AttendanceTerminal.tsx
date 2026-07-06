'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, LogIn, LogOut, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useEmployees } from '../services/hr.api';
import { useTodayAttendance, useClockIn, useClockOut } from '../services/hr.api';

// ─── Helper utilities ───────────────────────────────────────────────
function formatDuration(clockInIso: string): string {
  const from = new Date(clockInIso);
  const now = new Date();
  const diffMs = now.getTime() - from.getTime();
  if (diffMs < 0) return '00h 00m';
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Component ───────────────────────────────────────────────────────
export default function AttendanceTerminal() {
  const [now, setNow] = useState(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load employees for the selector
  const { data: employees, isLoading: empLoading } = useEmployees();

  // Once employees load, default to the first one
  useEffect(() => {
    if (employees && employees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [employees, selectedEmployeeId]);

  // Today's attendance for selected employee
  const {
    data: todayRecord,
    isLoading: recordLoading,
    refetch: refetchRecord,
  } = useTodayAttendance(selectedEmployeeId || null);

  // Update working duration every minute if clocked in
  useEffect(() => {
    if (todayRecord?.clock_in && !todayRecord.clock_out) {
      setDuration(formatDuration(todayRecord.clock_in));
      const interval = setInterval(() => {
        setDuration(formatDuration(todayRecord.clock_in!));
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [todayRecord]);

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();

  const handleClockIn = async () => {
    if (!selectedEmployeeId) return;
    try {
      await clockInMutation.mutateAsync({ employee_id: selectedEmployeeId });
      showToast('success', 'Clocked in successfully!');
      refetchRecord();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Clock-in failed. Please try again.';
      showToast('error', detail);
    }
  };

  const handleClockOut = async () => {
    if (!todayRecord?.id) return;
    try {
      await clockOutMutation.mutateAsync({
        attendance_id: todayRecord.id,
        employee_id: selectedEmployeeId,
      });
      showToast('success', 'Clocked out successfully!');
      refetchRecord();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Clock-out failed. Please try again.';
      showToast('error', detail);
    }
  };

  // Derive terminal state
  const isLoading = empLoading || recordLoading;
  const isClockedIn = !!todayRecord?.clock_in && !todayRecord.clock_out;
  const isClockedOut = !!todayRecord?.clock_in && !!todayRecord.clock_out;
  const isWorking = clockInMutation.isPending || clockOutMutation.isPending;

  const selectedEmployee = employees?.find((e) => e.id === selectedEmployeeId);
  const initials = selectedEmployee
    ? getInitials(`${selectedEmployee.first_name} ${selectedEmployee.last_name}`)
    : '??';

  // Format clock
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 shadow-xl dark:border-zinc-700">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative p-6 md:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
              <Clock size={18} />
            </div>
            <span className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
              Attendance Terminal
            </span>
          </div>
          {/* Live pulse indicator */}
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs text-zinc-500">Live</span>
          </div>
        </div>

        {/* Digital Clock */}
        <div className="mb-6 text-center">
          <div
            className="font-mono text-5xl font-bold tracking-tight text-white md:text-6xl"
            style={{ textShadow: '0 0 30px rgba(59,130,246,0.4)' }}
          >
            {timeStr}
          </div>
          <p className="mt-2 text-sm text-zinc-400">{dateStr}</p>
        </div>

        {/* Employee Selector */}
        <div className="mb-6">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">
            Select Employee
          </label>
          {empLoading ? (
            <div className="h-10 w-full animate-pulse rounded-lg bg-zinc-700" />
          ) : (
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {initials}
              </div>
              <select
                id="att-terminal-employee-select"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {employees?.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} — {emp.employee_id || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Status + Action Area */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Working Duration Display (clocked in) */}
            {isClockedIn && (
              <div className="flex items-center justify-center rounded-xl bg-zinc-800/60 py-4">
                <div className="text-center">
                  <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                    Working Time
                  </p>
                  <p
                    className="mt-1 font-mono text-4xl font-bold text-emerald-400"
                    style={{ textShadow: '0 0 20px rgba(52,211,153,0.4)' }}
                  >
                    {duration}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Started at{' '}
                    {todayRecord?.clock_in
                      ? new Date(todayRecord.clock_in).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })
                      : '--'}
                  </p>
                </div>
              </div>
            )}

            {/* Shift Completed display */}
            {isClockedOut && (
              <div className="flex items-center justify-center rounded-xl bg-zinc-800/60 py-4">
                <div className="text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-400" />
                  <p className="text-sm font-semibold text-zinc-200">Shift Completed</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Total: {todayRecord?.total_hours_worked
                      ? `${todayRecord.total_hours_worked}h`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            )}

            {/* Action Button */}
            {!isClockedOut ? (
              isClockedIn ? (
                <button
                  id="btn-clock-out"
                  onClick={handleClockOut}
                  disabled={isWorking}
                  className="group relative w-full overflow-hidden rounded-xl bg-red-600 py-4 text-base font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isWorking ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <LogOut size={20} />
                      Clock Out
                    </span>
                  )}
                  <span className="absolute inset-0 translate-y-full bg-white/10 transition-transform duration-300 group-hover:translate-y-0" />
                </button>
              ) : (
                <button
                  id="btn-clock-in"
                  onClick={handleClockIn}
                  disabled={isWorking || !selectedEmployeeId}
                  className="group relative w-full overflow-hidden rounded-xl bg-emerald-600 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isWorking ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <LogIn size={20} />
                      Clock In
                    </span>
                  )}
                  <span className="absolute inset-0 translate-y-full bg-white/10 transition-transform duration-300 group-hover:translate-y-0" />
                </button>
              )
            ) : (
              <button
                disabled
                className="w-full cursor-not-allowed rounded-xl bg-zinc-700 py-4 text-base font-semibold text-zinc-500"
              >
                Shift Completed
              </button>
            )}

            {/* Status Badge */}
            {todayRecord && (
              <div className="flex items-center justify-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium ${
                    todayRecord.status === 'Late'
                      ? 'bg-orange-500/20 text-orange-400'
                      : todayRecord.status === 'Present'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {todayRecord.status}
                </span>
                <span className="text-xs text-zinc-600">Today's record</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`absolute bottom-4 right-4 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-xl transition-all ${
            toast.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-900/80 text-emerald-300'
              : 'border-red-500/30 bg-red-900/80 text-red-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
