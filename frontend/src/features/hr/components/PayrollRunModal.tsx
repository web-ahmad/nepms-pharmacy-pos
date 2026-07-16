import { useState, useEffect } from 'react';
import { useRunPayroll, usePreviewPayroll, useDepartments } from '../services/hr.api';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';

export default function PayrollRunModal({ onClose }: { onClose: () => void }) {
  const runPayroll = useRunPayroll();
  const { data: departments } = useDepartments();
  
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [departmentId, setDepartmentId] = useState('all');
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  const { data: previewData, isLoading: isPreviewLoading } = usePreviewPayroll(
    isPreviewActive ? month : 0, 
    isPreviewActive ? year : 0,
    departmentId
  );

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(val);

  const handleRun = () => {
    runPayroll.mutate({ month, year, department_id: departmentId }, {
      onSuccess: () => onClose()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
        
        <div className="p-8 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Run Payroll Batch</h3>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Select a period and department to generate payroll lines and auto-post to Accounting.
          </p>

          <div className="mt-8 flex items-end gap-6">
            <div className="w-56">
              <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">Department</label>
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setIsPreviewActive(false);
                }}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
              >
                <option value="all">All Departments</option>
                {departments?.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div className="w-48">
              <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">Month</label>
              <select
                value={month}
                onChange={(e) => {
                  setMonth(Number(e.target.value));
                  setIsPreviewActive(false);
                }}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">Year</label>
              <input 
                type="number" 
                value={year} 
                onChange={(e) => {
                  setYear(Number(e.target.value));
                  setIsPreviewActive(false);
                }}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
              />
            </div>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 h-[42px] px-6 rounded-lg font-medium shadow-sm transition-all"
              onClick={() => setIsPreviewActive(true)}
            >
              Generate Preview
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-zinc-50/50 dark:bg-zinc-900/30">
          {!isPreviewActive ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-12 text-center border-2 border-dashed border-zinc-200 rounded-xl dark:border-zinc-800">
              <AlertCircle className="w-12 h-12 mb-4 text-zinc-300 dark:text-zinc-700" />
              <p className="text-lg font-medium text-zinc-500 dark:text-zinc-400">Ready to Generate</p>
              <p className="mt-1 text-sm">Select Department, Month & Year, then click Generate Preview to load payroll data.</p>
            </div>
          ) : isPreviewLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-indigo-500" size={40} />
            </div>
          ) : previewData?.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-12 text-center border-2 border-dashed border-zinc-200 rounded-xl dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <AlertCircle className="w-12 h-12 mb-4 text-orange-400" />
              <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">No Payroll Data Found</p>
              <p className="mt-1 text-sm">There are no active employees or payroll lines available for this period in the selected department.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
                  <thead className="bg-zinc-100 text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-4 whitespace-nowrap">Employee</th>
                      <th className="px-6 py-4 text-right whitespace-nowrap">Basic Salary</th>
                      <th className="px-6 py-4 text-right whitespace-nowrap">Overtime</th>
                      <th className="px-6 py-4 text-right whitespace-nowrap">Bonuses</th>
                      <th className="px-6 py-4 text-right whitespace-nowrap">Incentives</th>
                      <th className="px-6 py-4 text-right whitespace-nowrap">Allowances</th>
                      <th className="px-6 py-4 text-right text-red-500 whitespace-nowrap">Tax</th>
                      <th className="px-6 py-4 text-right text-red-500 whitespace-nowrap">Provident Fund</th>
                      <th className="px-6 py-4 text-right text-red-500 whitespace-nowrap">Other Deductions</th>
                      <th className="px-6 py-4 text-right text-emerald-600 whitespace-nowrap">Net Salary</th>
                      <th className="px-6 py-4 text-right whitespace-nowrap">Bank Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {previewData?.map((line, idx) => (
                      <tr key={idx} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                          {line.employee_name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(line.base_salary)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-zinc-700 dark:text-zinc-300">
                          {line.overtime ? formatCurrency(line.overtime) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-zinc-700 dark:text-zinc-300">
                          {line.bonuses ? formatCurrency(line.bonuses) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-zinc-700 dark:text-zinc-300">
                          {line.incentives ? formatCurrency(line.incentives) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-zinc-700 dark:text-zinc-300">
                          {formatCurrency(line.allowances)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-red-500 font-medium">
                          {line.tax ? formatCurrency(line.tax) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-red-500 font-medium">
                          {line.provident_fund ? formatCurrency(line.provident_fund) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-red-500 font-medium">
                          {formatCurrency(line.deductions)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(line.net_pay)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-zinc-700 dark:text-zinc-300">
                          {line.bank_reference || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 flex justify-end gap-3 rounded-b-2xl">
          <Button variant="ghost" onClick={onClose} className="rounded-lg">Cancel</Button>
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
            disabled={!isPreviewActive || isPreviewLoading || !previewData?.length || runPayroll.isPending}
            onClick={handleRun}
          >
            {runPayroll.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Run Batch
          </Button>
        </div>
      </div>
    </div>
  );
}
