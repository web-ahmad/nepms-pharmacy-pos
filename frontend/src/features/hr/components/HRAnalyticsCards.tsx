import { HRAnalytics } from '../types/hr';

interface HRAnalyticsCardsProps {
  data?: HRAnalytics;
  isLoading: boolean;
}

export default function HRAnalyticsCards({ data, isLoading }: HRAnalyticsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(val);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
        <p className="text-sm font-medium text-zinc-500">Total Employees</p>
        <p className="text-2xl font-bold mt-2 text-zinc-900 dark:text-zinc-100">{data?.total_employees || 0}</p>
      </div>
      <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
        <p className="text-sm font-medium text-zinc-500">Active Employees</p>
        <p className="text-2xl font-bold mt-2 text-green-600 dark:text-green-400">{data?.active_employees || 0}</p>
      </div>
      <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
        <p className="text-sm font-medium text-zinc-500">Attendance %</p>
        <p className="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-400">{data?.attendance_percent || 0}%</p>
      </div>
      <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
        <p className="text-sm font-medium text-zinc-500">Pending Leaves</p>
        <p className="text-2xl font-bold mt-2 text-orange-600 dark:text-orange-400">{data?.pending_leaves || 0}</p>
      </div>
      <div className="p-6 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
        <p className="text-sm font-medium text-zinc-500">Est. Payroll Cost</p>
        <p className="text-2xl font-bold mt-2 text-indigo-600 dark:text-indigo-400">{formatCurrency(data?.monthly_payroll_cost || 0)}</p>
      </div>
    </div>
  );
}
