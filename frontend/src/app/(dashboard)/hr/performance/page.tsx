'use client';

import { useState } from 'react';
import { Target, Plus, Loader2, Star } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  usePerformanceReviews, useCreatePerformanceReview,
} from '@/features/hr/services/hr.api';
import { HrModal, Field, inputCls, EmployeeSelect } from '@/features/hr/components/hr-shared';
import type { PerformanceReview } from '@/features/hr/types/hr';

function Stars({ rating }: { rating?: number }) {
  const r = Math.round(rating || 0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} className={i <= r ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-600'} />
      ))}
      <span className="ml-1 text-xs text-zinc-500">{rating ? rating.toFixed(1) : '—'}</span>
    </div>
  );
}

export default function PerformancePage() {
  const { data: reviews, isLoading } = usePerformanceReviews();
  const create = useCreatePerformanceReview();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<PerformanceReview> & { next_review_date?: string; comments?: string }>({ rating: 3 });

  const save = () => {
    if (!form.employee_id || !form.reviewer_id || !form.review_period) { toast.error('Employee, reviewer aur period zaroori hai.'); return; }
    toast.promise(create.mutateAsync(form as any).then(() => { setOpen(false); setForm({ rating: 3 }); }),
      { loading: 'Saving…', success: 'Review added ✅', error: 'Could not add review.' });
  };

  const rows = reviews ?? [];
  const avg = rows.length ? (rows.reduce((s, r) => s + (r.rating || 0), 0) / rows.filter((r) => r.rating).length || 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg"><Target size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Performance Reviews</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Rate &amp; track employee performance</p>
          </div>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-105 active:scale-95">
          <Plus size={16} /> New Review
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><p className="text-xs font-medium text-zinc-500">Total Reviews</p><p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{rows.length}</p></div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><p className="text-xs font-medium text-zinc-500">Average Rating</p><div className="mt-1"><Stars rating={avg} /></div></div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><p className="text-xs font-medium text-zinc-500">Top Rated</p><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{rows.filter((r) => (r.rating || 0) >= 4).length}</p></div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
              <tr><th className="px-6 py-4">Employee</th><th className="px-6 py-4">Period</th><th className="px-6 py-4">Reviewer</th><th className="px-6 py-4">Rating</th><th className="px-6 py-4">Comments</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-500" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-14 text-center text-sm text-zinc-400">No reviews yet.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{r.employee_name || '—'}</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{r.review_period}</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{r.reviewer_name || '—'}</td>
                  <td className="px-6 py-4"><Stars rating={r.rating} /></td>
                  <td className="px-6 py-4"><p className="max-w-xs truncate text-zinc-500 dark:text-zinc-400">{(r as any).comments || '—'}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <HrModal open={open} title="New Performance Review" onClose={() => setOpen(false)}
        footer={<>
          <button onClick={() => setOpen(false)} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium dark:border-zinc-700">Cancel</button>
          <button onClick={save} disabled={create.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {create.isPending && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </>}>
        <Field label="Employee *"><EmployeeSelect value={form.employee_id || ''} onChange={(v) => setForm({ ...form, employee_id: v })} /></Field>
        <Field label="Reviewer *"><EmployeeSelect value={form.reviewer_id || ''} onChange={(v) => setForm({ ...form, reviewer_id: v })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Review Period *"><input className={inputCls} placeholder="e.g. Q1 2026" value={form.review_period || ''} onChange={(e) => setForm({ ...form, review_period: e.target.value })} /></Field>
          <Field label="Rating (1–5)"><input type="number" min={1} max={5} step={0.5} className={inputCls} value={form.rating ?? ''} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Comments"><textarea rows={3} className={inputCls} value={form.comments || ''} onChange={(e) => setForm({ ...form, comments: e.target.value })} /></Field>
        <Field label="Next Review Date"><input type="date" className={inputCls} value={form.next_review_date?.slice(0, 10) || ''} onChange={(e) => setForm({ ...form, next_review_date: e.target.value })} /></Field>
      </HrModal>
    </div>
  );
}
