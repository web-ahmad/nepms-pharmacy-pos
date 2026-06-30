import { useState } from 'react';
import { useRunPayroll } from '../services/hr.api';
import { Button } from '@/components/ui/button';

export default function PayrollRunModal({ onClose }: { onClose: () => void }) {
  const runPayroll = useRunPayroll();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const handleRun = () => {
    runPayroll.mutate({ month, year }, {
      onSuccess: () => onClose()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Run Payroll Batch</h3>
        <p className="mt-2 text-sm text-zinc-500">
          This action will generate the payroll lines for all active employees and automatically post a Journal Entry to the Accounting ledger.
        </p>

        <div className="mt-6 flex gap-4">
          <div className="w-1/2">
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Month (1-12)</label>
            <input 
              type="number" 
              min="1" max="12"
              value={month} 
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" 
            />
          </div>
          <div className="w-1/2">
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Year</label>
            <input 
              type="number" 
              value={year} 
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" 
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleRun} disabled={runPayroll.isPending}>
            {runPayroll.isPending ? 'Generating...' : 'Run Payroll'}
          </Button>
        </div>
      </div>
    </div>
  );
}
