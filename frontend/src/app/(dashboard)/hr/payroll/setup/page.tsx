"use client";

import { useState } from 'react';
import { useEmployees } from '@/features/hr/services/hr.api';
import { Loader2, Edit3, ArrowLeft, Wallet, Download, Printer } from 'lucide-react';
import Link from 'next/link';
import EditSalaryModal from '@/features/hr/components/EditSalaryModal';
import { Employee } from '@/features/hr/types/hr';
import { printHRReport, exportCSV } from '@/features/hr/utils/hrExport';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(v);

export default function SalarySetupPage() {
  const { data: employees, isLoading, isError, error } = useEmployees();
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const handleCSV = () => {
    if (!employees) return;
    exportCSV(
      employees.map(e => ({
        'Employee ID': e.employee_id || '',
        Name: `${e.first_name} ${e.last_name}`,
        'Salary Type': e.salary_type || 'Monthly',
        'Base Rate': e.base_salary ?? 0,
        'Account No': e.account_no || '',
      })),
      'salaries',
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/hr/payroll">
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <Wallet className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Salary Management</h2>
              <p className="text-xs text-gray-400 dark:text-zinc-500">Configure employee wage models and bank rates</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button onClick={() => printHRReport('sal-print-area', 'Salary Management Registry')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </div>

      {editingEmployee && (
        <EditSalaryModal 
          employee={editingEmployee} 
          onClose={() => setEditingEmployee(null)} 
        />
      )}

      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-12 space-y-4">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p className="text-gray-400 text-xs">Loading payroll registries...</p>
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-900/20">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Error Loading Data</h3>
          <p className="mt-2 text-sm text-red-500 dark:text-red-300">
            {error instanceof Error ? error.message : 'An unknown error occurred while fetching employees.'}
          </p>
        </div>
      ) : (
        <div id="sal-print-area" className="overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900">
                  {['Employee', 'Salary Type', 'Base Rate', 'Account No.', 'Actions'].map((h, i) => (
                    <th key={i} className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
                {employees?.map((emp) => {
                  const isConfigured = (emp.base_salary ?? 0) > 0;
                  return (
                    <tr key={emp.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-gray-900 dark:text-zinc-100">{emp.first_name} {emp.last_name}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{emp.employee_id || 'Pending'}</div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {isConfigured ? (
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${emp.salary_type === 'Hourly' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            {emp.salary_type || 'Monthly'}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            Not Configured
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs font-semibold text-gray-900 dark:text-zinc-100">
                        {isConfigured ? (
                          <>
                            {fmt(emp.base_salary ?? 0)}
                            <span className="text-[10px] font-sans text-gray-400 font-normal ml-0.5">
                              {emp.salary_type === 'Hourly' ? ' / hr' : ' / mo'}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-300 dark:text-zinc-700">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-gray-500">
                        {emp.account_no || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setEditingEmployee(emp)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-sm ${
                            isConfigured 
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:text-emerald-400' 
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          {isConfigured ? 'Edit Salary' : 'Set Salary'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
