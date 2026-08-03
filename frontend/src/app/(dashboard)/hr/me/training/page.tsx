'use client';

import { GraduationCap } from 'lucide-react';
import { useMyTraining } from '@/features/hr/services/hr.api';
import {
  EssHeader, StatCards, TableShell, LoadingRow, EmptyRow, StatusPill, rowCls, cellCls,
} from '@/features/hr/components/ess-ui';

export default function MyTrainingPage() {
  const { data, isLoading } = useMyTraining();

  const rows = data ?? [];
  const completed = rows.filter((t) => ['Completed', 'Passed'].includes(t.my_status)).length;
  const ongoing = rows.filter((t) => ['Ongoing', 'Upcoming'].includes(t.program_status)).length;

  return (
    <div className="space-y-6">
      <EssHeader icon={GraduationCap} title="My Training" subtitle="Programs you're enrolled in — view only" />

      <StatCards
        items={[
          { label: 'Enrolled Programs', value: rows.length },
          { label: 'Completed', value: completed },
          { label: 'Upcoming / Ongoing', value: ongoing },
        ]}
      />

      <TableShell headers={['Program', 'Trainer', 'Starts', 'Ends', 'Program Status', 'My Status']}>
        {isLoading ? (
          <LoadingRow colSpan={6} />
        ) : !rows.length ? (
          <EmptyRow colSpan={6} text="You aren't enrolled in any training programs yet." />
        ) : (
          rows.map((t) => (
            <tr key={t.id} className={rowCls}>
              <td className={`${cellCls} font-semibold text-zinc-900 dark:text-zinc-100`}>{t.title}</td>
              <td className={`${cellCls} text-zinc-600 dark:text-zinc-300`}>{t.trainer || '—'}</td>
              <td className={`${cellCls} text-zinc-600 dark:text-zinc-300`}>{t.start_date?.slice(0, 10) || '—'}</td>
              <td className={`${cellCls} text-zinc-600 dark:text-zinc-300`}>{t.end_date?.slice(0, 10) || '—'}</td>
              <td className={`${cellCls} text-zinc-500 dark:text-zinc-400`}>{t.program_status}</td>
              <td className={cellCls}><StatusPill value={t.my_status} /></td>
            </tr>
          ))
        )}
      </TableShell>
    </div>
  );
}
