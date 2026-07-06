import { Employee } from '../types/hr';
import { useDepartments, useDesignations } from '../services/hr.api';
import { Users, Eye, Pencil, Trash2 } from 'lucide-react';

interface EmployeeTableProps {
  data: Employee[];
  isLoading: boolean;
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
}

export default function EmployeeTable({ data, isLoading, onView, onEdit, onDelete }: EmployeeTableProps) {
  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="h-6 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4">
          <Users size={32} className="text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">No Employees Found</h3>
        <p className="text-sm text-zinc-500 mt-1 max-w-sm text-center">
          You haven't added any employees yet. Click the "Add Employee" button to start building your directory.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-6 py-4 font-medium">Employee</th>
              <th className="px-6 py-4 font-medium">Emp ID</th>
              <th className="px-6 py-4 font-medium">Contact Info</th>
              <th className="px-6 py-4 font-medium">Department & Role</th>
              <th className="px-6 py-4 font-medium text-center">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.map((emp) => {
              const dept = departments?.find(d => d.id === emp.department_id)?.name || 'Unknown';
              const desig = designations?.find(d => d.id === emp.designation_id)?.name || 'Unknown';
              
              // Initials for Avatar
              const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();

              return (
                <tr key={emp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold">
                        {initials}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {emp.first_name} {emp.last_name}
                        </span>
                        <span className="text-xs text-zinc-500">@{emp.username || 'pending'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-mono font-medium text-zinc-700 dark:text-zinc-300">
                    {emp.employee_id || 'Pending'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-zinc-800 dark:text-zinc-200">{emp.phone || '-'}</span>
                      <span className="text-xs text-zinc-500">{emp.email || '-'}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{dept}</span>
                      <span className="text-xs text-zinc-500">{desig}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center">
                    {/* Status Toggle Visual (Wait, user asked for Status Toggle (Active/Inactive), here I will show a switch or badge. I'll use a badge for now since it's cleaner in a table, or a tiny toggle) */}
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" className="peer sr-only" checked={emp.is_active} readOnly />
                      <div className="peer h-5 w-9 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-zinc-700 dark:peer-checked:bg-green-500"></div>
                    </label>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onView(emp)}
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => onEdit(emp)}
                        className="rounded-md p-1.5 text-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => onDelete(emp.id)}
                        className="rounded-md p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
