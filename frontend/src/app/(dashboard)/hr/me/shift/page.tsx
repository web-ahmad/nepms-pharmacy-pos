'use client';

import { Clock, Loader2, LogIn, LogOut, Timer } from 'lucide-react';
import { useMyShift } from '@/features/hr/services/hr.api';
import { EssHeader, Panel, StatusPill } from '@/features/hr/components/ess-ui';

export default function MyShiftPage() {
  const { data, isLoading } = useMyShift();

  return (
    <div className="space-y-6">
      <EssHeader icon={Clock} title="My Shift" subtitle="Your assigned working hours — view only" />

      {isLoading ? (
        <Panel className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </Panel>
      ) : !data ? (
        <Panel className="py-16 text-center text-sm text-zinc-400">No shift has been assigned to you yet.</Panel>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ShiftCard label="Shift Starts" value={data.start_time} icon={LogIn}
              iconColor="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" />
            <ShiftCard label="Shift Ends" value={data.end_time} icon={LogOut}
              iconColor="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400" />
            <ShiftCard label="Grace Period" value={`${data.grace_period} min`} icon={Timer}
              iconColor="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400" />
          </div>

          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Assigned shift</p>
                <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">{data.name}</p>
              </div>
              <StatusPill value={data.is_active ? 'Active' : 'Inactive'} />
            </div>
            <p className="mt-4 border-t border-zinc-100 pt-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              Clocking in after <b className="text-zinc-700 dark:text-zinc-200">{data.start_time}</b> plus the{' '}
              <b className="text-zinc-700 dark:text-zinc-200">{data.grace_period} minute</b> grace period is recorded as <b>Late</b>.
            </p>
          </Panel>
        </>
      )}
    </div>
  );
}

function ShiftCard({ label, value, icon: Icon, iconColor }: {
  label: string; value: string; icon: typeof Clock; iconColor: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-zinc-100">{value}</p>
        </div>
        <div className={`ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
