"use client";

import { 
  usePayrollDetails, 
  useEmployees, 
  useFinalizePayroll,
  useSubmitPayroll,
  useApprovePayroll,
  useRejectPayroll
} from '@/features/hr/services/hr.api';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Printer, CheckCircle, ArrowLeft, Send, ThumbsUp, ThumbsDown, DollarSign, Download, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { GlobalPrintTemplate } from '@/components/shared/GlobalPrintTemplate';
import { useReactToPrint } from 'react-to-print';

const fmt = (v: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(v);

export default function PayrollDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: run, isLoading: isRunLoading } = usePayrollDetails(id as string);
  const { data: employees, isLoading: isEmpLoading } = useEmployees();
  
  const finalizePayroll = useFinalizePayroll();
  const submitPayroll = useSubmitPayroll();
  const approvePayroll = useApprovePayroll();
  const rejectPayroll = useRejectPayroll();

  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [remarks, setRemarks] = useState("");
  const { user } = useAuthStore();
  const isOwner = user?.role === 'Super Admin' || user?.role === 'Admin';

  const isLoading = isRunLoading || isEmpLoading;

  // Helper function to convert numbers to words
  const numberToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    const intNum = Math.floor(num);
    if (intNum > 999999999) return intNum.toString();

    const convert = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
      if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? convert(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? convert(n % 1000) : '');
      return convert(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? convert(n % 100000) : '');
    };
    
    return 'Rupees ' + convert(intNum).trim() + ' Only';
  };

  const masterPrintRef = useRef<HTMLDivElement>(null);
  const [isMasterPrinting, setIsMasterPrinting] = useState(false);

  const triggerMasterPrint = useReactToPrint({
    contentRef: masterPrintRef,
    documentTitle: `Master_Payroll_${run?.month}_${run?.year}`,
    onAfterPrint: () => setIsMasterPrinting(false),
    pageStyle: `@page { margin: 0; } body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }`
  });

  useEffect(() => {
    if (isMasterPrinting) {
      const timer = setTimeout(() => {
        triggerMasterPrint();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMasterPrinting, triggerMasterPrint]);

  const handleDownloadMasterPDF = () => {
    setIsMasterPrinting(true);
  };

  const [printData, setPrintData] = useState<{line: any, emp: any} | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrintTrigger = useReactToPrint({
    contentRef: printRef,
    documentTitle: printData ? `Salary_Slip_${printData.emp.first_name}_${printData.emp.last_name}` : 'Salary_Slip',
    onAfterPrint: () => setPrintData(null),
    pageStyle: `@page { margin: 0; } body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }`
  });

  useEffect(() => {
    if (printData) {
      const timer = setTimeout(() => {
        handlePrintTrigger();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [printData, handlePrintTrigger]);

  const handlePrintSlip = (line: any, emp: any) => {
    setPrintData({ line, emp });
  };


  if (isLoading) {
    return <div className="animate-pulse h-64 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />;
  }

  if (!run) return <div className="text-gray-500 text-center py-10 font-semibold">Payroll run not found</div>;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/hr/payroll">
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
              Payroll Details: Month {run.month}/{run.year}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Created: {format(new Date(run.created_at), 'PPP')}</p>
          </div>
        </div>

        {/* Workflow State Badges & Interactive Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {run.status === 'Draft' && (
            <>
              <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">Draft</span>
              <button 
                onClick={() => submitPayroll.mutate(run.id)}
                disabled={submitPayroll.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                {submitPayroll.isPending ? 'Sending...' : 'Send for Approval'}
              </button>
            </>
          )}

          {run.status === 'Pending Approval' && (
            <>
              <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200">Pending Approval</span>
              
              <button 
                onClick={handleDownloadMasterPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all"
              >
                <Download className="h-3.5 w-3.5" /> Download Master PDF
              </button>

              {isOwner ? (
                <button 
                  onClick={() => approvePayroll.mutate({ id: run.id })}
                  disabled={approvePayroll.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {approvePayroll.isPending ? 'Approving...' : 'Approve'}
                </button>
              ) : (
                <button 
                  onClick={() => setShowOverrideDialog(true)}
                  disabled={approvePayroll.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-sm"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Override Approval
                </button>
              )}

              <button 
                onClick={() => rejectPayroll.mutate(run.id)}
                disabled={rejectPayroll.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all shadow-sm"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                {rejectPayroll.isPending ? 'Rejecting...' : 'Reject/Return to Draft'}
              </button>
            </>
          )}

          {run.status === 'Approved' && (
            <>
              <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200">Approved</span>
              <button 
                onClick={() => finalizePayroll.mutate(run.id)}
                disabled={finalizePayroll.isPending}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
              >
                <DollarSign className="h-3.5 w-3.5" />
                {finalizePayroll.isPending ? 'Processing Payout...' : 'Mark as Paid'}
              </button>
            </>
          )}

          {run.status === 'Paid' && (
            <>
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold bg-emerald-500 text-white shadow-sm"><BadgeCheck className="h-3.5 w-3.5" />Paid &amp; Posted</span>
              <button 
                onClick={handleDownloadMasterPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all"
              >
                <Download className="h-3.5 w-3.5" /> Master PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Gross Total Base</p>
          <p className="text-2xl font-bold mt-2 font-mono text-gray-900 dark:text-zinc-100">{fmt(run.total_gross)}</p>
        </div>
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Total Deductions</p>
          <p className="text-2xl font-bold mt-2 font-mono text-red-600 dark:text-red-400">{fmt(run.total_deductions)}</p>
        </div>
        <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Total Net Payable</p>
          <p className="text-2xl font-bold mt-2 font-mono text-emerald-700 dark:text-emerald-400">{fmt(run.total_net)}</p>
        </div>
      </div>

      {/* Employees Breakdown Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
        <div className="border-b border-gray-100 dark:border-zinc-800 bg-emerald-50 dark:bg-emerald-950/40 px-5 py-4">
          <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">Employee Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                {['Employee', 'Base Salary', 'Allowances', 'Deductions', 'Net Pay', ''].map((h, i) => (
                  <th key={i} className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 ${h === 'Employee' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
              {run.lines.map((line) => {
                const emp = employees?.find(e => e.id === line.employee_id);
                return (
                  <tr key={line.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-zinc-100">
                      {emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown Employee'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-gray-900 dark:text-zinc-100 whitespace-nowrap">{fmt(line.base_salary)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-green-600 dark:text-green-400 whitespace-nowrap">{fmt(line.allowances)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-red-600 dark:text-red-400 whitespace-nowrap">{fmt(line.deductions)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{fmt(line.net_pay)}</td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button 
                        onClick={() => handlePrintSlip(line, emp)}
                        className="flex items-center gap-1 ml-auto px-2.5 py-1 text-xs font-semibold rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Payslip
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showOverrideDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-2">Manual Override Approval</h3>
            <p className="text-sm text-gray-500 mb-4">You are approving this payroll run via manual override. Please provide a reason/remarks for the owner.</p>
            
            <textarea 
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-3 text-sm outline-none focus:border-emerald-500 mb-4 h-24"
              placeholder="Enter remarks..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />

            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => {
                  setShowOverrideDialog(false);
                  setRemarks("");
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  approvePayroll.mutate({ id: run.id, override: true, remarks });
                  setShowOverrideDialog(false);
                }}
                disabled={!remarks.trim() || approvePayroll.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
              >
                {approvePayroll.isPending ? 'Approving...' : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Template */}
      {printData && (
        <GlobalPrintTemplate
          ref={printRef}
          title="SALARY SLIP"
        >
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Employee Name</p>
                <p className="text-sm font-semibold text-gray-900">{printData.emp.first_name} {printData.emp.last_name}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Employee ID</p>
                <p className="text-sm font-semibold text-gray-900">{printData.emp.employee_id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Department</p>
                <p className="text-sm font-semibold text-gray-900">{printData.emp.department?.name || printData.line.department_name || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">For Month</p>
                <p className="text-sm font-semibold text-gray-900">{["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][(run?.month || 1) - 1]}, {run?.year}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Payment Status</p>
                <p className="text-sm font-semibold text-gray-900">{run?.status || 'Draft'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Worked Days</p>
                <p className="text-sm font-semibold text-gray-900">{printData.line.worked_units || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">OT / UT Hours</p>
                <p className="text-sm font-semibold text-gray-900">
                  {printData.line.total_ot_hours ?? printData.line.deductions_breakdown?.ot_hours ?? printData.line.ot_hours ?? 0}h OT / {printData.line.total_ut_hours ?? printData.line.deductions_breakdown?.ut_hours ?? printData.line.ut_hours ?? 0}h UT
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-8">
            <div className="flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="bg-emerald-50 text-emerald-800 p-2 text-left font-bold uppercase text-xs border border-emerald-100">Earnings</th>
                    <th className="bg-emerald-50 text-emerald-800 p-2 text-right font-bold uppercase text-xs border border-emerald-100">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-b border-l border-r border-dashed border-zinc-200">Base Salary</td>
                    <td className="p-2 border-b border-r border-dashed border-zinc-200 text-right font-mono">{(printData.line.base_salary || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b border-l border-r border-dashed border-zinc-200">Overtime / Allowances</td>
                    <td className="p-2 border-b border-r border-dashed border-zinc-200 text-right font-mono">{(printData.line.allowances || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-t-2 border-b-2 border-l border-r border-zinc-200 font-bold bg-zinc-50">Gross Earnings</td>
                    <td className="p-2 border-t-2 border-b-2 border-r border-zinc-200 text-right font-bold font-mono bg-zinc-50">{((printData.line.base_salary || 0) + (printData.line.allowances || 0)).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="bg-red-50 text-red-800 p-2 text-left font-bold uppercase text-xs border border-red-100">Deductions</th>
                    <th className="bg-red-50 text-red-800 p-2 text-right font-bold uppercase text-xs border border-red-100">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {printData.line.deductions_breakdown ? (
                    <>
                      <tr>
                        <td className="p-2 border-b border-l border-r border-dashed border-zinc-200">Short Hours / Absent Penalty</td>
                        <td className="p-2 border-b border-r border-dashed border-zinc-200 text-right font-mono">{(printData.line.deductions_breakdown.absent_amount || 0).toLocaleString()}</td>
                      </tr>
                      {printData.line.deductions_breakdown.advance_recovery > 0 && (
                        <tr>
                          <td className="p-2 border-b border-l border-r border-dashed border-zinc-200">Advance Recovery</td>
                          <td className="p-2 border-b border-r border-dashed border-zinc-200 text-right font-mono">{printData.line.deductions_breakdown.advance_recovery.toLocaleString()}</td>
                        </tr>
                      )}
                    </>
                  ) : (
                    <tr>
                      <td className="p-2 border-b border-l border-r border-dashed border-zinc-200">Short Hours / Absent Penalty</td>
                      <td className="p-2 border-b border-r border-dashed border-zinc-200 text-right font-mono">{(printData.line.deductions || 0).toLocaleString()}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="p-2 border-t-2 border-b-2 border-l border-r border-zinc-200 font-bold bg-zinc-50">Total Deductions</td>
                    <td className="p-2 border-t-2 border-b-2 border-r border-zinc-200 text-right font-bold font-mono bg-zinc-50">{(printData.line.deductions || 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 bg-emerald-50 border border-emerald-200 p-6 rounded-xl flex items-center justify-between">
            <div>
               <div className="text-xs text-emerald-800 font-bold tracking-wider">NET PAYABLE</div>
               <div className="text-xs text-emerald-600 italic mt-1">{numberToWords(printData.line.net_pay || 0)}</div>
            </div>
            <div className="text-3xl font-black text-emerald-600 font-mono">PKR {(printData.line.net_pay || 0).toLocaleString()}</div>
          </div>
        </GlobalPrintTemplate>
      )}

      {/* Hidden Master Print Template */}
      {isMasterPrinting && run && (
        <GlobalPrintTemplate
          ref={masterPrintRef}
          title={`PAYROLL MASTER SHEET - ${run.month}/${run.year}`}
        >
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
            <div className="grid grid-cols-5 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Month/Year</p>
                <p className="text-sm font-semibold text-gray-900">{run.month}/{run.year}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Total Gross Base</p>
                <p className="text-sm font-semibold text-gray-900 font-mono">{fmt(run.total_gross)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Total Deductions</p>
                <p className="text-sm font-semibold text-gray-900 font-mono">{fmt(run.total_deductions)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Total Net Payable</p>
                <p className="text-sm font-semibold text-gray-900 font-mono">{fmt(run.total_net)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Total Employees</p>
                <p className="text-sm font-semibold text-gray-900">{run.lines.length}</p>
              </div>
            </div>
          </div>

          <div className="mb-4 text-sm font-bold text-emerald-800 uppercase tracking-wider">EMPLOYEE BREAKDOWN</div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="bg-[#059669] text-white p-2 text-left font-bold uppercase text-xs border border-emerald-700">Employee</th>
                <th className="bg-[#059669] text-white p-2 text-right font-bold uppercase text-xs border border-emerald-700">Base Salary</th>
                <th className="bg-[#059669] text-white p-2 text-right font-bold uppercase text-xs border border-emerald-700">Allowances</th>
                <th className="bg-[#059669] text-white p-2 text-right font-bold uppercase text-xs border border-emerald-700">Deductions</th>
                <th className="bg-[#059669] text-white p-2 text-right font-bold uppercase text-xs border border-emerald-700">Net Pay</th>
              </tr>
            </thead>
            <tbody>
              {run.lines.map((l: any, i: number) => {
                const e = employees?.find((e: any) => e.id === l.employee_id);
                return (
                  <tr key={l.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="p-2 border-b border-l border-r border-dashed border-gray-200">
                      <div className="font-semibold text-gray-900">{e ? `${e.first_name} ${e.last_name}` : l.employee_name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{l.department_name || (e as any)?.department?.name || 'Unassigned'}</div>
                    </td>
                    <td className="p-2 border-b border-r border-dashed border-gray-200 text-right font-mono">{fmt(l.base_salary)}</td>
                    <td className="p-2 border-b border-r border-dashed border-gray-200 text-right font-mono">{fmt(l.allowances)}</td>
                    <td className="p-2 border-b border-r border-dashed border-gray-200 text-right font-mono">{fmt(l.deductions)}</td>
                    <td className="p-2 border-b border-r border-dashed border-gray-200 text-right font-mono font-bold">{fmt(l.net_pay)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-24 flex justify-between items-end px-8">
            <div className="text-center w-48">
              <div className="border-t-2 border-gray-800 mb-2"></div>
              <p className="text-xs font-bold text-gray-800 uppercase">Prepared By (HR)</p>
            </div>
            <div className="text-center w-48">
              <div className="border-t-2 border-gray-800 mb-2"></div>
              <p className="text-xs font-bold text-gray-800 uppercase">Approved By (Finance/CEO)</p>
            </div>
          </div>
        </GlobalPrintTemplate>
      )}
    </div>
  );
}
