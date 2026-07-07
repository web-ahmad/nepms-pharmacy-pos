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
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';

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

  const handleDownloadMasterPDF = async () => {
      try {
          const response = await api.get(`/api/v1/hr/payroll/${id}/export-master`, {
              responseType: 'blob' 
          });
          const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `Master_Payroll_${id}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.parentNode?.removeChild(link);
      } catch (error) {
          toast.error("Failed to download PDF. Please check your permissions.");
      }
  };

  const handlePrintSlip = (line: any, emp: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const monthName = monthNames[(run?.month || 1) - 1];
      const year = run?.year || new Date().getFullYear();
      const generatedDate = format(new Date(), 'PPp');
      const netPayWords = numberToWords(line.net_pay || 0);

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Salary Slip - ${emp.first_name} ${emp.last_name}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
              body { font-family: 'Inter', sans-serif; color: #111827; padding: 40px; background-color: #fff; }
              .payslip-container { max-width: 800px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 40px; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
              .logo-area h1 { font-size: 24px; font-weight: 700; color: #059669; margin: 0; }
              .company-details { text-align: right; font-size: 12px; color: #4b5563; line-height: 1.6; }
              .company-details strong { color: #111827; font-size: 14px; display: block; }
              .title-section { text-align: center; margin: 20px 0; padding-bottom: 15px; border-bottom: 2px solid #e5e7eb; }
              .title-section h2 { margin: 0 0 4px 0; font-size: 18px; font-weight: 700; text-transform: uppercase; color: #059669; }
              .employee-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #f3f4f6; }
              .grid-item { display: flex; font-size: 12px; line-height: 1.8; }
              .grid-label { width: 120px; color: #6b7280; }
              .grid-value { color: #111827; font-weight: 600; }
              .financial-section { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 25px; }
              table { width: 100%; border-collapse: collapse; }
              th { background-color: #f0fdf4; color: #065f46; font-size: 11px; font-weight: 600; text-transform: uppercase; padding: 10px; text-align: left; border-top: 1px solid #d1fae5; border-bottom: 1px solid #d1fae5; }
              .text-right { text-align: right; }
              td { padding: 10px; font-size: 12px; color: #4b5563; border-bottom: 1px dashed #e5e7eb; }
              .amount { color: #111827; font-weight: 500; font-family: monospace; }
              .totals-row td { border-bottom: none; border-top: 2px solid #e5e7eb; padding-top: 12px; font-weight: 700; color: #111827; }
              .net-payable-box { margin-top: 20px; background-color: #f0fdf4; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; text-align: right; }
              .net-label { font-size: 12px; color: #065f46; font-weight: 600; }
              .net-amount { font-size: 26px; font-weight: 700; color: #059669; font-family: monospace; margin: 4px 0; }
              .net-words { font-size: 12px; color: #059669; font-style: italic; }
              .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
              .sig-box { width: 180px; text-align: center; }
              .sig-line { border-top: 1px dashed #9ca3af; margin-bottom: 6px; }
              .sig-title { font-size: 12px; color: #4b5563; }
              .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 15px; }
              @media print {
                body { padding: 0; }
                .payslip-container { box-shadow: none; border: none; padding: 0; max-width: 100%; }
              }
            </style>
          </head>
          <body>
            <div class="payslip-container">
              <div class="header">
                <div class="logo-area"><h1>NEPMS</h1></div>
                <div class="company-details">
                  <strong>NEPMS Pharmacy Services</strong>
                  123 Healthcare Blvd, Karachi, Pakistan<br>
                  info@nepms.com | +92 21 111-NEPMS
                </div>
              </div>
              <div class="title-section">
                <h2>SALARY SLIP</h2>
                <p>For the month of ${monthName}, ${year}</p>
              </div>
              <div class="employee-grid">
                <div>
                  <div class="grid-item"><span class="grid-label">Employee Name:</span><span class="grid-value">${emp.first_name} ${emp.last_name}</span></div>
                  <div class="grid-item"><span class="grid-label">Employee ID:</span><span class="grid-value">${emp.employee_id || 'N/A'}</span></div>
                </div>
                <div>
                  <div class="grid-item"><span class="grid-label">Department:</span><span class="grid-value">${emp.department?.name || 'N/A'}</span></div>
                  <div class="grid-item"><span class="grid-label">Payment Status:</span><span class="grid-value" style="color: ${run?.status === 'Paid' ? '#10b981' : '#f59e0b'}">${run?.status || 'Draft'}</span></div>
                </div>
              </div>
              <div class="financial-section">
                <div>
                  <table>
                    <thead><tr><th>Earnings</th><th class="text-right">Amount (PKR)</th></tr></thead>
                    <tbody>
                      <tr><td>Base Salary</td><td class="text-right amount">${(line.base_salary || 0).toLocaleString()}</td></tr>
                      <tr><td>Overtime / Allowances</td><td class="text-right amount">${(line.allowances || 0).toLocaleString()}</td></tr>
                      <tr class="totals-row"><td>Gross Earnings</td><td class="text-right">${((line.base_salary || 0) + (line.allowances || 0)).toLocaleString()}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <table>
                    <thead><tr><th>Deductions</th><th class="text-right">Amount (PKR)</th></tr></thead>
                    <tbody>
                      ${line.deductions_breakdown ? `
                        <tr><td>Absent Deductions</td><td class="text-right amount">${(line.deductions_breakdown.absent_amount || 0).toLocaleString()}</td></tr>
                        ${line.deductions_breakdown.advance_recovery > 0 ? `<tr><td>Advance Recovery</td><td class="text-right amount">${line.deductions_breakdown.advance_recovery.toLocaleString()}</td></tr>` : ''}
                      ` : `
                        <tr><td>Absent Deductions</td><td class="text-right amount">${(line.deductions || 0).toLocaleString()}</td></tr>
                      `}
                      <tr class="totals-row"><td>Total Deductions</td><td class="text-right">${(line.deductions || 0).toLocaleString()}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="net-payable-box">
                <div class="net-label">NET PAYABLE</div>
                <div class="net-amount">PKR ${(line.net_pay || 0).toLocaleString()}</div>
                <div class="net-words">${netPayWords}</div>
              </div>
              <div class="signatures">
                <div class="sig-box"><div class="sig-line"></div><div class="sig-title">Employee Signature</div></div>
                <div class="sig-box"><div class="sig-line"></div><div class="sig-title">Authorized Officer</div></div>
              </div>
              <div class="footer">
                <p>This is a system-generated document for NEPMS Pharmacy Portal.</p>
                <p>Generated on: ${generatedDate}</p>
              </div>
            </div>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
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
    </div>
  );
}
