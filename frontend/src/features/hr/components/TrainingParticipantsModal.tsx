'use client';
// Enrol employees into a training program and track how each one did.

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Loader2, Users, Search, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useEmployees,
  useTrainingAttendances, useCreateTrainingAttendance,
  useUpdateTrainingAttendance, useDeleteTrainingAttendance,
} from '../services/hr.api';

// Matches the backend default ("Present") plus the outcomes HR tracks.
const STATUSES = ['Present', 'Absent', 'Passed', 'Failed'];
const STATUS_CLS: Record<string, string> = {
  Present: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Passed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  Failed: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

function StatusSelect({ row }: { row: any }) {
  const update = useUpdateTrainingAttendance(row.id);
  const value = STATUSES.includes(row.status) ? row.status : 'Present';
  return (
    <select
      value={value}
      onChange={(e) =>
        update.mutate({ status: e.target.value }, {
          onSuccess: () => toast.success('Participant updated.'),
          onError: (err: any) => toast.error(err?.response?.data?.detail || 'Could not update.'),
        })
      }
      disabled={update.isPending}
      className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${STATUS_CLS[value]}`}
    >
      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

export default function TrainingParticipantsModal({ program, onClose }: { program: any; onClose: () => void }) {
  const { data: participants, isLoading } = useTrainingAttendances(program.id);
  const { data: employees } = useEmployees();
  const enrol = useCreateTrainingAttendance(program.id);
  const remove = useDeleteTrainingAttendance();

  const [search, setSearch] = useState('');
  const [picking, setPicking] = useState(false);

  const enrolled = participants ?? [];
  const enrolledIds = useMemo(() => new Set(enrolled.map((p) => p.employee_id)), [enrolled]);

  // Only offer active employees who aren't already on the list.
  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (employees ?? [])
      .filter((e: any) => e.is_active !== false && !enrolledIds.has(e.id))
      .filter((e: any) =>
        !q ||
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
        (e.employee_id || '').toLowerCase().includes(q),
      );
  }, [employees, enrolledIds, search]);

  const capacity = Number(program.capacity || 0);
  const isFull = capacity > 0 && enrolled.length >= capacity;

  const addEmployee = (employeeId: string) => {
    if (isFull) { toast.error(`This program is full (capacity ${capacity}).`); return; }
    enrol.mutate(
      { employee_id: employeeId, program_id: program.id, status: 'Present' },
      {
        onSuccess: () => { toast.success('Employee enrolled.'); setSearch(''); },
        onError: (err: any) => toast.error(err?.response?.data?.detail || 'Could not enrol employee.'),
      },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-950 sm:max-w-2xl sm:rounded-2xl"
      >
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-emerald-500 to-green-600 p-5 text-white">
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur">
                <GraduationCap size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">Participants</p>
                <h3 className="truncate text-lg font-bold leading-tight">{program.title}</h3>
                <p className="text-xs text-white/85">
                  {enrolled.length} enrolled{capacity > 0 ? ` · capacity ${capacity}` : ''}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-white/20"><X size={18} /></button>
          </div>
        </div>

        {/* Add participant */}
        <div className="shrink-0 border-b border-zinc-100 p-4 dark:border-zinc-800">
          {!picking ? (
            <button
              onClick={() => setPicking(true)}
              disabled={isFull}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-105 active:scale-95 disabled:opacity-50"
            >
              <Plus size={16} /> {isFull ? `Program full (${capacity})` : 'Enrol Employee'}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee by name or ID…"
                  className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                {available.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-zinc-400">
                    {enrolledIds.size ? 'All employees are already enrolled.' : 'No employees found.'}
                  </p>
                ) : (
                  available.map((e: any) => (
                    <button
                      key={e.id}
                      onClick={() => addEmployee(e.id)}
                      disabled={enrol.isPending}
                      className="flex w-full items-center gap-3 border-b border-zinc-100 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-emerald-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-emerald-900/20"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        {e.first_name?.[0]}{e.last_name?.[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{e.first_name} {e.last_name}</p>
                        <p className="text-xs text-zinc-400">{e.employee_id}</p>
                      </div>
                      <Plus size={15} className="shrink-0 text-emerald-600" />
                    </button>
                  ))
                )}
              </div>
              <button onClick={() => { setPicking(false); setSearch(''); }}
                className="w-full rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                Done
              </button>
            </div>
          )}
        </div>

        {/* Enrolled list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
          ) : enrolled.length === 0 ? (
            <div className="py-12 text-center">
              <Users size={32} className="mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
              <p className="text-sm text-zinc-400">No one is enrolled yet. Use &quot;Enrol Employee&quot; above.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {enrolled.map((p) => (
                  <motion.li
                    key={p.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                      {(p.employee_name || 'U').split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {p.employee_name || 'Unknown'}
                    </span>
                    <StatusSelect row={p} />
                    <button
                      onClick={() =>
                        remove.mutate(p.id, {
                          onSuccess: () => toast.success('Participant removed.'),
                          onError: (err: any) => toast.error(err?.response?.data?.detail || 'Could not remove.'),
                        })
                      }
                      className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                      title="Remove from program"
                    >
                      <Trash2 size={15} />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
