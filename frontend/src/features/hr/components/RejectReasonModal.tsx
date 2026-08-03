'use client';
// Shared "reject with a reason" dialog. Rejecting anything (leave, advance, …)
// must always record WHY, so the employee can see it on their own record.

import { useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';

const QUICK_REASONS = [
  'Insufficient leave balance',
  'Peak business period',
  'Short notice',
  'Incomplete information',
  'Not eligible yet',
];

export function RejectReasonModal({
  title,
  subject,
  quickReasons = QUICK_REASONS,
  isPending = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  /** Short line describing what is being rejected, e.g. "Advance of Rs 10,000 for Azeem Irfan". */
  subject?: string;
  quickReasons?: string[];
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-4 dark:border-zinc-800">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100">{title}</h3>
              {subject && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subject}</p>}
            </div>
          </div>
          <button onClick={onCancel} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Reason for rejection <span className="text-red-500">*</span>
            </label>
            <textarea
              autoFocus
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this request is being rejected…"
              className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>

          {quickReasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {quickReasons.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setReason(q)}
                  className="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-red-900/20"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
            This reason is shown to the employee on their own record.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 p-4 dark:border-zinc-800">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(trimmed)}
            disabled={!trimmed || isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-105 active:scale-95 disabled:opacity-50"
          >
            {isPending && <Loader2 size={15} className="animate-spin" />} Reject
          </button>
        </div>
      </div>
    </div>
  );
}
