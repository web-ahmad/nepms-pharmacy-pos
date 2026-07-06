import { useState } from 'react';
import { useCreateDesignation, useUpdateDesignation, useDepartments } from '../services/hr.api';
import { notify } from '@/utils/toast';
import { Designation } from '../types/hr';

interface AddDesignationModalProps {
  onClose: () => void;
  designation?: Designation;
}

export default function AddDesignationModal({ onClose, designation }: AddDesignationModalProps) {
  const [name, setName] = useState(designation?.name || '');
  const [description, setDescription] = useState(designation?.description || '');
  const [departmentId, setDepartmentId] = useState(designation?.department_id || '');
  const [isActive, setIsActive] = useState(designation ? designation.is_active : true);

  const createMutation = useCreateDesignation();
  const updateMutation = useUpdateDesignation(designation?.id || '');
  const { data: departments } = useDepartments();

  const isEditing = !!designation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) {
      notify.error("Please select a department");
      return;
    }

    try {
      const payload = {
        name,
        department_id: departmentId,
        description: description || undefined,
        is_active: isActive
      };

      if (isEditing) {
        await updateMutation.mutateAsync(payload);
        notify.success('Designation updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        notify.success('Designation created successfully');
      }
      onClose();
    } catch (err) {
      console.error(err);
      notify.error(isEditing ? 'Failed to update designation' : 'Failed to create designation');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-950">
        <h2 className="mb-6 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          {isEditing ? 'Edit Designation' : 'Add Designation'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Designation Title <span className="text-red-500">*</span></label>
            <input required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Department <span className="text-red-500">*</span></label>
            <select required value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <option value="">Select a Department</option>
              {departments?.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <div className="peer h-6 w-11 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-zinc-700 dark:peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Active</span>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
