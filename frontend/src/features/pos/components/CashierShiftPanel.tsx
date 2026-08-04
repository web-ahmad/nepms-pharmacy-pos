'use client';
// Shift banner + Close Shift button shown in the MAIN sidebar, so a cashier
// keeps the same sidebar on every page instead of it changing when they leave
// the Cashier Portal.
//
// The actual close flow (cash counting + end-of-shift summary/print) lives on
// the Cashier Portal, so this button navigates there with ?close=1 rather than
// duplicating that screen.

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useCashierSessionCheck } from '../services/pos.api';

const fmtTime = (utc?: string | null) => {
  if (!utc) return '—';
  const d = new Date(utc.endsWith('Z') ? utc : `${utc}Z`);
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function CashierShiftBanner({ isCollapsed }: { isCollapsed?: boolean }) {
  const { data } = useCashierSessionCheck();
  if (!data?.has_open_session) return null;

  if (isCollapsed) {
    return (
      <div className="mx-2 mb-2 flex items-center justify-center rounded-xl bg-emerald-50 py-2 dark:bg-emerald-900/25" title="Shift active">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
      </div>
    );
  }

  return (
    <div className="mx-2.5 mb-2 rounded-xl bg-indigo-50 px-3 py-2.5 dark:bg-indigo-900/25">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Shift active
        </span>
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          Float: Rs {Number(data.opening_balance || 0).toFixed(2)}
        </span>
      </div>
      <p className="mt-0.5 text-sm font-bold text-indigo-700 dark:text-indigo-300">
        Started: {fmtTime(data.opened_at)}
      </p>
    </div>
  );
}

export function CloseShiftButton({ isCollapsed }: { isCollapsed?: boolean }) {
  const router = useRouter();
  const { data } = useCashierSessionCheck();
  if (!data?.has_open_session) return null;

  return (
    <button
      onClick={() => router.push('/cashier?close=1')}
      title={isCollapsed ? 'Close Shift' : undefined}
      className={`mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 hover:border-red-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-red-900/20 ${
        isCollapsed ? 'px-0' : 'px-3'
      }`}
    >
      <LogOut size={16} />
      {!isCollapsed && 'Close Shift'}
    </button>
  );
}
