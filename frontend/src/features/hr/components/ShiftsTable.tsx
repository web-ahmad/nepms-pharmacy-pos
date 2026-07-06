import { useState } from 'react';
import { useShifts } from '../services/hr.api';
import AddShiftModal from './AddShiftModal';
import { Shift } from '../types/hr';
import { Edit2, Search, ShieldOff } from 'lucide-react';

export default function ShiftsTable() {
  const { data: shifts, isLoading } = useShifts();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | undefined>();

  const handleEdit = (shift: Shift) => {
    setSelectedShift(shift);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedShift(undefined);
    setIsModalOpen(true);
  };

  const formatTime = (time24: string) => {
    if (!time24) return '';
    const [h, m] = time24.split(':');
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const hStr = hours < 10 ? `0${hours}` : hours;
    return `${hStr}:${m} ${ampm}`;
  };

  if (isLoading) return <div className="p-8 text-center text-zinc-500">Loading...</div>;

  const filteredShifts = shifts?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search shifts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-zinc-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <button
          onClick={handleAdd}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          Add Shift
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
          <thead className="border-b border-zinc-200 bg-zinc-50/50 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
            <tr>
              <th className="px-6 py-4">Shift Name</th>
              <th className="px-6 py-4 text-center">Timings (Start - End)</th>
              <th className="px-6 py-4 text-center">Grace Period</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredShifts?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-zinc-500">
                  No shifts found.
                </td>
              </tr>
            )}
            {filteredShifts?.map((shift) => (
              <tr key={shift.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                  {shift.name}
                </td>
                <td className="px-6 py-4 text-center font-mono text-xs">
                  <span className="inline-flex items-center gap-2 rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                    <span className="text-zinc-700 dark:text-zinc-300">{formatTime(shift.start_time)}</span>
                    <span className="text-zinc-400">➔</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{formatTime(shift.end_time)}</span>
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
                    {shift.grace_period ?? 15} mins
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${shift.is_active !== false ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                    {shift.is_active !== false ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(shift)} className="p-1.5 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      <ShieldOff className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <AddShiftModal
          onClose={() => setIsModalOpen(false)}
          shift={selectedShift}
        />
      )}
    </div>
  );
}
