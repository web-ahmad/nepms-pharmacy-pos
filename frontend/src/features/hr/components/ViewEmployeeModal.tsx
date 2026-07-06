import { Employee } from '../types/hr';
import { useDepartments, useDesignations, useShifts } from '../services/hr.api';
import { X } from 'lucide-react';

interface ViewEmployeeModalProps {
  employee: Employee;
  onClose: () => void;
}

export default function ViewEmployeeModal({ employee, onClose }: ViewEmployeeModalProps) {
  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();
  const { data: shifts } = useShifts();

  const deptName = departments?.find(d => d.id === employee.department_id)?.name || 'Unknown';
  const desigName = designations?.find(d => d.id === employee.designation_id)?.name || 'Unknown';
  const shiftName = shifts?.find(s => s.id === employee.shift_id)?.name || 'Unknown';

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950 flex flex-col max-h-[90vh]">
      <div className="flex items-center justify-between border-b border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Employee Profile</h2>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <X size={20} className="text-zinc-500" />
        </button>
      </div>
      
      <div className="p-6 overflow-y-auto space-y-6">
        {/* Header / Avatar */}
        <div className="flex items-center gap-4 border-b border-zinc-100 pb-6 dark:border-zinc-800">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {employee.first_name?.[0]}{employee.last_name?.[0]}
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {employee.first_name} {employee.last_name}
            </h3>
            <p className="text-sm font-mono text-zinc-500">{employee.employee_id}</p>
            <p className="text-sm text-blue-600 dark:text-blue-400">@{employee.username}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Personal Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Personal Information</h4>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <span className="block text-zinc-500">Email</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{employee.email || '-'}</span>
              </div>
              <div>
                <span className="block text-zinc-500">Phone</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{employee.phone || '-'}</span>
              </div>
              <div>
                <span className="block text-zinc-500">CNIC</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{employee.cnic || '-'}</span>
              </div>
              <div>
                <span className="block text-zinc-500">Date of Birth</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{employee.dob || '-'}</span>
              </div>
              <div>
                <span className="block text-zinc-500">Gender</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{employee.gender || '-'}</span>
              </div>
              <div>
                <span className="block text-zinc-500">Address</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{employee.address || '-'}</span>
              </div>
            </div>
          </div>

          {/* Employment Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Employment Details</h4>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <span className="block text-zinc-500">Department</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{deptName}</span>
              </div>
              <div>
                <span className="block text-zinc-500">Designation</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{desigName}</span>
              </div>
              <div>
                <span className="block text-zinc-500">Shift</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{shiftName}</span>
              </div>
              <div>
                <span className="block text-zinc-500">Date of Joining</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{employee.join_date}</span>
              </div>
              <div>
                <span className="block text-zinc-500">Status</span>
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${employee.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {employee.is_active ? 'Active' : 'Archived'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t border-zinc-200 p-6 flex justify-end dark:border-zinc-800">
        <button onClick={onClose} className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700 transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}
