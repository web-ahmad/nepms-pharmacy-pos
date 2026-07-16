'use client';

import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useEmployees, useCreateLeaveRequest } from '../services/hr.api';
import { parseApiError } from '@/utils/errorParser';

const schema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  leave_type: z.enum(['Casual', 'Sick', 'Annual', 'Maternity/Paternity', 'Unpaid']),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  reason: z.string().min(3, 'Reason is required'),
}).refine(data => {
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date);
  }
  return true;
}, {
  message: "End date cannot be before start date",
  path: ["end_date"]
});

type FormData = z.infer<typeof schema>;

interface AddLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddLeaveModal({ isOpen, onClose }: AddLeaveModalProps) {
  const { data: employees, isLoading: loadingEmployees } = useEmployees();
  const { mutateAsync: createLeave } = useCreateLeaveRequest();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      leave_type: 'Casual',
    },
  });

  const startDate = watch('start_date');
  const endDate = watch('end_date');

  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  }, [startDate, endDate]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      await createLeave(data);
      toast.success('Leave request submitted successfully');
      reset();
      onClose();
    } catch (err: any) {
      toast.error(parseApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-0">
      <div 
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-zinc-950 dark:border dark:border-zinc-800"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">New Leave Request</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Employee
              </label>
              <select
                {...register('employee_id')}
                disabled={loadingEmployees}
                className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:text-zinc-100 disabled:opacity-50"
              >
                <option value="">Select an employee...</option>
                {employees?.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_id})
                  </option>
                ))}
              </select>
              {errors.employee_id && (
                <p className="mt-1.5 text-xs text-red-500">{errors.employee_id.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Leave Type
              </label>
              <select
                {...register('leave_type')}
                className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:text-zinc-100"
              >
                <option value="Casual">Casual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Annual">Annual Leave</option>
                <option value="Maternity/Paternity">Maternity/Paternity</option>
                <option value="Unpaid">Unpaid Leave</option>
              </select>
              {errors.leave_type && (
                <p className="mt-1.5 text-xs text-red-500">{errors.leave_type.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Start Date
                </label>
                <input
                  type="date"
                  {...register('start_date')}
                  className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:text-zinc-100"
                />
                {errors.start_date && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.start_date.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  End Date
                </label>
                <input
                  type="date"
                  {...register('end_date')}
                  className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:text-zinc-100"
                />
                {errors.end_date && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.end_date.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Total Days
              </label>
              <input
                type="text"
                value={totalDays > 0 ? `${totalDays} Day${totalDays > 1 ? 's' : ''}` : '—'}
                disabled
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Reason
              </label>
              <textarea
                {...register('reason')}
                rows={3}
                placeholder="Brief reason for the leave request..."
                className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:text-zinc-100"
              />
              {errors.reason && (
                <p className="mt-1.5 text-xs text-red-500">{errors.reason.message}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                Submit Request
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
