'use client';
// Shared building blocks for the Employee Self-Service (ESS) pages under /hr/me.
// Every ESS page shows ONLY the logged-in employee's own records.
// Design intentionally mirrors the main HR admin pages (full-width, emerald
// gradient header chip, zinc stat cards, bordered table shell).

import React from 'react';
import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Same call shape as the HR admin pages. NOTE: don't pass fraction-digit
// options here — providers.tsx patches Intl.NumberFormat and forces
// minimumFractionDigits to 2 for currency, so a maximum below 2 throws.
export const rs = (n: number | null | undefined) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(Number(n || 0));

export const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const statusChip = (s: string) => {
  const v = (s || '').toLowerCase();
  if (['approved', 'paid', 'present', 'passed', 'completed', 'verified', 'active'].includes(v))
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800';
  if (['pending', 'draft', 'late', 'upcoming', 'ongoing', 'in progress'].includes(v))
    return 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800';
  if (['rejected', 'absent', 'failed', 'cancelled', 'expired'].includes(v))
    return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800';
  return 'bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700';
};

export function StatusPill({ value }: { value: string }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusChip(value)}`}>
      {value}
    </span>
  );
}

/** Page header — same shape as the HR admin pages. */
export function EssHeader({ icon: Icon, title, subtitle, action }: {
  icon: LucideIcon; title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg">
          <Icon size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// Static class names — Tailwind can't see interpolated ones.
const STAT_COLS: Record<number, string> = {
  1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5',
};

/** Small KPI card row, matching the HR admin stat strip. */
export function StatCards({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${STAT_COLS[items.length] || 'lg:grid-cols-4'}`}>
      {items.map((s) => (
        <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{s.label}</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

/** Bordered table shell used by every ESS list page. */
export function TableShell({ headers, children }: { headers: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className={`px-6 py-4 ${i === headers.length - 1 && h === 'Action' ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-500" />
      </td>
    </tr>
  );
}

export function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-14 text-center text-sm text-zinc-400">{text}</td>
    </tr>
  );
}

export const rowCls = 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50';
export const cellCls = 'px-6 py-4';

/** Shown when the logged-in user has no linked Employee record. */
export function NoEmployeeLinked() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-900/20">
        <span className="text-2xl">👤</span>
      </div>
      <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">No employee record linked</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Your login isn&apos;t connected to an HR employee profile yet. Please contact your HR / owner.
      </p>
    </div>
  );
}

/** Panel used for non-table content (e.g. My Shift). */
export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${className}`}>
      {children}
    </div>
  );
}

// ── Modal primitives (request forms) ──────────────────────────────────────────
export function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      {children}
    </div>
  );
}

export function ModalPanel({ children }: { children: React.ReactNode }) {
  return (
    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
      {children}
    </div>
  );
}

export const inputCls =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800';

export const labelCls = 'mb-1 block text-xs font-semibold text-zinc-500 dark:text-zinc-400';

export const primaryBtn =
  'inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-105 active:scale-95 disabled:opacity-60';

export const ghostBtn =
  'rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800';

export const noteCls =
  'rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400';
