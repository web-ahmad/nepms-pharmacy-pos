import { Employee } from '../types/hr';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useDepartments } from '../services/hr.api';

interface EmployeeTableProps {
  data: Employee[];
  isLoading: boolean;
}

export default function EmployeeTable({ data, isLoading }: EmployeeTableProps) {
  const { data: departments } = useDepartments();

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
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="text-center text-zinc-500">
          <p className="font-medium">No employees found.</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(val);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Department</th>
              <th className="px-6 py-3 font-medium">Contact</th>
              <th className="px-6 py-3 font-medium">Join Date</th>
              <th className="px-6 py-3 font-medium text-right">Base Salary</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.map((emp) => {
              const dept = departments?.find(d => d.id === emp.department_id)?.name || 'Unknown';
              return (
                <tr key={emp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                    {emp.first_name} {emp.last_name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-zinc-900 dark:text-zinc-100">{dept}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex flex-col">
                      <span>{emp.email || '-'}</span>
                      <span className="text-xs text-zinc-500">{emp.phone || '-'}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">{format(new Date(emp.join_date), 'MMM dd, yyyy')}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right font-mono">{formatCurrency(emp.base_salary)}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {emp.is_active ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
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
