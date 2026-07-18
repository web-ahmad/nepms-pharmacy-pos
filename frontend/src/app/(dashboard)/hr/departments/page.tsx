"use client";

import { useState } from 'react';
import ModuleGuard from '@/components/ModuleGuard';
import { useDepartments, useDeleteDepartment } from '@/features/hr/services/hr.api';
import DepartmentsGrid from '@/features/hr/components/DepartmentsGrid';
import AddDepartmentModal from '@/features/hr/components/AddDepartmentModal';
import { Plus, Building2 } from 'lucide-react';
import { notify } from '@/utils/toast';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export default function DepartmentsPage() {
  const { data, isLoading } = useDepartments();
  const deleteMutation = useDeleteDepartment();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const queryClient = useQueryClient();

  const handleEdit = (dept: any) => {
    setSelectedDept(dept);
    setShowAddModal(true);
  };

  const handleToggleStatus = async (dept: any) => {
    try {
      await api.put(`/api/v1/hr/departments/${dept.id}`, { is_active: !dept.is_active });
      queryClient.invalidateQueries({ queryKey: ['hr', 'departments'] });
      notify.success(`Department ${dept.is_active ? 'deactivated' : 'activated'} successfully`);
    } catch (err) {
      console.error(err);
      notify.error('Failed to change department status');
    }
  };

  const handleDelete = async (dept: any) => {
    if (window.confirm(`Are you sure you want to delete ${dept.name}? This action cannot be undone.`)) {
      try {
        await deleteMutation.mutateAsync(dept.id);
        notify.success('Department deleted successfully');
      } catch (err: any) {
        notify.error('Failed to delete department. It may be in use.');
      }
    }
  };

  const closeAndReset = () => {
    setShowAddModal(false);
    setSelectedDept(null);
  };

  return (
    <ModuleGuard moduleKey="employees">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <Building2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Departments</h2>
              <p className="text-xs text-gray-400 dark:text-zinc-500">Manage company organizational structure</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Department
          </button>
        </div>
        
        <DepartmentsGrid 
          data={data!} 
          isLoading={isLoading} 
          onEdit={handleEdit}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
        />

        {showAddModal && (
          <AddDepartmentModal 
            onClose={closeAndReset} 
            department={selectedDept}
          />
        )}
      </div>
    </ModuleGuard>
  );
}
