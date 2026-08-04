'use client';

import { useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { useMyAttendanceSummary } from '@/features/hr/services/hr.api';
import SelfClockWidget from '@/features/hr/components/SelfClockWidget';
import {
  EssHeader, StatCards, TableShell, LoadingRow, EmptyRow, StatusPill,
  MONTHS, inputCls, rowCls, cellCls,
} from '@/features/hr/components/ess-ui';

const fmtTime = (v?: string | null) => {
  if (!v) return '—';
  const iso = v.endsWith('Z') ? v : `${v}Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
};

export default function MyAttendancePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { data, isLoading } = useMyAttendanceSummary(month, year);

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <div className="space-y-6">
      <EssHeader
        icon={CalendarCheck}
        title="My Attendance"
        subtitle="Your own attendance record — view only"
        action={
          <div className="flex items-center gap-2">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={`${inputCls} w-auto`}>
              {MONTHS.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${inputCls} w-auto`}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        }
      />

      {/* Clock in / out — every employee marks their own attendance from here */}
      <SelfClockWidget />

      <StatCards
        items={[
          { label: 'Present', value: data?.present ?? 0 },
          { label: 'Absent', value: data?.absent ?? 0 },
          { label: 'Total Marked', value: data?.total ?? 0 },
        ]}
      />

      <TableShell headers={['Date', 'Clock In', 'Clock Out', 'Status']}>
        {isLoading ? (
          <LoadingRow colSpan={4} />
        ) : !data?.records?.length ? (
          <EmptyRow colSpan={4} text="No attendance has been marked for this month." />
        ) : (
          data.records.map((r) => (
            <tr key={r.id} className={rowCls}>
              <td className={`${cellCls} font-semibold text-zinc-900 dark:text-zinc-100`}>{String(r.date)}</td>
              <td className={`${cellCls} text-zinc-600 dark:text-zinc-300`}>{fmtTime(r.clock_in)}</td>
              <td className={`${cellCls} text-zinc-600 dark:text-zinc-300`}>{fmtTime(r.clock_out)}</td>
              <td className={cellCls}><StatusPill value={r.status} /></td>
            </tr>
          ))
        )}
      </TableShell>
    </div>
  );
}
