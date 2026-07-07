import { useState } from 'react';
import { useUpdateEmployee } from '../services/hr.api';
import { Button } from '@/components/ui/button';
import { Employee } from '../types/hr';

interface EditSalaryModalProps {
  employee: Employee;
  onClose: () => void;
}

export default function EditSalaryModal({ employee, onClose }: EditSalaryModalProps) {
  const updateEmployee = useUpdateEmployee(employee.id);
  
  const [salaryType, setSalaryType] = useState(employee.salary_type || 'Monthly');
  const [baseSalary, setBaseSalary] = useState(employee.base_salary || 0);
  const [accountNo, setAccountNo] = useState(employee.account_no || '');

  const handleSave = () => {
    updateEmployee.mutate({
      salary_type: salaryType,
      base_salary: baseSalary,
      account_no: accountNo
    }, {
      onSuccess: () => onClose()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Edit Salary Structure
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          {employee.first_name} {employee.last_name} ({employee.employee_id})
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Salary Type
            </label>
            <select
              value={salaryType}
              onChange={(e) => setSalaryType(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="Monthly">Monthly</option>
              <option value="Hourly">Hourly</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Base Rate
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">Rs.</span>
              <input
                type="number"
                value={baseSalary}
                onChange={(e) => setBaseSalary(Number(e.target.value))}
                className="w-full rounded-md border border-zinc-300 pl-8 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {salaryType === 'Hourly' ? 'Amount paid per worked hour' : 'Fixed amount paid per month'}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Account Number
            </label>
            <input
              type="text"
              value={accountNo}
              onChange={(e) => setAccountNo(e.target.value)}
              placeholder="e.g. PK00IBAN000..."
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateEmployee.isPending}>
            {updateEmployee.isPending ? 'Saving...' : 'Save Structure'}
          </Button>
        </div>
      </div>
    </div>
  );
}
