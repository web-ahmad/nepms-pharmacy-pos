'use client';

import { useState } from 'react';
import { CheckSquare, Plus, Trash2, Loader2, Flag } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  useEmployeeTasks, useCreateEmployeeTask, useUpdateEmployeeTask, useDeleteEmployeeTask,
} from '@/features/hr/services/hr.api';
import { HrModal, Field, inputCls, EmployeeSelect } from '@/features/hr/components/hr-shared';
import type { EmployeeTask } from '@/features/hr/types/hr';

const STATUS = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
const STATUS_MAP: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  Cancelled: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};
const PRIORITY_MAP: Record<string, string> = {
  High: 'text-red-600 dark:text-red-400', Medium: 'text-amber-600 dark:text-amber-400', Low: 'text-zinc-500',
};

function StatusSelect({ task }: { task: EmployeeTask }) {
  const update = useUpdateEmployeeTask(task.id);
  return (
    <select value={task.status} onChange={(e) => update.mutate({ status: e.target.value })}
      className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${STATUS_MAP[task.status]}`}>
      {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

export default function TasksPage() {
  const { data: tasks, isLoading } = useEmployeeTasks();
  const create = useCreateEmployeeTask();
  const del = useDeleteEmployeeTask();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<EmployeeTask>>({ status: 'Pending', priority: 'Medium' });

  const save = () => {
    if (!form.employee_id || !form.title) { toast.error('Employee aur title zaroori hai.'); return; }
    toast.promise(create.mutateAsync(form).then(() => { setOpen(false); setForm({ status: 'Pending', priority: 'Medium' }); }),
      { loading: 'Creating task…', success: 'Task created ✅', error: 'Could not create task.' });
  };

  const rows = tasks ?? [];
  const counts = {
    total: rows.length,
    pending: rows.filter((t) => t.status === 'Pending').length,
    progress: rows.filter((t) => t.status === 'In Progress').length,
    done: rows.filter((t) => t.status === 'Completed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg"><CheckSquare size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Employee Tasks</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Assign &amp; track staff tasks</p>
          </div>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-105 active:scale-95">
          <Plus size={16} /> New Task
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Total', counts.total], ['Pending', counts.pending], ['In Progress', counts.progress], ['Completed', counts.done]].map(([label, val]) => (
          <div key={label as string} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{val}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
              <tr><th className="px-6 py-4">Task</th><th className="px-6 py-4">Employee</th><th className="px-6 py-4">Priority</th><th className="px-6 py-4">Due</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-500" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-14 text-center text-sm text-zinc-400">No tasks yet. Use &quot;New Task&quot; to add one.</td></tr>
              ) : rows.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{t.title}</p>
                    {t.description && <p className="max-w-xs truncate text-xs text-zinc-400">{t.description}</p>}
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{t.employee_name || '—'}</td>
                  <td className="px-6 py-4"><span className={`inline-flex items-center gap-1 font-semibold ${PRIORITY_MAP[t.priority || 'Medium']}`}><Flag size={13} /> {t.priority || 'Medium'}</span></td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{t.due_date ? format(new Date(t.due_date), 'dd MMM yyyy') : '—'}</td>
                  <td className="px-6 py-4"><StatusSelect task={t} /></td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => toast.promise(del.mutateAsync(t.id), { loading: 'Deleting…', success: 'Task deleted', error: 'Could not delete' })}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <HrModal open={open} title="New Task" onClose={() => setOpen(false)}
        footer={<>
          <button onClick={() => setOpen(false)} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium dark:border-zinc-700">Cancel</button>
          <button onClick={save} disabled={create.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {create.isPending && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </>}>
        <Field label="Employee *"><EmployeeSelect value={form.employee_id || ''} onChange={(v) => setForm({ ...form, employee_id: v })} /></Field>
        <Field label="Title *"><input className={inputCls} value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Description"><textarea rows={3} className={inputCls} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">
            <select className={inputCls} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {['Low', 'Medium', 'High'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Due Date"><input type="date" className={inputCls} value={form.due_date?.slice(0, 10) || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
        </div>
      </HrModal>
    </div>
  );
}
