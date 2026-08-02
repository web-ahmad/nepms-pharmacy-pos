'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, LogOut, Loader2, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMyTodayAttendance, useMyClockIn, useMyClockOut } from '../services/hr.api';

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return now;
}

function fmtDuration(fromIso: string) {
  const ms = Date.now() - new Date(fromIso.endsWith('Z') ? fromIso : fromIso + 'Z').getTime();
  const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4);
  return `${h}h ${m}m`;
}

export default function SelfClockWidget() {
  const now = useNow();
  const { data, isLoading, isError } = useMyTodayAttendance();
  const clockIn = useMyClockIn();
  const clockOut = useMyClockOut();

  // No linked employee record → don't show the widget at all.
  if (isError) return null;

  const rec = data?.attendance;
  const isClockedIn = !!rec?.clock_in && !rec?.clock_out;
  const isDone = !!rec?.clock_in && !!rec?.clock_out;

  const doClockIn = () => toast.promise(clockIn.mutateAsync(), {
    loading: 'Clocking in…', success: 'Clocked in ✅ Have a great shift!',
    error: (e: any) => e?.response?.data?.detail || 'Could not clock in.',
  });
  const doClockOut = () => toast.promise(clockOut.mutateAsync(), {
    loading: 'Clocking out…', success: 'Clocked out 👋 See you tomorrow!',
    error: (e: any) => e?.response?.data?.detail || 'Could not clock out.',
  });

  const hh = now.getHours() % 12 || 12;
  const time = `${String(hh).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  const dateStr = now.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' });

  // Analog hands
  const sec = now.getSeconds(), min = now.getMinutes(), hr = now.getHours() % 12;
  const secDeg = sec * 6, minDeg = min * 6 + sec * 0.1, hrDeg = hr * 30 + min * 0.5;

  const statusPill = isDone
    ? { label: 'Shift complete', cls: 'bg-white/15 text-white' }
    : isClockedIn
      ? { label: `On shift · ${rec ? fmtDuration(rec.clock_in!) : ''}`, cls: 'bg-emerald-400/25 text-emerald-100' }
      : { label: 'Not clocked in', cls: 'bg-white/15 text-white/90' };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-xl">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/4 h-48 w-48 rounded-full bg-fuchsia-300/20 blur-3xl" />

      <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        {/* Analog watch */}
        <div className="flex items-center gap-5">
          <motion.div initial={{ scale: 0.8, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }}
            className="relative h-24 w-24 shrink-0 rounded-full bg-white/10 ring-4 ring-white/20 backdrop-blur-sm">
            <div className="absolute inset-0 rounded-full ring-1 ring-white/30" />
            {[...Array(12)].map((_, i) => (
              <span key={i} className="absolute left-1/2 top-1 h-1.5 w-0.5 -translate-x-1/2 rounded bg-white/60" style={{ transformOrigin: '50% 46px', transform: `rotate(${i * 30}deg)` }} />
            ))}
            {/* hour */}
            <div className="absolute left-1/2 top-1/2 h-6 w-1 -translate-x-1/2 -translate-y-full rounded-full bg-white" style={{ transformOrigin: 'bottom', transform: `rotate(${hrDeg}deg)` }} />
            {/* minute */}
            <div className="absolute left-1/2 top-1/2 h-8 w-0.5 -translate-x-1/2 -translate-y-full rounded-full bg-white/90" style={{ transformOrigin: 'bottom', transform: `rotate(${minDeg}deg)` }} />
            {/* second */}
            <div className="absolute left-1/2 top-1/2 h-9 w-px -translate-x-1/2 -translate-y-full bg-amber-300" style={{ transformOrigin: 'bottom', transform: `rotate(${secDeg}deg)` }} />
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 ring-2 ring-white/40" />
          </motion.div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Attendance</p>
            <p className="font-mono text-3xl font-extrabold leading-none tracking-tight tabular-nums">
              {time} <span className="text-lg font-bold text-white/80">{ampm}</span>
            </p>
            <p className="mt-1 text-sm text-white/80">{dateStr}</p>
            <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPill.cls}`}>
              <Clock size={12} /> {statusPill.label}
            </span>
          </div>
        </div>

        {/* Clock in / out buttons */}
        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:min-w-[190px]">
          {isDone ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-3 text-sm font-semibold ring-1 ring-white/20">
              <CheckCircle2 size={18} /> Shift complete for today
            </div>
          ) : !isClockedIn ? (
            <button onClick={doClockIn} disabled={clockIn.isPending || isLoading}
              className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-700 shadow-lg transition-all hover:brightness-105 active:scale-95 disabled:opacity-60">
              {clockIn.isPending ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />} Clock In
            </button>
          ) : (
            <button onClick={doClockOut} disabled={clockOut.isPending}
              className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-rose-600 shadow-lg transition-all hover:brightness-105 active:scale-95 disabled:opacity-60">
              {clockOut.isPending ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />} Clock Out
            </button>
          )}
          {rec?.clock_in && (
            <p className="text-center text-[11px] text-white/70">
              In: {new Date((rec.clock_in!).endsWith('Z') ? rec.clock_in! : rec.clock_in! + 'Z').toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
              {rec.clock_out && <> · Out: {new Date((rec.clock_out!).endsWith('Z') ? rec.clock_out! : rec.clock_out! + 'Z').toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</>}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
