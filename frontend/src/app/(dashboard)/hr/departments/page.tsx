"use client";

import { useState } from 'react';
import ModuleGuard from '@/components/ModuleGuard';
import { useDepartments, useUpdateDepartment } from '@/features/hr/services/hr.api';
import DepartmentsGrid from '@/features/hr/components/DepartmentsGrid';
import AddDepartmentModal from '@/features/hr/components/AddDepartmentModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { notify } from '@/utils/toast';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export default function DepartmentsPage() {
  const { data, isLoading } = useDepartments();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const queryClient = useQueryClient();

  const updateMutation = useUpdateDepartment(''); // Using specific ID below

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

  const closeAndReset = () => {
    setShowAddModal(false);
    setSelectedDept(null);
  };

  return (
    <ModuleGuard moduleKey="employees">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Departments</h2>
            <p className="text-sm text-zinc-500">Manage company organizational structure</p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        </div>
        
        <DepartmentsGrid 
          data={data!} 
          isLoading={isLoading} 
          onEdit={handleEdit}
          onToggleStatus={handleToggleStatus}
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
