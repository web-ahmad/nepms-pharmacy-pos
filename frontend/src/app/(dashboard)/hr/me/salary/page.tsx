'use client';

import { useState, useRef, useEffect } from 'react';
import { Wallet, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { HrPrintTemplate } from '@/features/hr/components/HrPrintTemplate';
import { numberToWords } from '@/features/hr/utils/numberToWords';
import { useMyPayroll, useMyHrProfile, type MyPayslip } from '@/features/hr/services/hr.api';
import {
  EssHeader, StatCards, TableShell, LoadingRow, EmptyRow, StatusPill,
  rs, MONTHS, rowCls, cellCls,
} from '@/features/hr/components/ess-ui';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function MySalaryPage() {
  const { data, isLoading } = useMyPayroll();
  const { data: profile } = useMyHrProfile();

  // Same print pipeline the HR payroll page uses, so both payslips look identical.
  const [printSlip, setPrintSlip] = useState<MyPayslip | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrintTrigger = useReactToPrint({
    contentRef: printRef,
    documentTitle: printSlip ? `Salary_Slip_${profile?.name?.replace(/\s+/g, '_') || 'Employee'}_${MONTHS[printSlip.month]}_${printSlip.year}` : 'Salary_Slip',
    onAfterPrint: () => setPrintSlip(null),
    pageStyle: `@page { margin: 0; } body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }`,
  });

  useEffect(() => {
    if (printSlip) {
      const timer = setTimeout(() => handlePrintTrigger(), 100);
      return () => clearTimeout(timer);
    }
  }, [printSlip, handlePrintTrigger]);

  const rows = data ?? [];
  const latest = rows[0];
  const totalPaid = rows.filter((p) => p.status === 'Paid').reduce((s, p) => s + (p.net_pay || 0), 0);

  const gross = (p: MyPayslip) => (p.base_salary || 0) + (p.allowances || 0) + (p.overtime || 0) + (p.bonuses || 0);
  const totalDeductions = (p: MyPayslip) => (p.deductions || 0) + (p.tax || 0);

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
            return (
              <tr key={p.id} className={rowCls}>
                <td className={`${cellCls} font-semibold text-zinc-900 dark:text-zinc-100`}>{MONTHS[p.month]} {p.year}</td>
                <td className={`${cellCls} text-zinc-600 dark:text-zinc-300`}>{rs(p.base_salary)}</td>
                <td className={`${cellCls} text-emerald-600 dark:text-emerald-400`}>+{rs(additions)}</td>
                <td className={`${cellCls} text-red-600 dark:text-red-400`}>−{rs(totalDeductions(p))}</td>
                <td className={`${cellCls} font-bold text-zinc-900 dark:text-zinc-50`}>{rs(p.net_pay)}</td>
                <td className={cellCls}><StatusPill value={p.status} /></td>
                <td className={`${cellCls} text-right`}>
                  <button
                    onClick={() => setPrintSlip(p)}
                    className="ml-auto flex items-center gap-1.5 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                  >
                    <Printer className="h-3.5 w-3.5" /> Payslip
                  </button>
                </td>
              </tr>
            );
          })
        )}
      </TableShell>

      {/* Hidden print template — rendered off-screen, only visible when printing */}
      {printSlip && (
        <HrPrintTemplate ref={printRef} title="Payslip" periodLabel={`${MONTH_NAMES[printSlip.month - 1]}, ${printSlip.year}`}>
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">Employee Name</p>
                <p className="text-sm font-semibold text-gray-900">{profile?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">Employee ID</p>
                <p className="text-sm font-semibold text-gray-900">{profile?.employee_code || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">Department</p>
                <p className="text-sm font-semibold text-gray-900">{profile?.department || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">For Month</p>
                <p className="text-sm font-semibold text-gray-900">{MONTH_NAMES[printSlip.month - 1]}, {printSlip.year}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">Payment Status</p>
                <p className="text-sm font-semibold text-gray-900">{printSlip.status || 'Draft'}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">Designation</p>
                <p className="text-sm font-semibold text-gray-900">{profile?.designation || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-8">
            {/* Earnings */}
            <div className="flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="border border-emerald-100 bg-emerald-50 p-2 text-left text-xs font-bold uppercase text-emerald-800">Earnings</th>
                    <th className="border border-emerald-100 bg-emerald-50 p-2 text-right text-xs font-bold uppercase text-emerald-800">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-b border-l border-r border-dashed border-zinc-200 p-2">Base Salary</td>
                    <td className="border-b border-r border-dashed border-zinc-200 p-2 text-right font-mono">{(printSlip.base_salary || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-l border-r border-dashed border-zinc-200 p-2">Allowances</td>
                    <td className="border-b border-r border-dashed border-zinc-200 p-2 text-right font-mono">{(printSlip.allowances || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-l border-r border-dashed border-zinc-200 p-2">Overtime</td>
                    <td className="border-b border-r border-dashed border-zinc-200 p-2 text-right font-mono">{(printSlip.overtime || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-l border-r border-dashed border-zinc-200 p-2">Bonuses</td>
                    <td className="border-b border-r border-dashed border-zinc-200 p-2 text-right font-mono">{(printSlip.bonuses || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="border-b-2 border-l border-r border-t-2 border-zinc-200 bg-zinc-50 p-2 font-bold">Gross Earnings</td>
                    <td className="border-b-2 border-r border-t-2 border-zinc-200 bg-zinc-50 p-2 text-right font-mono font-bold">{gross(printSlip).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions */}
            <div className="flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="border border-red-100 bg-red-50 p-2 text-left text-xs font-bold uppercase text-red-800">Deductions</th>
                    <th className="border border-red-100 bg-red-50 p-2 text-right text-xs font-bold uppercase text-red-800">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-b border-l border-r border-dashed border-zinc-200 p-2">Short Hours / Absent Penalty</td>
                    <td className="border-b border-r border-dashed border-zinc-200 p-2 text-right font-mono">{(printSlip.deductions || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-l border-r border-dashed border-zinc-200 p-2">Tax</td>
                    <td className="border-b border-r border-dashed border-zinc-200 p-2 text-right font-mono">{(printSlip.tax || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="border-b-2 border-l border-r border-t-2 border-zinc-200 bg-zinc-50 p-2 font-bold">Total Deductions</td>
                    <td className="border-b-2 border-r border-t-2 border-zinc-200 bg-zinc-50 p-2 text-right font-mono font-bold">{totalDeductions(printSlip).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <div>
              <div className="text-xs font-bold tracking-wider text-emerald-800">NET PAYABLE</div>
              <div className="mt-1 text-xs italic text-emerald-600">{numberToWords(printSlip.net_pay || 0)}</div>
            </div>
            <div className="font-mono text-3xl font-black text-emerald-600">PKR {(printSlip.net_pay || 0).toLocaleString()}</div>
          </div>
        </HrPrintTemplate>
      )}
    </div>
  );
}
