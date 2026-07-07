import { Department } from '../types/hr';
import { useEmployees } from '../services/hr.api';
import { Building2, Users, Edit2, Ban, CheckCircle, MoreVertical } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { DataExportMenu, ExportColumn } from '@/components/ui/DataExportMenu';

interface DepartmentsGridProps {
  data: Department[];
  isLoading: boolean;
  onEdit: (dept: Department) => void;
  onToggleStatus: (dept: Department) => void;
}

const DEPT_GRADIENTS = [
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-orange-500 to-amber-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-sky-600',
];

export default function DepartmentsGrid({ data, isLoading, onEdit, onToggleStatus }: DepartmentsGridProps) {
  const { data: employees } = useEmployees();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const exportColumns: ExportColumn[] = [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Description', accessorKey: 'description' },
    { header: 'Employees', accessorKey: 'employee_count' },
    { header: 'Status', accessorKey: (row: Department) => row.is_active ? 'Active' : 'Inactive' }
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-gray-100 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10 gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40">
          <Building2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-base font-bold text-gray-700 dark:text-zinc-300">No Departments Yet</h3>
        <p className="text-sm text-gray-400 text-center max-w-xs">Create departments to organise your workforce.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-gray-400 dark:text-zinc-500">{data.length} departments</span>
        <div className="flex gap-2">
          <DataExportMenu 
            title="Departments Directory" 
            data={data} 
            columns={exportColumns} 
            fileName="departments"
          />
        </div>
      </div>

      <div id="dept-print-area" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.map((dept, idx) => {
          const head = employees?.find(e => e.id === dept.head_id);
          const headInitials = head ? `${head.first_name[0]}${head.last_name[0]}`.toUpperCase() : '?';
          const gradient = DEPT_GRADIENTS[idx % DEPT_GRADIENTS.length];

          return (
            <div key={dept.id} className={`group relative flex flex-col rounded-2xl overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-200 ${dept.is_active ? 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950' : 'border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 opacity-70'}`}>
              {/* Top gradient strip */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />

              <div className="flex flex-col flex-1 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-zinc-100 leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {dept.name}
                      </h3>
                      {!dept.is_active && <span className="text-[10px] font-semibold text-red-500">Inactive</span>}
                    </div>
                  </div>

                  {/* Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === dept.id ? null : dept.id); }}
                      className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuId === dept.id && (
                      <div className="absolute right-0 mt-1 w-40 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg z-20">
                        <button onClick={() => { setOpenMenuId(null); onEdit(dept); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 rounded-t-xl transition-colors">
                          <Edit2 className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button onClick={() => { setOpenMenuId(null); onToggleStatus(dept); }} className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-b-xl transition-colors ${dept.is_active ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}>
                          {dept.is_active ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                          {dept.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {dept.description && (
                  <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 mb-3">{dept.description}</p>
                )}

                <div className="mt-auto pt-3 border-t border-gray-100 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                      {headInitials}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500">Head</p>
                      <p className="text-xs font-medium text-gray-800 dark:text-zinc-200">{head ? `${head.first_name} ${head.last_name}` : 'Not Assigned'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-zinc-900 px-2.5 py-1.5">
                    <Users className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">{dept.employee_count || 0} Employees</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
