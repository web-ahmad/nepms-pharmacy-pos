import { useState } from 'react';
import { useShifts } from '../services/hr.api';
import AddShiftModal from './AddShiftModal';
import { Shift } from '../types/hr';
import { Edit2, Search, ShieldOff, Plus, Clock } from 'lucide-react';
import { DataExportMenu, ExportColumn } from '@/components/ui/DataExportMenu';

const fmt12 = (time24: string) => {
  if (!time24) return '';
  const [h, m] = time24.split(':');
  let hours = parseInt(h, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${m} ${ampm}`;
};

export default function ShiftsTable() {
  const { data: shifts, isLoading } = useShifts();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | undefined>();

  const handleEdit = (s: Shift) => { setSelectedShift(s); setIsModalOpen(true); };
  const handleAdd  = () => { setSelectedShift(undefined); setIsModalOpen(true); };

  const filtered = shifts?.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const exportColumns: ExportColumn[] = [
    { header: 'Shift Name', accessorKey: 'name' },
    { header: 'Start Time', accessorKey: (row: Shift) => fmt12(row.start_time) },
    { header: 'End Time', accessorKey: (row: Shift) => fmt12(row.end_time) },
    { header: 'Grace Period (mins)', accessorKey: 'grace_period' },
    { header: 'Status', accessorKey: (row: Shift) => row.is_active !== false ? 'Active' : 'Inactive' }
  ];

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-zinc-800" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search shifts…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2 pl-9 pr-3 text-sm text-gray-900 dark:text-zinc-100 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <DataExportMenu 
            title="Shifts Report" 
            data={filtered || []} 
            columns={exportColumns} 
            fileName="shifts"
          />
          <button onClick={handleAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm">
            <Plus className="h-3.5 w-3.5" /> Add Shift
          </button>
        </div>
      </div>

      {/* Table */}
      <div id="shifts-print-area" className="overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900">
                {['Shift Name', 'Timings', 'Grace Period', 'Status', 'Actions'].map((h, i) => (
                  <th key={i} className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 ${['Timings', 'Grace Period', 'Status'].includes(h) ? 'text-center' : h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
              {!filtered?.length && (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">No shifts found.</td></tr>
              )}
              {filtered?.map(shift => (
                <tr key={shift.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-zinc-100">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                        <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      {shift.name}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-zinc-800 px-3 py-1 font-mono text-xs text-gray-700 dark:text-zinc-300">
                      {fmt12(shift.start_time)}
                      <span className="text-gray-400">→</span>
                      {fmt12(shift.end_time)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700 dark:text-orange-400">
                      {shift.grace_period ?? 15} mins
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${shift.is_active !== false ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {shift.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(shift)} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors">
                        <ShieldOff className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 px-5 py-2.5 text-xs text-gray-400 dark:text-zinc-500">
          {filtered?.length ?? 0} shifts
        </div>
      </div>

      {isModalOpen && <AddShiftModal onClose={() => setIsModalOpen(false)} shift={selectedShift} />}
    </div>
  );
}
