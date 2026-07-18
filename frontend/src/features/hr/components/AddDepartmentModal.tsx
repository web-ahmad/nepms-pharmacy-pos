import { useState, useRef } from 'react';
import { useCreateDepartment, useUpdateDepartment, useEmployees } from '../services/hr.api';
import { notify } from '@/utils/toast';

interface AddDepartmentModalProps {
  onClose: () => void;
  department?: any;
}

export default function AddDepartmentModal({ onClose, department }: AddDepartmentModalProps) {
  const [name, setName] = useState(department?.name || '');
  const [description, setDescription] = useState(department?.description || '');
  const [headId, setHeadId] = useState(department?.head_id || '');
  const [isActive, setIsActive] = useState(department ? department.is_active : true);

  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment(department?.id || '');
  const { data: employees } = useEmployees();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const isEditing = !!department;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const payload = {
        name,
        description: description || undefined,
        head_id: headId || undefined,
        is_active: isActive
      };
      console.log("Department Payload:", payload);

      if (isEditing) {
        await updateMutation.mutateAsync(payload);
        onClose();
        notify.success('Department updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        onClose();
        notify.success('Department created successfully');
      }
    } catch (err: any) {
      const data = err.response?.data;
      const exactMessage =
        (typeof data === 'string' && data ? data : null) ||
        data?.message ||
        data?.error ||
        (Array.isArray(data?.detail)
          ? `${data.detail[0]?.loc?.join('.')}: ${data.detail[0]?.msg}`
          : data?.detail) ||
        err.message ||
        'Failed to save department. Please try again.';
      notify.error(exactMessage);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-950">
        <h2 className="mb-6 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          {isEditing ? 'Edit Department' : 'Add Department'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Department Name <span className="text-red-500">*</span></label>
            <input required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Department Head</label>
            <select value={headId} onChange={e => setHeadId(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
              <option value="">None</option>
              {employees?.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
              ))}
            </select>
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
            <button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
              {isSubmitting || createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
