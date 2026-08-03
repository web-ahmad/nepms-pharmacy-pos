'use client';

import { useState } from 'react';
import { Wallet, Printer, X, Eye } from 'lucide-react';
import { useMyPayroll, useMyHrProfile, type MyPayslip } from '@/features/hr/services/hr.api';
import {
  EssHeader, StatCards, TableShell, LoadingRow, EmptyRow, StatusPill,
  rs, MONTHS, Overlay, ModalPanel, rowCls, cellCls,
} from '@/features/hr/components/ess-ui';

export default function MySalaryPage() {
  const { data, isLoading } = useMyPayroll();
  const { data: profile } = useMyHrProfile();
  const [slip, setSlip] = useState<MyPayslip | null>(null);

  const rows = data ?? [];
  const latest = rows[0];
  const totalPaid = rows.filter((p) => p.status === 'Paid').reduce((s, p) => s + (p.net_pay || 0), 0);

  return (
    <div className="space-y-6">
      <EssHeader icon={Wallet} title="My Salary Slips" subtitle="Your payslips — view and print only" />

      <StatCards
        items={[
          { label: 'Total Slips', value: rows.length },
          { label: 'Latest Net Pay', value: latest ? rs(latest.net_pay) : '—' },
          { label: 'Total Paid', value: rs(totalPaid) },
        ]}
      />

      <TableShell headers={['Period', 'Base', 'Additions', 'Deductions', 'Net Pay', 'Status', 'Action']}>
        {isLoading ? (
          <LoadingRow colSpan={7} />
        ) : !rows.length ? (
          <EmptyRow colSpan={7} text="No salary slips have been generated yet." />
        ) : (
          rows.map((p) => {
            const additions = (p.allowances || 0) + (p.overtime || 0) + (p.bonuses || 0);
            const deductions = (p.deductions || 0) + (p.tax || 0);
            return (
              <tr key={p.id} className={rowCls}>
                <td className={`${cellCls} font-semibold text-zinc-900 dark:text-zinc-100`}>{MONTHS[p.month]} {p.year}</td>
                <td className={`${cellCls} text-zinc-600 dark:text-zinc-300`}>{rs(p.base_salary)}</td>
                <td className={`${cellCls} text-emerald-600 dark:text-emerald-400`}>+{rs(additions)}</td>
                <td className={`${cellCls} text-red-600 dark:text-red-400`}>−{rs(deductions)}</td>
                <td className={`${cellCls} font-bold text-zinc-900 dark:text-zinc-50`}>{rs(p.net_pay)}</td>
                <td className={cellCls}><StatusPill value={p.status} /></td>
                <td className={`${cellCls} text-right`}>
                  <button
                    onClick={() => setSlip(p)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <Eye size={13} /> View
                  </button>
                </td>
              </tr>
            );
          })
        )}
      </TableShell>

      {slip && <PayslipModal slip={slip} employeeName={profile?.name} onClose={() => setSlip(null)} />}
    </div>
  );
}

function PayslipModal({ slip, employeeName, onClose }: { slip: MyPayslip; employeeName?: string; onClose: () => void }) {
  const rows: [string, number, boolean?][] = [
    ['Base salary', slip.base_salary],
    ['Allowances', slip.allowances],
    ['Overtime', slip.overtime],
    ['Bonuses', slip.bonuses],
    ['Deductions', -Math.abs(slip.deductions), true],
    ['Tax', -Math.abs(slip.tax), true],
  ];
  return (
    <Overlay onClose={onClose}>
      <ModalPanel>
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/75">Salary slip</p>
              <p className="text-lg font-bold">{MONTHS[slip.month]} {slip.year}</p>
              {employeeName && <p className="text-sm text-white/85">{employeeName}</p>}
            </div>
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/15"><X size={18} /></button>
          </div>
        </div>
        <div className="space-y-2 p-5">
          {rows.map(([label, val, neg]) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
              <span className={neg ? 'font-medium text-red-500' : 'font-medium text-zinc-800 dark:text-zinc-100'}>{rs(val)}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t border-dashed border-zinc-200 pt-3 dark:border-zinc-700">
            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Net pay</span>
            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{rs(slip.net_pay)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 p-4 dark:border-zinc-800">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900">
            <Printer size={14} /> Print
          </button>
        </div>
      </ModalPanel>
    </Overlay>
  );
}
