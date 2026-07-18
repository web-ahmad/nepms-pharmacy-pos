'use client';
// app/(dashboard)/roles/page.tsx
// Enterprise Role & Permission Management page.

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Plus, Copy, Trash2, ChevronDown, ChevronRight, Loader2, RefreshCw, Download, Upload, Scale, Search, CheckSquare, Square, Check, X, Users, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { RouteGuard } from '@/components/auth/RouteGuard';

import {
  useEnterpriseRoles, usePermissionsCatalogue,
  useCreateRole, useUpdateRole, useDeleteRole,
  useCloneRole, useSetRolePermissions, useSeedEnterprise,
  roleKeys,
} from '@/features/users/services/role.api';
import type { Role, RoleListItem, PermissionGrouped, Permission } from '@/features/users/types/user';
import { api } from '@/services/api';

// ── Hierarchy level label + color map ────────────────────────────────────────
const HIERARCHY_CONFIG: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: 'L1 · SaaS Admin',    color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-500/10',    border: 'border-red-200 dark:border-red-500/20' },
  2: { label: 'L2 · Pharmacy Owner', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10', border: 'border-violet-200 dark:border-violet-500/20' },
  3: { label: 'L3 · Branch Owner',  color: 'text-sky-600 dark:text-sky-400',    bg: 'bg-sky-50 dark:bg-sky-500/10',    border: 'border-sky-200 dark:border-sky-500/20' },
  4: { label: 'L4 · Branch Staff',  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20' },
};


// ── Accordion Permission matrix (Glassmorphism) ───────────────────────────────────

function AccordionPermissionMatrix({
  groups,
  selectedIds,
  onToggle,
  onToggleModule,
  onSelectAll,
  readOnly = false,
}: {
  groups: PermissionGrouped[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleModule: (module: string, perms: Permission[]) => void;
  onSelectAll: (all: boolean, perms: Permission[]) => void;
  readOnly?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const dedupedGroups = useMemo(() => {
    return groups.map(g => {
      const uniquePerms = Array.from(
        new Map(g.permissions.map(p => [p.code, p])).values()
      );
      return { ...g, permissions: uniquePerms };
    });
  }, [groups]);

  const flatPermissions = useMemo(() => dedupedGroups.flatMap(g => g.permissions), [dedupedGroups]);

  const filteredGroups = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    if (!lowerQuery) return dedupedGroups;
    return dedupedGroups.map(g => ({
      ...g,
      permissions: g.permissions.filter(p => p.action.toLowerCase().includes(lowerQuery) || p.module.toLowerCase().includes(lowerQuery))
    })).filter(g => g.permissions.length > 0);
  }, [dedupedGroups, searchQuery]);

  const toggleAccordion = (module: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  const expandAll = () => setExpandedModules(new Set(filteredGroups.map(g => g.module)));
  const collapseAll = () => setExpandedModules(new Set());

  return (
    <div className="flex flex-col h-full bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md rounded-b-2xl">
      {/* Sticky Toolbar */}
      <div className="px-5 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => !readOnly && onSelectAll(selectedIds.size !== flatPermissions.length, flatPermissions)}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${readOnly ? 'text-zinc-400 cursor-default' : 'text-zinc-700 dark:text-zinc-300 hover:text-indigo-600'}`}
          >
            {selectedIds.size === flatPermissions.length && flatPermissions.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
            {selectedIds.size === flatPermissions.length && flatPermissions.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700"></div>
          <button type="button" onClick={expandAll} className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-indigo-600">Expand All</button>
          <button type="button" onClick={collapseAll} className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-indigo-600">Collapse All</button>
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-500 ml-2">
            {selectedIds.size} / {flatPermissions.length} selected
            {readOnly && <span className="ml-2 text-indigo-600 dark:text-indigo-400 font-semibold">• System Locked</span>}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none backdrop-blur-sm transition-all"
            />
          </div>
        </div>
      </div>

      {/* Accordion List */}
      <div className="flex-1 overflow-auto custom-scrollbar p-5 space-y-4" style={{ maxHeight: '650px' }}>
        <AnimatePresence>
          {filteredGroups.map((group) => {
            const isAllSelected = group.permissions.every(p => selectedIds.has(p.id));
            const isSomeSelected = group.permissions.some(p => selectedIds.has(p.id)) && !isAllSelected;
            const isExpanded = expandedModules.has(group.module) || searchQuery.length > 0;

            // CRUD shortcuts logic
            const getActionPerms = (actionKw: string) => group.permissions.filter(p => p.action.toLowerCase().includes(actionKw));
            const createPerms = getActionPerms('create');
            const readPerms = getActionPerms('view').concat(getActionPerms('read'), getActionPerms('list'));
            const updatePerms = getActionPerms('update').concat(getActionPerms('edit'), getActionPerms('manage'));
            const deletePerms = getActionPerms('delete').concat(getActionPerms('remove'));

            return (
              <motion.div
                key={group.module}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md ${isExpanded ? 'border-indigo-200 dark:border-indigo-800 bg-white/80 dark:bg-zinc-800/80 ring-1 ring-indigo-500/10' : 'border-zinc-200 dark:border-zinc-700/50 bg-white/50 dark:bg-zinc-900/50'}`}
              >
                {/* Header */}
                <div 
                  className="px-5 py-4 flex items-center justify-between cursor-pointer select-none group"
                  onClick={() => toggleAccordion(group.module)}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="relative flex items-center justify-center w-5 h-5 flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); !readOnly && onToggleModule(group.module, group.permissions); }}
                    >
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={input => { if (input) input.indeterminate = isSomeSelected; }}
                        readOnly
                        className={`peer w-5 h-5 appearance-none rounded border ${readOnly ? 'cursor-default border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/30' : 'cursor-pointer border-zinc-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 indeterminate:bg-indigo-600 indeterminate:border-indigo-600 dark:border-zinc-600 dark:bg-zinc-800'}`}
                      />
                      {isAllSelected && (readOnly ? <Lock className="absolute text-indigo-400 w-3 h-3 pointer-events-none" /> : <Check className="absolute text-white w-3.5 h-3.5 pointer-events-none" />)}
                      {isSomeSelected && !readOnly && <div className="absolute bg-white w-2.5 h-0.5 rounded-full pointer-events-none" />}
                      {isSomeSelected && readOnly && <div className="absolute bg-indigo-400 w-2.5 h-0.5 rounded-full pointer-events-none" />}
                    </div>
                    <span className="font-semibold capitalize text-lg text-zinc-900 dark:text-zinc-100 tracking-tight group-hover:text-indigo-600 transition-colors">
                      {group.module.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                      {group.permissions.filter(p => selectedIds.has(p.id)).length} / {group.permissions.length}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Quick CRUD toggle shortcuts for the module header */}
                    {!readOnly && (
                      <div className="hidden md:flex items-center gap-3 mr-4" onClick={(e) => e.stopPropagation()}>
                        {[
                          { label: 'R', perms: readPerms, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400' },
                          { label: 'C', perms: createPerms, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400' },
                          { label: 'U', perms: updatePerms, color: 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400' },
                          { label: 'D', perms: deletePerms, color: 'text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400' }
                        ].map(shortcut => {
                          if (shortcut.perms.length === 0) return null;
                          const allHas = shortcut.perms.every(p => selectedIds.has(p.id));
                          return (
                            <button
                              key={shortcut.label}
                              onClick={() => {
                                if (allHas) shortcut.perms.forEach(p => onToggle(p.id)); // Actually we should toggle module, but we only have individual toggles here. So we iterate.
                                // Instead of mutating directly, we should call a specific function. We'll simulate it:
                                // To be safe, we just use onToggleModule with the subset!
                                onToggleModule(`subset_${group.module}_${shortcut.label}`, shortcut.perms);
                              }}
                              title={`Toggle ${shortcut.label} permissions`}
                              className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-colors ${allHas ? 'ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-zinc-900 ' + shortcut.color : 'text-zinc-400 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700'}`}
                            >
                              {shortcut.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} className="text-zinc-400">
                      <ChevronRight size={20} />
                    </motion.div>
                  </div>
                </div>

                {/* Body */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 bg-zinc-50/50 dark:bg-zinc-900/30">
                        {group.permissions.map(perm => (
                          <label key={perm.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${selectedIds.has(perm.id) ? 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-800/50 dark:bg-indigo-900/20 shadow-sm' : 'border-transparent hover:bg-white dark:hover:bg-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700'} ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                            <div className="relative flex items-center justify-center mt-0.5">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(perm.id)}
                                onChange={() => !readOnly && onToggle(perm.id)}
                                readOnly={readOnly}
                                className={`w-4 h-4 appearance-none rounded border transition-all ${readOnly ? 'cursor-default border-indigo-200 bg-indigo-50/50 checked:bg-indigo-100 checked:border-indigo-300 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:checked:bg-indigo-900/40 dark:checked:border-indigo-800' : 'cursor-pointer border-zinc-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 dark:border-zinc-600 dark:bg-zinc-800'}`}
                              />
                              {selectedIds.has(perm.id) && (readOnly ? <Lock className="absolute text-indigo-400 dark:text-indigo-500 w-2.5 h-2.5 pointer-events-none" /> : <Check className="absolute text-white w-3 h-3 pointer-events-none" />)}
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-sm leading-none font-medium ${perm.is_sensitive ? 'text-amber-600 dark:text-amber-500' : (selectedIds.has(perm.id) ? 'text-indigo-900 dark:text-indigo-100' : 'text-zinc-700 dark:text-zinc-300')} capitalize transition-colors`}>
                                {perm.action.replace(/_/g, ' ')}
                              </span>
                              {perm.is_sensitive && (
                                <span className="text-[10px] mt-1 text-amber-500 font-semibold uppercase tracking-wider">Sensitive</span>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}


// ── Role card ─────────────────────────────────────────────────────────────────

function RoleCard({
  role,
  selected,
  onClick,
  onCompare,
}: {
  role: RoleListItem;
  selected: boolean;
  onClick: () => void;
  onCompare: (role: RoleListItem) => void;
}) {
  const cloneMut  = useCloneRole();
  const deleteMut = useDeleteRole();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`relative flex flex-col rounded-2xl border cursor-pointer transition-all duration-200 p-4 shadow-sm hover:shadow-md group ${
        selected
          ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/60 dark:bg-indigo-900/20 ring-2 ring-indigo-400/30'
          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-indigo-300 dark:hover:border-indigo-700'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
          style={{ background: role.color ?? '#6366f1' }}
        >
          <Shield size={16} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{role.name}</p>
          {role.is_system_default && (
            <span className="text-xs text-indigo-500 dark:text-indigo-400">System default</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs mt-3">
        <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
          <Shield size={12} /> {role.permission_count} perms
        </span>
        <span className="text-zinc-300 dark:text-zinc-700">•</span>
        <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
          <Users size={12} /> {role.user_count} users
        </span>
      </div>

      {/* Hierarchy Level Badge */}
      {(role as any).hierarchy_level && (() => {
        const cfg = HIERARCHY_CONFIG[(role as any).hierarchy_level] ?? HIERARCHY_CONFIG[4];
        return (
          <div className="mt-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border} uppercase tracking-wider`}>
              {cfg.label}
            </span>
          </div>
        );
      })()}

      {(role.branch_scope || role.data_scope) && (
        <div className="flex flex-wrap gap-1 mt-2">
          {role.branch_scope && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 uppercase tracking-wider">
              {role.branch_scope.replace(/_/g, ' ')}
            </span>
          )}
          {role.data_scope && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 uppercase tracking-wider">
              {role.data_scope.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      )}

      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onCompare(role); }}
          className="rounded-lg p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          title="Compare"
        >
          <Scale size={13} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            cloneMut.mutateAsync({ id: role.id, newName: `${role.name} (Copy)` });
            toast.success('Role cloned');
          }}
          className="rounded-lg p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          title="Clone"
        >
          <Copy size={13} />
        </button>
        {!role.is_system_default && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (role.user_count > 0) { toast.error(`${role.user_count} users are assigned this role`); return; }
              if (!confirm('Delete this role?')) return;
              await deleteMut.mutateAsync(role.id);
              toast.success('Role deleted');
            }}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Compare Modal ──────────────────────────────────────────────────────────

function CompareModal({
  rolesData,
  permsData,
  onClose,
  initialRole1,
}: {
  rolesData: { items: RoleListItem[] };
  permsData: PermissionGrouped[];
  onClose: () => void;
  initialRole1: RoleListItem | null;
}) {
  const [role1, setRole1] = useState<string>(initialRole1?.id ?? '');
  const [role2, setRole2] = useState<string>('');
  
  const [perms1, setPerms1] = useState<Set<string>>(new Set());
  const [perms2, setPerms2] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPerms = async () => {
      setLoading(true);
      try {
        if (role1) {
          const r1 = await fetch(`/api/v1/enterprise/roles/${role1}`).then(r => r.json());
          setPerms1(new Set((r1.permissions ?? []).map((p: any) => p.id)));
        } else setPerms1(new Set());
        
        if (role2) {
          const r2 = await fetch(`/api/v1/enterprise/roles/${role2}`).then(r => r.json());
          setPerms2(new Set((r2.permissions ?? []).map((p: any) => p.id)));
        } else setPerms2(new Set());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPerms();
  }, [role1, role2]);

  const allPerms = permsData.flatMap(g => g.permissions);
  const diff = allPerms.filter(p => perms1.has(p.id) !== perms2.has(p.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col h-[85vh] border border-zinc-200 dark:border-zinc-800">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><Scale size={20}/> Compare Roles</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"><X size={20}/></button>
        </div>
        
        <div className="p-5 grid grid-cols-2 gap-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <label className="block text-sm font-medium mb-1">Role 1</label>
            <select value={role1} onChange={e => setRole1(e.target.value)} className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800">
              <option value="">Select Role...</option>
              {rolesData.items.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role 2</label>
            <select value={role2} onChange={e => setRole2(e.target.value)} className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800">
              <option value="">Select Role...</option>
              {rolesData.items.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>
          ) : (!role1 || !role2) ? (
            <div className="flex items-center justify-center h-full text-zinc-500">Select two roles to compare</div>
          ) : diff.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-500">Roles have identical permissions</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-800 text-sm border-b border-zinc-200 dark:border-zinc-800">
                  <th className="p-3">Permission</th>
                  <th className="p-3">{rolesData.items.find(r => r.id === role1)?.name}</th>
                  <th className="p-3">{rolesData.items.find(r => r.id === role2)?.name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {diff.map(p => (
                  <tr key={p.id}>
                    <td className="p-3">
                      <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{p.module.replace(/_/g, ' ')} : {p.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-zinc-500">{p.code}</p>
                    </td>
                    <td className="p-3">
                      {perms1.has(p.id) ? <Check className="text-emerald-500"/> : <X className="text-red-500"/>}
                    </td>
                    <td className="p-3">
                      {perms2.has(p.id) ? <Check className="text-emerald-500"/> : <X className="text-red-500"/>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProtectedRolesPage() {
  return (
    <RouteGuard requiredPermission="roles:manage">
      <RolesPage />
    </RouteGuard>
  );
}

function RolesPage() {
  const qc = useQueryClient();
  const { data: rolesData, isLoading: rolesLoading } = useEnterpriseRoles();
  const { data: permsData, isLoading: permsLoading } = usePermissionsCatalogue();
  const seedMut = useSeedEnterprise();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [showNewForm, setShowNewForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#6366f1');
  const [newBranchScope, setNewBranchScope] = useState('assigned_branch');
  const [newDataScope, setNewDataScope] = useState('branch');
  const [newHierarchyLevel, setNewHierarchyLevel] = useState(4); // default: Staff

  
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [compareRole, setCompareRole] = useState<RoleListItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const createRole = useCreateRole();
  const setPerms   = useSetRolePermissions(selectedRoleId ?? '');

  const selectedRole = rolesData?.items.find((r) => r.id === selectedRoleId);

  const handleSelectRole = async (role: RoleListItem) => {
    setSelectedRoleId(role.id);
    try {
      const { data } = await api.get(`/api/v1/enterprise/roles/${role.id}`);
      setSelectedPerms(new Set((data.permissions ?? []).map((p: Permission) => p.id)));
    } catch {
      setSelectedPerms(new Set());
    }
  };

  const handleTogglePermission = (permId: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      next.has(permId) ? next.delete(permId) : next.add(permId);
      return next;
    });
  };

  const handleToggleModule = (module: string, perms: Permission[]) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      const allSelected = perms.every(p => next.has(p.id));
      if (allSelected) {
        perms.forEach(p => next.delete(p.id));
      } else {
        perms.forEach(p => next.add(p.id));
      }
      return next;
    });
  };

  const handleSelectAll = (all: boolean, perms: Permission[]) => {
    if (all) {
      setSelectedPerms(new Set(perms.map(p => p.id)));
    } else {
      setSelectedPerms(new Set());
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    await setPerms.mutateAsync([...selectedPerms]);
    toast.success('Permissions saved');
    qc.invalidateQueries({ queryKey: roleKeys.lists() });
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    await createRole.mutateAsync({
      name:             newRoleName.trim(),
      color:            newRoleColor,
      branch_scope:     newBranchScope,
      data_scope:       newDataScope,
      hierarchy_level:  newHierarchyLevel,
      is_system_default: false,
      permission_ids:   [...selectedPerms],
    });
    toast.success('Role created');
    setNewRoleName('');
    setNewBranchScope('assigned_branch');
    setNewDataScope('branch');
    setNewHierarchyLevel(4);
    setShowNewForm(false);
  };


  const handleSeedDefaults = async () => {
    const res = await seedMut.mutateAsync();
    toast.success(`Seeded: ${res.permissions_created} permissions, ${res.roles_created} roles`);
  };

  const handleExportJSON = () => {
    if (!selectedRole || !permsData) return;
    const flatPerms = permsData.flatMap(g => g.permissions);
    const codes = flatPerms.filter(p => selectedPerms.has(p.id)).map(p => p.code);
    
    const exportData = {
      name: selectedRole.name,
      description: selectedRole.description,
      permissions: codes,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedRole.name.replace(/\s+/g, '_')}_Permissions.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Role configuration exported');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !permsData) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.permissions || !Array.isArray(json.permissions)) {
          throw new Error("Invalid format: 'permissions' array missing.");
        }
        
        const flatPerms = permsData.flatMap(g => g.permissions);
        const newSelectedIds = new Set<string>();
        
        json.permissions.forEach((code: string) => {
          const perm = flatPerms.find(p => p.code === code);
          if (perm) newSelectedIds.add(perm.id);
        });
        
        setSelectedPerms(newSelectedIds);
        toast.success(`Imported ${newSelectedIds.size} permissions. Click Save to apply.`);
      } catch (err: any) {
        toast.error(`Import failed: ${err.message}`);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 p-6 h-full flex flex-col">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Roles & Permissions</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Manage access roles and permission matrices
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />
          <button
            onClick={() => { setCompareRole(null); setCompareModalOpen(true); }}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Scale size={14} /> Compare
          </button>
          <button
            onClick={handleSeedDefaults}
            disabled={seedMut.isPending}
            className="flex items-center gap-2 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/50 px-3.5 py-2 text-sm font-medium hover:bg-violet-600 hover:text-white dark:hover:bg-violet-600 transition-colors disabled:opacity-50"
          >
            {seedMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Seed Enterprise RBAC 3.0
          </button>
          <button
            onClick={() => setShowNewForm((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <Plus size={16} /> New Role
          </button>
        </div>
      </motion.div>

      {/* New role quick form */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden shrink-0"
          >
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10 p-5 flex flex-wrap items-center gap-4 mb-6">
              <input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Role name…"
                className="flex-1 min-w-[180px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
              />
              <select
                value={newHierarchyLevel}
                onChange={(e) => setNewHierarchyLevel(Number(e.target.value))}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
              >
                <option value={3}>L3 · Branch Owner</option>
                <option value={4}>L4 · Branch Staff</option>
              </select>
              <select
                value={newBranchScope}
                onChange={(e) => setNewBranchScope(e.target.value)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
              >
                <option value="all_branches">All Branches</option>
                <option value="assigned_branch">Assigned Branch Only</option>
              </select>
              <select
                value={newDataScope}
                onChange={(e) => setNewDataScope(e.target.value)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
              >
                <option value="tenant">Tenant (All Branches)</option>
                <option value="branch">Branch Only</option>
                <option value="own_records">Own Records Only</option>
              </select>

              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-600 dark:text-zinc-400">Color:</label>
                <input type="color" value={newRoleColor} onChange={(e) => setNewRoleColor(e.target.value)}
                  className="h-9 w-14 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer" />
              </div>
              <button
                onClick={handleCreateRole}
                disabled={createRole.isPending || !newRoleName.trim()}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {createRole.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left: Role list */}
        <div className="lg:col-span-4 space-y-3 overflow-y-auto custom-scrollbar pr-2 h-[800px]">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
            {rolesData?.total ?? 0} Roles
          </p>
          {rolesLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              ))
            : rolesData?.items.map((role) => (
                <div key={role.id} className="group">
                  <RoleCard
                    role={role}
                    selected={selectedRoleId === role.id}
                    onClick={() => handleSelectRole(role)}
                    onCompare={(r) => { setCompareRole(r); setCompareModalOpen(true); }}
                  />
                </div>
              ))
          }
        </div>

        {/* Right: Permission matrix */}
        <div className="lg:col-span-8 flex flex-col h-[800px]">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="flex flex-wrap items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <div>
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
                  {selectedRole ? (
                    <>
                      <span>Permissions — {selectedRole.name}</span>
                      {(selectedRole as any).hierarchy_level && (() => {
                        const cfg = HIERARCHY_CONFIG[(selectedRole as any).hierarchy_level] ?? HIERARCHY_CONFIG[4];
                        return (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border} uppercase tracking-wider`}>
                            {cfg.label}
                          </span>
                        );
                      })()}
                    </>
                  ) : 'Select a role to configure permissions'}
                  {selectedRole?.is_system_default && <Lock size={16} className="text-indigo-500" />}
                </h2>

                {selectedRole && (
                  <p className="text-sm text-zinc-500 mt-0.5">
                    {selectedPerms.size} permissions selected
                    {selectedRole.is_system_default && ' · System default role'}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {selectedRoleId && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Import JSON"
                    >
                      <Upload size={14} /> Import
                    </button>
                    <button
                      onClick={handleExportJSON}
                      className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Export JSON"
                    >
                      <Download size={14} /> Export
                    </button>
                    <button
                      onClick={() => {
                        if (selectedRole?.is_system_default) {
                          setConfirmModalOpen(true);
                        } else {
                          handleSavePermissions();
                        }
                      }}
                      disabled={setPerms.isPending}
                      className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors ml-2"
                    >
                      {setPerms.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                      Save Changes
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
              {!selectedRoleId ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Shield size={28} className="text-zinc-400" />
                  </div>
                  <p className="font-medium text-zinc-500">No role selected</p>
                  <p className="text-sm text-zinc-400">Click a role on the left to configure its permissions</p>
                </div>
              ) : permsLoading ? (
                <div className="absolute inset-0 p-5 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  ))}
                </div>
              ) : (
                <AccordionPermissionMatrix
                  groups={permsData ?? []}
                  selectedIds={selectedPerms}
                  onToggle={handleTogglePermission}
                  onToggleModule={handleToggleModule}
                  onSelectAll={handleSelectAll}
                  readOnly={false} // Users can now edit system default roles
                />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {compareModalOpen && rolesData && permsData && (
        <CompareModal
          rolesData={rolesData}
          permsData={permsData}
          onClose={() => setCompareModalOpen(false)}
          initialRole1={compareRole}
        />
      )}

      <AnimatePresence>
        {confirmModalOpen && selectedRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
              onClick={() => setConfirmModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-200/50 dark:border-amber-700/50 bg-white/80 dark:bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500 mb-4">
                <Shield className="h-6 w-6" />
                <h3 className="text-lg font-bold">Modify System Default Role?</h3>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6 leading-relaxed">
                <strong>Warning:</strong> You are modifying a System Default Role. Removing core permissions could lock you out of your own system or disrupt standard workflows. Are you sure you want to proceed?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setConfirmModalOpen(false);
                    handleSavePermissions();
                  }}
                  disabled={setPerms.isPending}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-all"
                >
                  {setPerms.isPending ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                  Yes, Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
