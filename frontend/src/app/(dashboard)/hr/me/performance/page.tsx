'use client';

import { Target, Star } from 'lucide-react';
import { useMyPerformance } from '@/features/hr/services/hr.api';
import {
  EssHeader, StatCards, TableShell, LoadingRow, EmptyRow, rowCls, cellCls,
} from '@/features/hr/components/ess-ui';

function Rating({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-zinc-400">Not rated</span>;
  const full = Math.round(value);
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} className={i <= full ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-600'} />
      ))}
      <span className="ml-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">{value.toFixed(1)}</span>
    </span>
  );
}

export default function MyPerformancePage() {
  const { data, isLoading } = useMyPerformance();

  const rows = data ?? [];
  const rated = rows.filter((r) => r.rating != null);
  const avg = rated.length ? rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length : null;

  return (
    <div className="space-y-6">
      <EssHeader icon={Target} title="My Performance" subtitle="Reviews your manager has written for you — view only" />

      <StatCards
        items={[
          { label: 'Total Reviews', value: rows.length },
          { label: 'Average Rating', value: avg != null ? avg.toFixed(1) : '—' },
          { label: 'Latest Period', value: rows[0]?.review_period || '—' },
        ]}
      />

      <TableShell headers={['Period', 'Reviewer', 'Rating', 'Comments', 'Next Review']}>
        {isLoading ? (
          <LoadingRow colSpan={5} />
        ) : !rows.length ? (
          <EmptyRow colSpan={5} text="No performance reviews have been recorded for you yet." />
        ) : (
          rows.map((r) => (
            <tr key={r.id} className={rowCls}>
              <td className={`${cellCls} font-semibold text-zinc-900 dark:text-zinc-100`}>{r.review_period || 'Review'}</td>
              <td className={`${cellCls} text-zinc-600 dark:text-zinc-300`}>{r.reviewer || '—'}</td>
              <td className={cellCls}><Rating value={r.rating} /></td>
              <td className={`${cellCls} max-w-sm truncate text-zinc-500 dark:text-zinc-400`}>{r.comments || '—'}</td>
              <td className={`${cellCls} text-zinc-600 dark:text-zinc-300`}>{r.next_review_date || '—'}</td>
            </tr>
          ))
        )}
      </TableShell>
    </div>
  );
}
