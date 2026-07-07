"use client";

import { usePayrollRuns, usePayrollSummary } from '@/features/hr/services/hr.api';
import { useState } from 'react';
import PayrollRunModal from '@/features/hr/components/PayrollRunModal';
import { Plus, Eye, DollarSign, Clock, FileWarning, Printer, Download, Banknote, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { DataExportMenu, ExportColumn } from '@/components/ui/DataExportMenu';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(v);

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function PayrollPage() {
  const { data, isLoading } = usePayrollRuns();
  const { data: summary, isLoading: isSummaryLoading } = usePayrollSummary();
  const [showModal, setShowModal] = useState(false);

  const exportColumns: ExportColumn[] = [
    { header: 'Period', accessorKey: (row: any) => `${MONTHS[row.month]} ${row.year}` },
    { header: 'Gross Pay', accessorKey: 'total_gross' },
    { header: 'Deductions', accessorKey: 'total_deductions' },
    { header: 'Net Pay', accessorKey: 'total_net' },
    { header: 'Status', accessorKey: 'status' },
    { header: 'Run On', accessorKey: (row: any) => format(new Date(row.created_at), 'yyyy-MM-dd HH:mm') }
  ];

  const summaryCards = [
    { label: 'Total Payroll Cost', value: fmt(summary?.total_payroll_cost ?? 0), icon: DollarSign, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
    { label: 'Pending Payouts',    value: summary?.pending_payouts ?? 0,          icon: FileWarning, color: 'text-orange-700 dark:text-orange-400',  bg: 'bg-orange-100 dark:bg-orange-900/40' },
    { label: 'Overtime Burden',    value: fmt(summary?.overtime_burden ?? 0),     icon: Clock,       color: 'text-violet-700 dark:text-violet-400',  bg: 'bg-violet-100 dark:bg-violet-900/40' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <Banknote className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Payroll History</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">All payroll runs with auto-accounting integration</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" /> Run New Payroll
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((c) => (
          <div key={c.label} className="flex items-center gap-4 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm hover:shadow-md transition-all">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.bg} shrink-0`}>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">{c.label}</p>
              <p className={`text-xl font-bold font-mono mt-0.5 ${c.color} ${isSummaryLoading ? 'animate-pulse' : ''}`}>
                {isSummaryLoading ? '···' : c.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && <PayrollRunModal onClose={() => setShowModal(false)} />}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-gray-400 dark:text-zinc-500">{data?.length ?? 0} payroll runs</span>
        <div className="flex gap-2">
          <DataExportMenu 
            title="Payroll History" 
            data={data || []} 
            columns={exportColumns} 
            fileName="payroll-history"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-zinc-800" />)}
        </div>
      ) : (
        <div id="payroll-print-area" className="overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900">
                  {['Period', 'Total Gross', 'Deductions', 'Net Payout', 'Status', 'Run On', ''].map((h, i) => (
                    <th key={i} className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 ${['Total Gross','Deductions','Net Payout'].includes(h) ? 'text-right' : h === '' ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
                {data?.map((run) => (
                  <tr key={run.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                    <td className="px-5 py-4 font-bold text-gray-900 dark:text-zinc-100 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                          {MONTHS[run.month]}
                        </div>
                        {run.year}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-gray-900 dark:text-zinc-100 whitespace-nowrap">{fmt(run.total_gross)}</td>
                    <td className="px-5 py-4 text-right font-mono text-red-600 dark:text-red-400 whitespace-nowrap">
                      <span className="flex items-center justify-end gap-1"><TrendingDown className="h-3 w-3" />{fmt(run.total_deductions)}</span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{fmt(run.total_net)}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {run.status === 'Draft'
                        ? <span className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">Auto-Posted</span>
                        : <span className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Paid</span>
                      }
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-400 dark:text-zinc-500 whitespace-nowrap">
                      {format(new Date(run.created_at), 'dd MMM yyyy HH:mm')}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/hr/payroll/${run.id}`}>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:text-emerald-400 transition-colors whitespace-nowrap">
                          <Eye className="h-3.5 w-3.5" /> Details
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              {data && data.length > 0 && (
                <tfoot>
                  <tr className="bg-emerald-50 dark:bg-emerald-950/40 border-t-2 border-emerald-300 dark:border-emerald-700 font-bold">
                    <td className="px-5 py-4 text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{data.length} Runs Total</td>
                    <td className="px-5 py-4 text-right font-mono text-emerald-800 dark:text-emerald-300">
                      {fmt(data.reduce((s, r) => s + r.total_gross, 0))}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-red-700 dark:text-red-400">
                      {fmt(data.reduce((s, r) => s + r.total_deductions, 0))}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-emerald-700 dark:text-emerald-400">
                      {fmt(data.reduce((s, r) => s + r.total_net, 0))}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
