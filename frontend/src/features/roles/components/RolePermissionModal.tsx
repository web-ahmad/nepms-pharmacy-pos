import React, { useState, useEffect, useMemo } from 'react';
import { Role, Permission, RoleCreateUpdate } from '../types/roles';
import { useCreateRole, useUpdateRole } from '../services/roles.api';
import toast from 'react-hot-toast';
import { parseApiError } from '@/utils/errorParser';
import { Search, CheckSquare, Square, Check, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RolePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  permissions: Permission[];
}

const getBadgeColor = (action: string) => {
  const a = action.toLowerCase();
  if (['create', 'add'].includes(a)) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
  if (['delete', 'remove', 'void'].includes(a)) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800';
  if (['view', 'read'].includes(a)) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
  if (['update', 'edit', 'manage', 'approve'].includes(a)) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
  if (['export', 'import'].includes(a)) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
};

const ModuleAccordion = ({
  module,
  perms,
  selectedPermissions,
  handleTogglePermission,
  handleToggleModule,
  isReadOnly,
  searchQuery
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Auto-expand if searching and there is a match
  useEffect(() => {
    if (searchQuery) setIsOpen(true);
    else setIsOpen(false);
  }, [searchQuery]);

  const selectedCount = perms.filter((p: any) => selectedPermissions.has(p.code)).length;
  const isAllSelected = selectedCount === perms.length;
  const isSomeSelected = selectedCount > 0 && !isAllSelected;

  return (
    <div className="mb-3 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40 shadow-sm hover:shadow-md transition-shadow">
      <div 
        className="px-5 py-4 flex items-center justify-between cursor-pointer select-none bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={input => { if (input) input.indeterminate = isSomeSelected; }}
              onChange={() => handleToggleModule(module, perms)}
              disabled={isReadOnly}
              className="peer w-5 h-5 cursor-pointer appearance-none rounded border border-slate-300 bg-white checked:border-blue-500 checked:bg-blue-500 indeterminate:bg-blue-500 indeterminate:border-blue-500 dark:border-slate-600 dark:bg-slate-800 disabled:opacity-50 transition-all"
            />
            {isAllSelected && <Check className="absolute text-white w-3.5 h-3.5 pointer-events-none" />}
            {isSomeSelected && <div className="absolute bg-blue-500 w-2.5 h-0.5 rounded-full pointer-events-none" />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 capitalize text-base tracking-tight">
              {module.replace(/_/g, ' ')}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              <span className={selectedCount > 0 ? "text-blue-600 dark:text-blue-400 font-bold" : ""}>{selectedCount}</span> of {perms.length} permissions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="text-slate-400" size={20} />
          </motion.div>
        </div>
      </div>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900/20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {perms.map((p: any) => {
                const checked = selectedPermissions.has(p.code);
                return (
                  <label 
                    key={p.id} 
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      checked 
                        ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/50 shadow-sm' 
                        : 'bg-white border-slate-100 hover:border-slate-300 dark:bg-slate-900/30 dark:border-slate-800/60 dark:hover:border-slate-700'
                    } ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <div className="relative flex items-center justify-center mt-0.5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleTogglePermission(p.code)}
                        disabled={isReadOnly}
                        className="w-4 h-4 cursor-pointer appearance-none rounded border border-slate-300 bg-white checked:border-blue-500 checked:bg-blue-500 dark:border-slate-600 dark:bg-slate-800 transition-all disabled:opacity-50"
                      />
                      {checked && <Check className="absolute text-white w-3 h-3 pointer-events-none" />}
                    </div>
                    <div className="flex flex-col gap-1.5 overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border capitalize tracking-wide ${getBadgeColor(p.action)}`}>
                          {p.action.replace(/_/g, ' ')}
                        </span>
                        {p.is_sensitive && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-100 border border-rose-200 dark:border-rose-800 dark:text-rose-400 dark:bg-rose-900/30 px-1.5 py-0.5 rounded-md">
                            Sensitive
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate" title={p.description}>
                          {p.description}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const RolePermissionModal: React.FC<RolePermissionModalProps> = ({ isOpen, onClose, role, permissions }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [branchScope, setBranchScope] = useState('assigned_branch');
  const [dataScope, setDataScope] = useState('branch');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-50 dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-7xl flex flex-col h-[95vh] border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                  {role ? (isReadOnly ? 'View System Role' : 'Edit Role') : 'Create Custom Role'}
                </h2>
                {isReadOnly && (
                  <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                    System Default
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 font-medium">
                {isReadOnly ? 'System roles are managed by the platform and cannot be modified.' : 'Configure role identity, access boundaries, and granular module permissions.'}
              </p>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              <X size={22} />
            </button>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar flex flex-col">
            {/* Metadata Section */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Role Identity</label>
                  <div className="space-y-4">
                    <div>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        disabled={isReadOnly}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-60 font-medium text-slate-900 dark:text-white placeholder-slate-400"
                        placeholder="e.g., Senior Pharmacist"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        disabled={isReadOnly}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-60 text-sm text-slate-900 dark:text-white placeholder-slate-400"
                        placeholder="Brief description of responsibilities..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Access Boundaries</label>
                  <div className="space-y-4 grid grid-cols-2 gap-4">
                    <div className="mt-0">
                      <select
                        value={branchScope}
                        onChange={e => setBranchScope(e.target.value)}
                        disabled={isReadOnly}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-60 text-sm font-medium text-slate-800 dark:text-slate-200"
                      >
                        <option value="global">Global (All Branches)</option>
                        <option value="all_branches">All Branches (Tenant)</option>
                        <option value="assigned_branch">Assigned Branch Only</option>
                        <option value="selected_branches">Selected Branches</option>
                        <option value="assigned_counter">Assigned Counter</option>
                      </select>
                    </div>
                    <div className="mt-0">
                      <select
                        value={dataScope}
                        onChange={e => setDataScope(e.target.value)}
                        disabled={isReadOnly}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-60 text-sm font-medium text-slate-800 dark:text-slate-200"
                      >
                        <option value="global">Global</option>
                        <option value="tenant">Tenant Wide</option>
                        <option value="branch">Branch Wide</option>
                        <option value="selected_branches">Selected Branches</option>
                        <option value="own_records">Own Records Only</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Controls which branches this role can access and whether they see all branch data or only their own records.
                  </p>
                </div>
              </div>
            </div>

            {/* Permissions Toolbar */}
            <div className="px-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Module Permissions</h3>
                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={isReadOnly}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 transition-colors"
                >
                  {selectedPermissions.size === permissions.length ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                  {selectedPermissions.size === permissions.length ? 'Deselect All Permissions' : 'Select All Permissions'}
                </button>
                <span className="text-sm font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{selectedPermissions.size}</span> / {permissions.length} selected
                </span>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search modules or actions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-medium bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-400"
                />
              </div>
            </div>

            {/* Accordions Container */}
            <div className="flex-1 p-8 bg-slate-50/50 dark:bg-slate-950/50">
              {groupedPermissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                  <Search size={32} className="mb-3 opacity-50" />
                  <p className="font-medium">No permissions found matching "{searchQuery}"</p>
                </div>
              ) : (
                <div className="max-w-6xl mx-auto space-y-4">
                  {groupedPermissions.map(([module, perms]) => (
                    <ModuleAccordion
                      key={module}
                      module={module}
                      perms={perms}
                      selectedPermissions={selectedPermissions}
                      handleTogglePermission={handleTogglePermission}
                      handleToggleModule={handleToggleModule}
                      isReadOnly={isReadOnly}
                      searchQuery={searchQuery}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3 rounded-b-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              {isReadOnly ? 'Close View' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={isSaving || !name.trim()}
                className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:bg-blue-800 transition-all disabled:opacity-50 disabled:hover:bg-blue-600 shadow-md shadow-blue-500/20"
              >
                {isSaving ? 'Saving...' : role ? 'Save Changes' : 'Create Role'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
