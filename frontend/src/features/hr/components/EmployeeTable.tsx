import { Employee } from '../types/hr';
import { useDepartments, useDesignations } from '../services/hr.api';
import { Users, Eye, Pencil, Trash2 } from 'lucide-react';
import { DataExportMenu, ExportColumn } from '@/components/ui/DataExportMenu';

interface EmployeeTableProps {
  data: Employee[];
  isLoading: boolean;
  onView: (e: Employee) => void;
  onEdit: (e: Employee) => void;
  onDelete: (id: string) => void;
}

export default function EmployeeTable({ data, isLoading, onView, onEdit, onDelete }: EmployeeTableProps) {
  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();

  const getDept  = (id: string) => departments?.find(d => d.id === id)?.name  || '—';
  const getDesig = (id: string) => designations?.find(d => d.id === id)?.name || '—';

  const exportColumns: ExportColumn[] = [
    { header: 'Employee ID', accessorKey: 'employee_id' },
    { header: 'First Name', accessorKey: 'first_name' },
    { header: 'Last Name', accessorKey: 'last_name' },
    { header: 'Username', accessorKey: 'username' },
    { header: 'Email', accessorKey: 'email' },
    { header: 'Phone', accessorKey: 'phone' },
    { header: 'Department', accessorKey: (row: Employee) => getDept(row.department_id) },
    { header: 'Designation', accessorKey: (row: Employee) => getDesig(row.designation_id) },
    { header: 'Base Salary', accessorKey: 'base_salary' },
    { header: 'Active', accessorKey: (row: Employee) => row.is_active ? 'Yes' : 'No' },
    { header: 'Join Date', accessorKey: 'join_date' }
  ];

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-zinc-800" />)}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10 gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40">
          <Users className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-base font-bold text-gray-700 dark:text-zinc-300">No Employees Found</h3>
        <p className="text-sm text-gray-400 dark:text-zinc-500 text-center max-w-xs">
          Click "Add Employee" to start building your staff directory.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-gray-400 dark:text-zinc-500">{data.length} employees</span>
        <div className="flex gap-2">
          <DataExportMenu 
            title="Employee Directory" 
            data={data} 
            columns={exportColumns} 
            fileName="employees"
          />
        </div>
      </div>

      {/* Table */}
      <div id="emp-print-area" className="overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900">
                {['Employee', 'ID', 'Contact', 'Department · Role', 'Salary', 'Status', 'Actions'].map((h, i) => (
                  <th key={i} className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 ${h === 'Actions' || h === 'Salary' ? 'text-right' : 'text-left'} ${h === 'Status' ? 'text-center' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
              {data.map((emp) => {
                const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();
                const colors = ['bg-emerald-100 text-emerald-700', 'bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700', 'bg-orange-100 text-orange-700', 'bg-teal-100 text-teal-700'];
                const colorIdx = emp.first_name?.charCodeAt(0) % colors.length || 0;

                return (
                  <tr key={emp.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors group">
                    {/* Employee */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-sm shrink-0 ${colors[colorIdx]} dark:bg-emerald-900/40 dark:text-emerald-300`}>
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-zinc-100">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-gray-400 dark:text-zinc-500">@{emp.username || 'pending'}</p>
                        </div>
                      </div>
                    </td>
                    {/* ID */}
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-gray-600 dark:text-zinc-400 whitespace-nowrap">
                      {emp.employee_id || <span className="text-gray-300 dark:text-zinc-600">Pending</span>}
                    </td>
                    {/* Contact */}
                    <td className="px-5 py-3.5">
                      <p className="text-gray-800 dark:text-zinc-200 text-xs">{emp.phone || '—'}</p>
                      <p className="text-gray-400 dark:text-zinc-500 text-xs">{emp.email || '—'}</p>
                    </td>
                    {/* Dept / Role */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <p className="font-medium text-gray-800 dark:text-zinc-200 text-xs">{getDept(emp.department_id)}</p>
                      <p className="text-gray-400 dark:text-zinc-500 text-xs">{getDesig(emp.designation_id)}</p>
                    </td>
                    {/* Salary */}
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-gray-900 dark:text-zinc-100 whitespace-nowrap">
                      Rs {(emp.base_salary ?? 0).toLocaleString('en-PK')}
                    </td>
                    {/* Status toggle */}
                    <td className="px-5 py-3.5 text-center">
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" className="peer sr-only" checked={emp.is_active} readOnly />
                        <div className="peer h-5 w-9 rounded-full bg-gray-200 dark:bg-zinc-700 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full" />
                      </label>
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onView(emp)} className="p-1.5 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors" title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => onEdit(emp)} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => onDelete(emp.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors" title="Archive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 px-5 py-2.5 text-xs text-gray-400 dark:text-zinc-500">
          {data.length} employees · {data.filter(e => e.is_active).length} active
        </div>
      </div>
    </div>
  );
}
