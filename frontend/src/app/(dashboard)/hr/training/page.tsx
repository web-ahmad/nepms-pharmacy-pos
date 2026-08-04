'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GraduationCap, Plus, Trash2, Loader2, User2, Users, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  useTrainingPrograms, useCreateTrainingProgram, useUpdateTrainingProgram, useDeleteTrainingProgram,
} from '@/features/hr/services/hr.api';
import { HrModal, Field, inputCls } from '@/features/hr/components/hr-shared';
import TrainingParticipantsModal from '@/features/hr/components/TrainingParticipantsModal';

const STATUS = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'];
const STATUS_MAP: Record<string, string> = {
  Upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Ongoing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  Cancelled: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

function statusOf(p: any) { return p.completion_status ?? p.status ?? 'Upcoming'; }

function StatusSelect({ program }: { program: any }) {
  const update = useUpdateTrainingProgram(program.id);
  return (
    <select value={statusOf(program)} onChange={(e) => update.mutate({ completion_status: e.target.value } as any)}
      className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${STATUS_MAP[statusOf(program)]}`}>
      {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

export default function TrainingPage() {
  const { data: programs, isLoading } = useTrainingPrograms();
  const create = useCreateTrainingProgram();
  const del = useDeleteTrainingProgram();
  const [open, setOpen] = useState(false);
  const [participantsFor, setParticipantsFor] = useState<any>(null);
  const [form, setForm] = useState<any>({ completion_status: 'Upcoming', capacity: 10 });

  const save = () => {
    if (!form.title) { toast.error('Title is required.'); return; }
    toast.promise(create.mutateAsync(form).then(() => { setOpen(false); setForm({ completion_status: 'Upcoming', capacity: 10 }); }),
      { loading: 'Saving…', success: 'Training program created ✅', error: 'Could not create program.' });
  };

  const rows = programs ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg"><GraduationCap size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Training Programs</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Schedule &amp; track staff training</p>
          </div>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-105 active:scale-95">
          <Plus size={16} /> New Program
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-200 py-16 text-center text-sm text-zinc-400 dark:border-zinc-800">No training programs yet. Use &quot;New Program&quot; to add one.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p: any) => (
            <div key={p.id} className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"><GraduationCap size={20} /></div>
                <StatusSelect program={p} />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">{p.title}</h3>
              <div className="mt-3 space-y-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                {p.trainer && <p className="flex items-center gap-1.5"><User2 size={14} /> {p.trainer}</p>}
                {(p.capacity ?? 0) > 0 && <p className="flex items-center gap-1.5"><Users size={14} /> Capacity: {p.capacity}</p>}
                {p.start_date && <p>{format(new Date(p.start_date), 'dd MMM')} {p.end_date ? `– ${format(new Date(p.end_date), 'dd MMM yyyy')}` : ''}</p>}
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <button
                  onClick={() => setParticipantsFor(p)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-900/25 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                >
                  <UserPlus size={14} /> Participants
                </button>
                <button
                  onClick={() => toast.promise(del.mutateAsync(p.id), { loading: 'Deleting…', success: 'Deleted', error: 'Could not delete' })}
                  className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  title="Delete program"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <HrModal open={open} title="New Training Program" onClose={() => setOpen(false)}
        footer={<>
          <button onClick={() => setOpen(false)} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium dark:border-zinc-700">Cancel</button>
          <button onClick={save} disabled={create.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {create.isPending && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </>}>
        <Field label="Title *"><input className={inputCls} value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Trainer"><input className={inputCls} value={form.trainer || ''} onChange={(e) => setForm({ ...form, trainer: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Date"><input type="date" className={inputCls} value={form.start_date?.slice(0, 10) || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
          <Field label="End Date"><input type="date" className={inputCls} value={form.end_date?.slice(0, 10) || ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Capacity"><input type="number" min={0} className={inputCls} value={form.capacity ?? ''} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></Field>
          <Field label="Status">
            <select className={inputCls} value={form.completion_status} onChange={(e) => setForm({ ...form, completion_status: e.target.value })}>
              {STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </HrModal>

      <AnimatePresence>
        {participantsFor && (
          <TrainingParticipantsModal
            program={participantsFor}
            onClose={() => setParticipantsFor(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
