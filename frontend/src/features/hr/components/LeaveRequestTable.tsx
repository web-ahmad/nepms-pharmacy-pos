import { LeaveRequest } from '../types/hr';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useEmployees, useApproveLeave } from '../services/hr.api';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface LeaveRequestTableProps {
  data: LeaveRequest[];
  isLoading: boolean;
}

export default function LeaveRequestTable({ data, isLoading }: LeaveRequestTableProps) {
  const { data: employees } = useEmployees();
  const approveLeave = useApproveLeave();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="h-6 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="text-center text-zinc-500">
          <p className="font-medium">No leave requests found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-6 py-3 font-medium">Employee</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Duration</th>
              <th className="px-6 py-3 font-medium">Reason</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.map((leave) => {
              const emp = employees?.find(e => e.id === leave.employee_id);
              const empName = emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown';
              return (
                <tr key={leave.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{empName}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-zinc-900 dark:text-zinc-100">{leave.leave_type}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-xs font-mono">
                    {format(new Date(leave.start_date), 'MMM dd')} - {format(new Date(leave.end_date), 'MMM dd')}
                  </td>
                  <td className="px-6 py-4">{leave.reason}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {leave.status === 'Approved' && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Approved</Badge>}
                    {leave.status === 'Rejected' && <Badge variant="destructive">Rejected</Badge>}
                    {leave.status === 'Pending' && <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400">Pending</Badge>}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    {leave.status === 'Pending' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                        onClick={() => approveLeave.mutate(leave.id)}
                        disabled={approveLeave.isPending}
                      >
                        <Check className="mr-1 h-4 w-4" /> Approve
                      </Button>
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
