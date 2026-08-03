'use client';

import { CheckSquare, Flag, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMyTasks, useUpdateMyTaskStatus } from '@/features/hr/services/hr.api';
import {
  EssHeader, StatCards, TableShell, LoadingRow, EmptyRow, StatusPill,
  inputCls, rowCls, cellCls,
} from '@/features/hr/components/ess-ui';

// Staff can move a task along but never cancel or reassign it.
const STATUSES = ['Pending', 'In Progress', 'Completed'];

const PRIORITY_MAP: Record<string, string> = {
  Critical: 'text-red-600 dark:text-red-400',
  High: 'text-orange-600 dark:text-orange-400',
  Medium: 'text-blue-600 dark:text-blue-400',
  Low: 'text-zinc-500 dark:text-zinc-400',
};

export default function MyTasksPage() {
  const { data, isLoading } = useMyTasks();
  const update = useUpdateMyTaskStatus();

  const rows = data ?? [];
  const count = (s: string) => rows.filter((t) => t.status === s).length;

  const setStatus = (id: string, status: string) => {
    update.mutate({ id, status }, {
      onSuccess: () => toast.success('Task updated.'),
      onError: (e: any) => toast.error(e?.response?.data?.detail || 'Could not update task.'),
    });
  };

  return (
    <div className="space-y-6">
      <EssHeader icon={CheckSquare} title="My Tasks" subtitle="Tasks assigned to you — update your progress" />

      <StatCards
        items={[
          { label: 'Total', value: rows.length },
          { label: 'Pending', value: count('Pending') },
          { label: 'In Progress', value: count('In Progress') },
          { label: 'Completed', value: count('Completed') },
        ]}
      />

      <TableShell headers={['Task', 'Priority', 'Due', 'Status']}>
        {isLoading ? (
          <LoadingRow colSpan={4} />
        ) : !rows.length ? (
          <EmptyRow colSpan={4} text="No tasks have been assigned to you yet." />
        ) : (
          rows.map((t) => (
            <tr key={t.id} className={rowCls}>
              <td className={cellCls}>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{t.title}</p>
                {t.description && <p className="max-w-xs truncate text-xs text-zinc-400">{t.description}</p>}
              </td>
              <td className={cellCls}>
                <span className={`inline-flex items-center gap-1 font-semibold ${PRIORITY_MAP[t.priority] || PRIORITY_MAP.Low}`}>
                  <Flag size={13} /> {t.priority || 'Medium'}
                </span>
              </td>
              <td className={`${cellCls} text-zinc-600 dark:text-zinc-300`}>{t.due_date?.slice(0, 10) || '—'}</td>
              <td className={cellCls}>
                {t.status === 'Cancelled' ? (
                  <StatusPill value={t.status} />
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={STATUSES.includes(t.status) ? t.status : 'Pending'}
                      onChange={(e) => setStatus(t.id, e.target.value)}
                      disabled={update.isPending}
                      className={`${inputCls} w-auto`}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {update.isPending && <Loader2 size={14} className="animate-spin text-zinc-400" />}
                  </div>
                )}
              </td>
            </tr>
          ))
        )}
      </TableShell>
    </div>
  );
}
