import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Role, Permission, RoleCreateUpdate } from '../types/roles';
import { useCreateRole, useUpdateRole } from '../services/roles.api';
import toast from 'react-hot-toast';
import { parseApiError } from '@/utils/errorParser';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, CheckSquare, Square, Check, X } from 'lucide-react';

interface RolePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  permissions: Permission[];
}

export const RolePermissionModal: React.FC<RolePermissionModalProps> = ({ isOpen, onClose, role, permissions }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [branchScope, setBranchScope] = useState('assigned_branch');
  const [dataScope, setDataScope] = useState('branch');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description || '');
      setBranchScope(role.branch_scope || 'assigned_branch');
      setDataScope(role.data_scope || 'branch');
      setSelectedPermissions(new Set(role.permissions || []));
    } else {
      setName('');
      setDescription('');
      setBranchScope('assigned_branch');
      setDataScope('branch');
      setSelectedPermissions(new Set());
    }
    setSearchQuery('');
  }, [role, isOpen]);

  const groupedPermissions = useMemo(() => {
    const map = new Map<string, Permission[]>();
    const lowerQuery = searchQuery.toLowerCase();
    
    const uniquePermissions = Array.from(
      new Map(permissions.map(p => [p.code, p])).values()
    );
    
    uniquePermissions.forEach(p => {
      if (searchQuery && !p.module.toLowerCase().includes(lowerQuery) && !p.action.toLowerCase().includes(lowerQuery)) {
        return;
      }
      const arr = map.get(p.module) || [];
      arr.push(p);
      map.set(p.module, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [permissions, searchQuery]);

  const rowVirtualizer = useVirtualizer({
    count: groupedPermissions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  const handleTogglePermission = (code: string) => {
    if (role?.is_system_default) return;
    const next = new Set(selectedPermissions);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    setSelectedPermissions(next);
  };

  const handleToggleModule = (module: string, perms: Permission[]) => {
    if (role?.is_system_default) return;
    const next = new Set(selectedPermissions);
    const allSelected = perms.every(p => next.has(p.code));
    
    if (allSelected) {
      perms.forEach(p => next.delete(p.code));
    } else {
      perms.forEach(p => next.add(p.code));
    }
    setSelectedPermissions(next);
  };

  const handleSelectAll = () => {
    if (role?.is_system_default) return;
    if (selectedPermissions.size === permissions.length) {
      setSelectedPermissions(new Set());
    } else {
      setSelectedPermissions(new Set(permissions.map(p => p.code)));
    }
  };

  const handleSave = async () => {
    try {
      const payload: RoleCreateUpdate = {
        name,
        description,
        branch_scope: branchScope,
        data_scope: dataScope,
        permissions: Array.from(selectedPermissions),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col h-[95vh] border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              {role ? (isReadOnly ? 'View System Role' : 'Edit Role') : 'Create Custom Role'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isReadOnly ? 'System roles cannot be modified.' : 'Configure role settings and granular permissions.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-shrink-0 grid grid-cols-4 gap-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="col-span-2">
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
          <div className="col-span-2">
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
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Branch Scope</label>
            <select
              value={branchScope}
              onChange={e => setBranchScope(e.target.value)}
              disabled={isReadOnly}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
            >
              <option value="global">Global (All Branches)</option>
              <option value="all_branches">All Branches (Tenant)</option>
              <option value="assigned_branch">Assigned Branch Only</option>
              <option value="selected_branches">Selected Branches</option>
              <option value="assigned_counter">Assigned Counter</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Scope</label>
            <select
              value={dataScope}
              onChange={e => setDataScope(e.target.value)}
              disabled={isReadOnly}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
            >
              <option value="global">Global</option>
              <option value="tenant">Tenant Wide</option>
              <option value="branch">Branch Wide</option>
              <option value="selected_branches">Selected Branches</option>
              <option value="own_records">Own Records Only</option>
            </select>
          </div>
        </div>

        {/* Sticky Toolbar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={isReadOnly}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 disabled:opacity-50"
            >
              {selectedPermissions.size === permissions.length ? <CheckSquare size={18} /> : <Square size={18} />}
              {selectedPermissions.size === permissions.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-sm text-slate-500">
              {selectedPermissions.size} / {permissions.length} selected
            </span>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Virtualized Matrix */}
        <div ref={parentRef} className="flex-1 overflow-auto custom-scrollbar px-6 py-4">
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const [module, perms] = groupedPermissions[virtualRow.index];
              const isAllModuleSelected = perms.every(p => selectedPermissions.has(p.code));
              const isSomeModuleSelected = perms.some(p => selectedPermissions.has(p.code)) && !isAllModuleSelected;

              return (
                <div
                  key={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="border-b border-slate-100 dark:border-slate-800 py-3"
                >
                  <div className="flex">
                    <div className="w-1/4 pr-4">
                      <button
                        type="button"
                        onClick={() => handleToggleModule(module, perms)}
                        disabled={isReadOnly}
                        className="flex items-center gap-2 group text-left w-full"
                      >
                        <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={isAllModuleSelected}
                            ref={input => {
                              if (input) input.indeterminate = isSomeModuleSelected;
                            }}
                            readOnly
                            className="peer w-5 h-5 cursor-pointer appearance-none rounded border border-slate-300 bg-white checked:border-blue-500 checked:bg-blue-500 indeterminate:bg-blue-500 indeterminate:border-blue-500 dark:border-slate-600 dark:bg-slate-800"
                          />
                          {isAllModuleSelected && <Check className="absolute text-white w-3.5 h-3.5 pointer-events-none" />}
                          {isSomeModuleSelected && <div className="absolute bg-blue-500 w-2.5 h-0.5 rounded-full pointer-events-none" />}
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize group-hover:text-blue-600 transition-colors">
                          {module.replace(/_/g, ' ')} ({perms.filter(p => selectedPermissions.has(p.code)).length}/{perms.length})
                        </span>
                      </button>
                    </div>
                    <div className="w-3/4 flex flex-wrap gap-x-6 gap-y-3">
                      {perms.map(p => (
                        <label key={p.id} className={`flex items-center gap-2 cursor-pointer ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}>
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.has(p.code)}
                              onChange={() => handleTogglePermission(p.code)}
                              disabled={isReadOnly}
                              className="w-4 h-4 cursor-pointer appearance-none rounded border border-slate-300 bg-white checked:border-blue-500 checked:bg-blue-500 dark:border-slate-600 dark:bg-slate-800 transition-all"
                            />
                            {selectedPermissions.has(p.code) && <Check className="absolute text-white w-3 h-3 pointer-events-none" />}
                          </div>
                          <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                            {p.action.replace(/_/g, ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 rounded-b-2xl">
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
