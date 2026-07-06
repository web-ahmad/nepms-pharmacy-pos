import { Department } from '../types/hr';
import { useEmployees } from '../services/hr.api';
import { Building2, Users, MoreVertical, Edit2, Ban, CheckCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface DepartmentsGridProps {
  data: Department[];
  isLoading: boolean;
  onEdit: (dept: Department) => void;
  onToggleStatus: (dept: Department) => void;
}

export default function DepartmentsGrid({ data, isLoading, onEdit, onToggleStatus }: DepartmentsGridProps) {
  const { data: employees } = useEmployees();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
            <div className="h-6 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800 mb-4" />
            <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900 mb-2" />
            <div className="h-4 w-2/3 rounded bg-zinc-100 dark:bg-zinc-900" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4">
          <Building2 size={32} className="text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">No Departments Found</h3>
        <p className="text-sm text-zinc-500 mt-1 max-w-sm text-center">
          Create departments to organize your workforce efficiently.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {data.map(dept => {
        const head = employees?.find(e => e.id === dept.head_id);
        const headInitials = head ? `${head.first_name[0]}${head.last_name[0]}`.toUpperCase() : '';

        return (
          <div key={dept.id} className={`group relative flex flex-col rounded-xl border p-6 shadow-sm transition-all hover:shadow-md ${dept.is_active ? 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950' : 'border-zinc-200 bg-zinc-50 opacity-75 dark:border-zinc-800 dark:bg-zinc-900'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${dept.is_active ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800'}`}>
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-lg leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {dept.name}
                  </h3>
                  {!dept.is_active && <span className="text-xs font-medium text-red-500">Inactive</span>}
                </div>
              </div>
              
              <div className="relative inline-block text-left">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === dept.id ? null : dept.id);
                  }} 
                  className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                >
                  <MoreVertical size={20} />
                </button>
                {openMenuId === dept.id && (
                  <div className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-zinc-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:divide-zinc-800 dark:bg-zinc-900 dark:ring-white/10 z-10">
                    <div className="px-1 py-1">
                      <button 
                        onClick={() => { setOpenMenuId(null); onEdit(dept); }} 
                        className="text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-300 group flex w-full items-center rounded-md px-2 py-2 text-sm"
                      >
                        <Edit2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        Edit
                      </button>
                    </div>
                    <div className="px-1 py-1">
                      <button 
                        onClick={() => { setOpenMenuId(null); onToggleStatus(dept); }} 
                        className={`${dept.is_active ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:text-red-400' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 dark:text-green-400'} group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                      >
                        {dept.is_active ? <Ban className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        {dept.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {dept.description && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4">
                {dept.description}
              </p>
            )}

            <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800/50 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {head ? headInitials : '?'}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Department Head</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{head ? `${head.first_name} ${head.last_name}` : 'Not Assigned'}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900/50">
                <Users size={16} className="text-blue-500" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {dept.employee_count || 0} Employees
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
