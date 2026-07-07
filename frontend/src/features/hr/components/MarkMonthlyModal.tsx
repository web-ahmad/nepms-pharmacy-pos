'use client';

import { useState } from 'react';
import { X, Loader2, CalendarCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useEmployees, useShifts, useBulkAttendance, useLeaveRequests, useResetMonthlyAttendance } from '../services/hr.api';
import { BulkAttendanceRow } from '../types/hr';

interface MarkMonthlyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MarkMonthlyModal({ isOpen, onClose }: MarkMonthlyModalProps) {
  const { data: employees, isLoading: loadingEmployees } = useEmployees();
  const { data: shifts, isLoading: loadingShifts } = useShifts();
  const { mutateAsync: bulkUpload, isPending: isUploading } = useBulkAttendance();
  const { mutateAsync: resetMonthly, isPending: isResetting } = useResetMonthlyAttendance();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Pre-fetch all leaves
  const { data: leaves } = useLeaveRequests();

  if (!isOpen) return null;

  // Day index → full English name (matches what employee.weekend_days stores)
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleResetClick = () => {
    if (!selectedEmployeeId || !selectedMonth) {
      toast.error('Please select an employee and a month');
      return;
    }
    setShowResetConfirm(true);
  };

  const executeReset = async () => {
    const [year, monthStr] = selectedMonth.split('-');
    
    try {
      await resetMonthly({
        employeeId: selectedEmployeeId,
        month: parseInt(monthStr, 10),
        year: parseInt(year, 10),
      });
      toast.success('Monthly attendance reset successfully.');
      setShowResetConfirm(false);
      onClose();
    } catch (error: any) {
      console.error("Full Axios Error:", error);
      
      const backendMessage = error.response?.data?.detail 
                          || error.response?.data?.error 
                          || error.response?.data?.message 
                          || "Something went wrong.";
      
      // If FastAPI returns an array of validation errors in detail, extract the first message
      const finalMsg = Array.isArray(backendMessage) ? backendMessage[0]?.msg : backendMessage;
      
      toast.error(finalMsg);
    }
  };

  const handleGenerate = async () => {
    if (!selectedEmployeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!selectedMonth) {
      toast.error('Please select a month');
      return;
    }

    const employee = employees?.find((e) => e.id === selectedEmployeeId);
    if (!employee) {
      toast.error('Employee not found');
      return;
    }

    if (!employee.employee_id) {
      toast.error('Employee does not have an assigned EMP code');
      return;
    }

    const shift = shifts?.find((s) => s.id === employee.shift_id);
    if (!shift) {
      toast.error('Employee does not have an assigned shift');
      return;
    }

    // Employee's custom weekend days — the ONLY source of truth for weekends.
    // NO hardcoded Sunday/Saturday fallback. If the array is empty, no days are weekends.
    const customWeekends: string[] = employee.weekend_days ?? [];

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1; // 0-based
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const standardHours =
      shift.end_time && shift.start_time
        ? (new Date(`1970-01-01T${shift.end_time}`).getTime() -
            new Date(`1970-01-01T${shift.start_time}`).getTime()) /
          3600000
        : 8;

    const payload: BulkAttendanceRow[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, monthIndex, day);
      const dayName = DAY_NAMES[currentDate.getDay()]; // e.g. 'Sunday', 'Tuesday'

      // ── STRICTLY use employee's custom weekend_days — NO hardcoded fallback ──
      const isWeekend = customWeekends.includes(dayName);

      const dateStr = [
        year,
        String(monthIndex + 1).padStart(2, '0'),
        String(day).padStart(2, '0'),
      ].join('-');

      // Check for approved leaves overlapping with this date
      const approvedLeave = leaves?.find(
        (l) =>
          l.employee_id === employee.id &&
          l.status === 'Approved' &&
          l.start_date <= dateStr &&
          l.end_date >= dateStr
      );

      if (isWeekend) {
        // Weekend day — explicitly save it with 0 hours and Weekend status
        payload.push({
          employeeId: employee.id,
          date: dateStr,
          checkInAt: null as unknown as string,
          checkOutAt: null as unknown as string,
          workedHour: 0,
          breakTime: 0,
          overtime: 0,
          status: 'Weekend',
          shiftId: shift.id,
        });
      } else if (approvedLeave) {
        payload.push({
          employeeId: employee.id,
          date: dateStr,
          checkInAt: null as unknown as string,
          checkOutAt: null as unknown as string,
          workedHour: 0,
          breakTime: 0,
          overtime: 0,
          status: 'Leave',
          shiftId: shift.id,
        });
      } else {
        payload.push({
          employeeId: employee.id,
          date: dateStr,
          checkInAt: shift.start_time,
          checkOutAt: shift.end_time,
          workedHour: standardHours,
          breakTime: employee.standard_break_time || 0,
          overtime: 0,
          status: 'Present',
          shiftId: shift.id,
        });
      }
    }

    if (payload.length === 0) {
      toast.error('No working days found in the selected month');
      return;
    }

    try {
      const res = await bulkUpload(payload);
      if (res.errors && res.errors.length > 0) {
        toast.error(`Attendance generated with ${res.errors.length} errors`);
        console.warn('Auto-fill Errors:', res.errors);
      } else {
        toast.success('Attendance generated successfully!');
      }
      onClose();
    } catch (error: any) {
      console.error("Full Axios Error:", error);
      
      const backendMessage = error.response?.data?.detail 
                          || error.response?.data?.error 
                          || error.response?.data?.message 
                          || "Something went wrong.";
                          
      // If FastAPI returns an array of validation errors in detail, extract the first message
      const finalMsg = Array.isArray(backendMessage) ? backendMessage[0]?.msg : backendMessage;
      
      toast.error(finalMsg);
    }
  };

  const isLoading = loadingEmployees || loadingShifts;

  // Live weekend preview for the selected employee
  const selectedEmployee = employees?.find((e) => e.id === selectedEmployeeId);
  const customWeekendPreview = selectedEmployee?.weekend_days ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-950 dark:border dark:border-zinc-800">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <CalendarCheck size={20} className="text-blue-500" />
              Mark Monthly
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Auto-fill attendance using each employee&apos;s custom weekend schedule.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Employee Select */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Employee
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800"
              >
                <option value="">Select Employee...</option>
                {employees?.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Month/Year Select */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800"
              />
            </div>

            {/* Dynamic Weekend Preview — shows exactly which days will be skipped */}
            {selectedEmployeeId && (
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                  Weekend Days (from employee profile)
                </p>
                {customWeekendPreview.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {customWeekendPreview.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/30 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-300"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 italic">
                    No custom weekends set — all days will be marked Present.
                  </p>
                )}
              </div>
            )}

            <div className="pt-4 flex justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800 mt-6">
              <button
                type="button"
                onClick={handleResetClick}
                disabled={isResetting || isUploading}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:border-red-900/50 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
                title="Wipe data for this month"
              >
                {isResetting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Reset Month
              </button>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isUploading || isResetting}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {isUploading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog Overlay */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 dark:border dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">Reset Attendance?</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Are you sure you want to delete all attendance records for this month? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeReset}
                disabled={isResetting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isResetting ? <Loader2 size={16} className="animate-spin" /> : null}
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
