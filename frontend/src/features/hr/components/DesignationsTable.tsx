import { useState } from 'react';
import { useDesignations, useDepartments } from '../services/hr.api';
import AddDesignationModal from './AddDesignationModal';
import { Designation } from '../types/hr';
import { Edit2, MoreVertical, Search, ShieldOff } from 'lucide-react';

export default function DesignationsTable() {
  const { data: designations, isLoading } = useDesignations();
  const { data: departments } = useDepartments();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | undefined>();

  const handleEdit = (designation: Designation) => {
    setSelectedDesignation(designation);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedDesignation(undefined);
    setIsModalOpen(true);
  };

  if (isLoading) return <div className="p-8 text-center text-zinc-500">Loading...</div>;

  const filteredDesignations = designations?.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = departmentFilter ? d.department_id === departmentFilter : true;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search designations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-zinc-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-md border border-zinc-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">All Departments</option>
            {departments?.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAdd}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          Add Designation
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
          <thead className="border-b border-zinc-200 bg-zinc-50/50 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
            <tr>
              <th className="px-6 py-4">Designation Title</th>
              <th className="px-6 py-4">Department</th>
              <th className="px-6 py-4 text-center">Employees</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredDesignations?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-zinc-500">
                  No designations found.
                </td>
              </tr>
            )}
            {filteredDesignations?.map((designation) => (
              <tr key={designation.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                  {designation.name}
                  {designation.description && (
                    <div className="text-xs text-zinc-500 mt-1">{designation.description}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                    {designation.department_name || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {designation.employee_count || 0}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${designation.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                    {designation.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(designation)} className="p-1.5 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
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
        <AddDesignationModal
          onClose={() => setIsModalOpen(false)}
          designation={selectedDesignation}
        />
      )}
    </div>
  );
}
