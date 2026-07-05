import React, { useState, useEffect, useMemo } from 'react';
import { Role, Permission, RoleCreateUpdate } from '../types/roles';
import { useCreateRole, useUpdateRole } from '../services/roles.api';
import toast from 'react-hot-toast';
import { parseApiError } from '@/utils/errorParser';

interface RolePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  permissions: Permission[];
}

export const RolePermissionModal: React.FC<RolePermissionModalProps> = ({ isOpen, onClose, role, permissions }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description || '');
      setSelectedPermissions(role.permissions || []);
    } else {
      setName('');
      setDescription('');
      setSelectedPermissions([]);
    }
  }, [role, isOpen]);

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const map = new Map<string, Permission[]>();
    permissions.forEach(p => {
      const arr = map.get(p.module) || [];
      arr.push(p);
      map.set(p.module, arr);
    });
    return Array.from(map.entries());
  }, [permissions]);

  const handleTogglePermission = (code: string) => {
    if (role?.is_system_default) return;
    
    setSelectedPermissions(prev => 
      prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]
    );
  };

  const handleSave = async () => {
    try {
      const payload: RoleCreateUpdate = {
        name,
        description,
        permissions: selectedPermissions,
      };

      if (role) {
        await updateMutation.mutateAsync({ id: role.id, payload });
        toast.success('Role updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Role created successfully');
      }
      onClose();
    } catch (err: any) {
      toast.error(parseApiError(err));
    }
  };

  if (!isOpen) return null;

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isReadOnly = role?.is_system_default;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              {role ? (isReadOnly ? 'View System Role' : 'Edit Role') : 'Create Custom Role'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isReadOnly ? 'System roles cannot be modified.' : 'Configure role name and assign granular permissions.'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isReadOnly}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
                placeholder="e.g., Senior Cashier"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                disabled={isReadOnly}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
                placeholder="Optional description"
              />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Permission Matrix</h3>
          
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="p-4 font-semibold w-1/4">Module</th>
                  <th className="p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {groupedPermissions.map(([module, perms]) => (
                  <tr key={module} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 align-top">
                      <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                        {module.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-4">
                        {perms.map(p => (
                          <label key={p.id} className={`flex items-center gap-2 cursor-pointer ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}>
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedPermissions.includes(p.code)}
                                onChange={() => handleTogglePermission(p.code)}
                                disabled={isReadOnly}
                                className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 bg-white transition-all checked:border-blue-500 checked:bg-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:checked:border-blue-500 dark:checked:bg-blue-500"
                              />
                              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                </svg>
                              </div>
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-300 capitalize">
                              {p.action.replace('_', ' ')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            {isReadOnly ? 'Close' : 'Cancel'}
          </button>
          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? 'Saving...' : 'Save Role'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
