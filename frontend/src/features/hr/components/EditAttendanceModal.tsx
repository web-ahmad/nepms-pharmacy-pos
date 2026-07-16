'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

import { Attendance } from '../types/hr';
import { useUpdateAttendance } from '../services/hr.api';
import { parseApiError } from '@/utils/errorParser';

const schema = z.object({
  clock_in_time: z.string().optional(),
  clock_out_time: z.string().optional(),
  status: z.enum(['Present', 'Late', 'Absent', 'Half Day', 'Leave', 'Holiday', 'Weekend']),
});

type FormData = z.infer<typeof schema>;

interface EditAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Attendance | null;
}

// Helpers for input type="time" (HH:MM format required)
function toTimeInput(isoString?: string) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function EditAttendanceModal({
  isOpen,
  onClose,
  record,
}: EditAttendanceModalProps) {
  const { mutateAsync: updateAttendance } = useUpdateAttendance();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const currentStatus = watch('status');
  const isTimeDisabled = ['Absent', 'Leave', 'Weekend', 'Holiday'].includes(currentStatus);

  useEffect(() => {
    if (record) {
      reset({
        clock_in_time: toTimeInput(record.clock_in),
        clock_out_time: toTimeInput(record.clock_out),
        status: record.status as any,
      });
    }
  }, [record, reset]);

  // Auto-clear logic
  useEffect(() => {
    if (isTimeDisabled) {
      setValue('clock_in_time', '');
      setValue('clock_out_time', '');
    }
  }, [currentStatus, isTimeDisabled, setValue]);

  if (!isOpen || !record) return null;

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Convert HH:MM back to full ISO string for the date of the record
      const baseDate = new Date(record.date); // typically YYYY-MM-DD
      
      let newClockIn: string | null = null;
      let newClockOut: string | null = null;

      // Only send times if the status expects them
      if (!isTimeDisabled) {
        if (data.clock_in_time) {
          const [h, m] = data.clock_in_time.split(':').map(Number);
          const inDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), h, m);
          newClockIn = new Date(inDate.getTime() - (inDate.getTimezoneOffset() * 60000)).toISOString();
        }
        
        if (data.clock_out_time) {
          const [h, m] = data.clock_out_time.split(':').map(Number);
          const outDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), h, m);
          newClockOut = new Date(outDate.getTime() - (outDate.getTimezoneOffset() * 60000)).toISOString();
        }
      }

      await updateAttendance({
        id: record.id,
        data: {
          clock_in: newClockIn as any,
          clock_out: newClockOut as any,
          status: data.status,
        },
      });
      
      toast.success('Attendance updated successfully');
      onClose();
    } catch (err: any) {
      toast.error(parseApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = record.date 
    ? new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown Date';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-950 dark:border dark:border-zinc-800">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Calendar size={18} className="text-blue-500" />
              Edit Daily Attendance
            </h2>
            <p className="text-sm font-medium text-zinc-500 mt-1">
              {record.employee_name || record.employee_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Read-Only Date Field */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Date
            </label>
            <div className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 cursor-not-allowed">
              {formattedDate}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Clock In */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Check-in Time
              </label>
              <input
                type="time"
                disabled={isTimeDisabled}
                {...register('clock_in_time')}
                className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 disabled:opacity-50 disabled:bg-zinc-50 dark:disabled:bg-zinc-900 disabled:cursor-not-allowed"
              />
            </div>

            {/* Clock Out */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Check-out Time
              </label>
              <input
                type="time"
                disabled={isTimeDisabled}
                {...register('clock_out_time')}
                className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 disabled:opacity-50 disabled:bg-zinc-50 dark:disabled:bg-zinc-900 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Status Override
            </label>
            <select
              {...register('status')}
              className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800"
            >
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Half Day">Half Day</option>
              <option value="Absent">Absent</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
