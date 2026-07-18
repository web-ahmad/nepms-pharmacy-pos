import { useState } from 'react';
import { useDesignations, useDepartments } from '../services/hr.api';
import AddDesignationModal from './AddDesignationModal';
import { Designation } from '../types/hr';
import { Edit2, Search, ShieldOff, ShieldCheck, Plus } from 'lucide-react';
import { DataExportMenu, ExportColumn } from '@/components/ui/DataExportMenu';
import { api } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '@/utils/toast';

export default function DesignationsTable() {
  const { data: designations, isLoading } = useDesignations();
  const { data: departments } = useDepartments();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | undefined>();

  const handleEdit = (d: Designation) => { setSelectedDesignation(d); setIsModalOpen(true); };
  const handleAdd  = () => { setSelectedDesignation(undefined); setIsModalOpen(true); };

  const queryClient = useQueryClient();
  const handleToggleStatus = async (d: Designation) => {
    try {
      await api.put(`/api/v1/hr/designations/${d.id}`, { is_active: !d.is_active });
      queryClient.invalidateQueries({ queryKey: ['hr', 'designations'] });
      notify.success(`Designation ${d.is_active ? 'deactivated' : 'activated'} successfully`);
    } catch (err) {
      notify.error('Failed to change designation status');
    }
  };

  const filtered = designations?.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (departmentFilter ? d.department_id === departmentFilter : true)
  );

  const exportColumns: ExportColumn[] = [
    { header: 'Title', accessorKey: 'name' },
    { header: 'Department', accessorKey: 'department_name' },
    { header: 'Employees', accessorKey: 'employee_count' },
    { header: 'Status', accessorKey: (row: Designation) => row.is_active ? 'Active' : 'Inactive' },
    { header: 'Description', accessorKey: 'description' }
  ];

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-zinc-800" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Filters + Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search designations…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2 pl-9 pr-3 text-sm text-gray-900 dark:text-zinc-100 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-colors"
            />
          </div>
          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2 px-3 text-sm text-gray-900 dark:text-zinc-100 focus:border-emerald-400 focus:outline-none transition-colors"
          >
            <option value="">All Departments</option>
            {departments?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <DataExportMenu 
            title="Designations Report" 
            data={filtered || []} 
            columns={exportColumns} 
            fileName="designations"
          />
          <button onClick={handleAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div id="desig-print-area" className="overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900">
                {['Title', 'Department', 'Employees', 'Status', 'Actions'].map((h, i) => (
                  <th key={i} className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 ${h === 'Employees' || h === 'Status' ? 'text-center' : h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
              {!filtered?.length && (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">No designations found.</td></tr>
              )}
              {filtered?.map(d => (
                <tr key={d.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-gray-900 dark:text-zinc-100">{d.name}</p>
                    {d.description && <p className="text-xs text-gray-400 mt-0.5">{d.description}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      {d.department_name || 'N/A'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center font-semibold text-gray-700 dark:text-zinc-300">{d.employee_count || 0}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${d.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {d.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(d)} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleToggleStatus(d)} className={`p-1.5 rounded-lg transition-colors ${d.is_active ? 'text-red-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400' : 'text-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400'}`}>
                        {d.is_active ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 px-5 py-2.5 text-xs text-gray-400 dark:text-zinc-500">
          {filtered?.length ?? 0} designations
        </div>
      </div>

      {isModalOpen && <AddDesignationModal onClose={() => setIsModalOpen(false)} designation={selectedDesignation} />}
    </div>
  );
}
