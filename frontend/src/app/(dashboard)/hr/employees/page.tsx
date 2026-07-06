"use client";

import { useState } from 'react';
import ModuleGuard from '@/components/ModuleGuard';
import { useEmployees, useDeleteEmployee } from '@/features/hr/services/hr.api';
import EmployeeTable from '@/features/hr/components/EmployeeTable';
import AddEmployeeForm from '@/features/hr/components/AddEmployeeForm';
import ViewEmployeeModal from '@/features/hr/components/ViewEmployeeModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { notify } from '@/utils/toast';
import { Employee } from '@/features/hr/types/hr';

export default function EmployeesPage() {
  const { data, isLoading } = useEmployees();
  const deleteMutation = useDeleteEmployee();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowAddForm(true);
  };

  const handleView = (employee: Employee) => {
    setViewingEmployee(employee);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure? This will archive the employee record.")) {
      try {
        await deleteMutation.mutateAsync(id);
        notify.success('Employee archived successfully');
      } catch (error) {
        console.error(error);
        notify.error('Failed to archive employee');
      }
    }
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingEmployee(null);
  };

  return (
    <ModuleGuard moduleKey="employees">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Staff Directory</h2>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          )}
        </div>
        
        {showAddForm ? (
          <AddEmployeeForm 
            onClose={handleCloseForm} 
            isEditing={!!editingEmployee} 
            initialData={editingEmployee || undefined} 
          />
        ) : viewingEmployee ? (
          <ViewEmployeeModal 
            employee={viewingEmployee} 
            onClose={() => setViewingEmployee(null)} 
          />
        ) : (
          <EmployeeTable 
            data={data!} 
            isLoading={isLoading} 
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </ModuleGuard>
  );
}
