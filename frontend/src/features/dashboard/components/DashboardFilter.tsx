import { format, subDays } from 'date-fns';
import { Calendar } from 'lucide-react';
import { DateRange } from '../services/dashboard.api';

interface DashboardFilterProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DashboardFilter({ dateRange, onChange }: DashboardFilterProps) {
  
  const handleSelect = (rangeType: string) => {
    const today = new Date();
    let from_date: string | undefined = undefined;
    let to_date: string | undefined = undefined;

    switch (rangeType) {
      case 'today':
        from_date = format(today, 'yyyy-MM-dd');
        to_date = format(today, 'yyyy-MM-dd');
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        from_date = format(yesterday, 'yyyy-MM-dd');
        to_date = format(yesterday, 'yyyy-MM-dd');
        break;
      case 'last7':
        from_date = format(subDays(today, 6), 'yyyy-MM-dd');
        to_date = format(today, 'yyyy-MM-dd');
        break;
      case 'last30':
        from_date = format(subDays(today, 29), 'yyyy-MM-dd');
        to_date = format(today, 'yyyy-MM-dd');
        break;
      case 'all':
        // Leave undefined to fetch all time (if backend supports it, which ours does)
        break;
    }

    onChange({ from_date, to_date });
  };

  const getActiveLabel = () => {
    if (!dateRange.from_date && !dateRange.to_date) return 'All Time';
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (dateRange.from_date === todayStr && dateRange.to_date === todayStr) return 'Today';
    return `${dateRange.from_date} - ${dateRange.to_date}`;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative group">
        <button className="flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
          <Calendar size={16} className="text-zinc-500" />
          {getActiveLabel()}
        </button>
        
        {/* Simple dropdown */}
        <div className="absolute right-0 mt-1 hidden w-40 flex-col rounded-md border border-zinc-200 bg-white p-1 shadow-lg group-hover:flex dark:border-zinc-700 dark:bg-zinc-800 z-50">
          <button onClick={() => handleSelect('today')} className="rounded-sm px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400">Today</button>
          <button onClick={() => handleSelect('yesterday')} className="rounded-sm px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400">Yesterday</button>
          <button onClick={() => handleSelect('last7')} className="rounded-sm px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400">Last 7 Days</button>
          <button onClick={() => handleSelect('last30')} className="rounded-sm px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400">Last 30 Days</button>
          <button onClick={() => handleSelect('all')} className="rounded-sm px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400">All Time</button>
        </div>
      </div>
    </div>
  );
}
