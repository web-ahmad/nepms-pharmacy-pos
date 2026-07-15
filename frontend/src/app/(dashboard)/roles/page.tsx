'use client';
// app/(dashboard)/roles/page.tsx
// Enterprise Role & Permission Management page.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Plus, Copy, Trash2, ChevronDown, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

import {
  useEnterpriseRoles, usePermissionsCatalogue,
  useCreateRole, useUpdateRole, useDeleteRole,
  useCloneRole, useSetRolePermissions, useSeedDefaults,
  roleKeys,
} from '@/features/users/services/role.api';
import type { Role, RoleListItem, PermissionGrouped, Permission } from '@/features/users/types/user';

// ── Permission matrix ─────────────────────────────────────────────────────────

function PermissionMatrix({
  groups,
  selectedIds,
  onToggle,
}: {
  groups: PermissionGrouped[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(groups.map((g) => g.module)));

  const toggle = (module: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(module) ? next.delete(module) : next.add(module);
      return next;
    });

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const isOpen = expanded.has(group.module);
        const selectedInGroup = group.permissions.filter((p) => selectedIds.has(p.id)).length;
        const totalInGroup = group.permissions.length;
        const allSelected = selectedInGroup === totalInGroup;

        return (
          <div key={group.module} className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <button
              onClick={() => toggle(group.module)}
              className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Select-all for group */}
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    group.permissions.forEach((p) => {
                      if (allSelected ? selectedIds.has(p.id) : !selectedIds.has(p.id)) onToggle(p.id);
                    });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 capitalize">
                  {group.module.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-zinc-400">{selectedInGroup}/{totalInGroup}</span>
              </div>
              {isOpen ? <ChevronDown size={15} className="text-zinc-400" /> : <ChevronRight size={15} className="text-zinc-400" />}
            </button>

            {isOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y divide-zinc-100 dark:divide-zinc-800">
                {group.permissions.map((perm) => (
                  <label
                    key={perm.id}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${
                      perm.is_sensitive ? 'border-l-2 border-amber-400' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(perm.id)}
                      onChange={() => onToggle(perm.id)}
                      className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 capitalize">
                        {perm.action.replace(/_/g, ' ')}
                        {perm.is_sensitive && (
                          <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">sensitive</span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-400 font-mono">{perm.code}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Role card ─────────────────────────────────────────────────────────────────

function RoleCard({
  role,
  selected,
  onClick,
}: {
  role: RoleListItem;
  selected: boolean;
  onClick: () => void;
}) {
  const cloneMut  = useCloneRole();
  const deleteMut = useDeleteRole();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`relative flex flex-col rounded-2xl border cursor-pointer transition-all duration-200 p-4 shadow-sm hover:shadow-md ${
        selected
          ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/60 dark:bg-indigo-900/20 ring-2 ring-indigo-400/30'
          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-indigo-300 dark:hover:border-indigo-700'
      }`}
    >
      {/* Color dot + name */}
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

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
        <span>{role.permission_count} permissions</span>
        <span>•</span>
        <span>{role.user_count} users</span>
      </div>

      {/* Actions (hover) */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const qc = useQueryClient();
  const { data: rolesData, isLoading: rolesLoading } = useEnterpriseRoles();
  const { data: permsData, isLoading: permsLoading } = usePermissionsCatalogue();
  const seedMut = useSeedDefaults();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [showNewForm, setShowNewForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#6366f1');

  const createRole = useCreateRole();
  const setPerms   = useSetRolePermissions(selectedRoleId ?? '');

  // Load selected role's permissions into set
  const selectedRole = rolesData?.items.find((r) => r.id === selectedRoleId);

  const handleSelectRole = async (role: RoleListItem) => {
    setSelectedRoleId(role.id);
    // Fetch full role detail to get permission IDs (from full detail endpoint)
    try {
      const res = await fetch(`/api/v1/enterprise/roles/${role.id}`);
      const data = await res.json();
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

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    await setPerms.mutateAsync([...selectedPerms]);
    toast.success('Permissions saved');
    qc.invalidateQueries({ queryKey: roleKeys.lists() });
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    await createRole.mutateAsync({
      name: newRoleName.trim(),
      color: newRoleColor,
      permission_ids: [...selectedPerms],
    });
    toast.success('Role created');
    setNewRoleName('');
    setShowNewForm(false);
  };

  const handleSeedDefaults = async () => {
    const res = await seedMut.mutateAsync();
    toast.success(`Seeded: ${res.permissions_created} permissions, ${res.roles_created} roles`);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedDefaults}
            disabled={seedMut.isPending}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {seedMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Seed Defaults
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
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10 p-5 flex flex-wrap items-center gap-4">
              <input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Role name…"
                className="flex-1 min-w-[180px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
              />
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Role list */}
        <div className="lg:col-span-4 space-y-3">
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
                  />
                </div>
              ))
          }
        </div>

        {/* Right: Permission matrix */}
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedRole ? `Permissions — ${selectedRole.name}` : 'Select a role to configure permissions'}
                </h2>
                {selectedRole && (
                  <p className="text-sm text-zinc-500 mt-0.5">
                    {selectedPerms.size} permissions selected
                    {selectedRole.is_system_default && ' · System default role'}
                  </p>
                )}
              </div>
              {selectedRoleId && (
                <button
                  onClick={handleSavePermissions}
                  disabled={setPerms.isPending}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {setPerms.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  Save
                </button>
              )}
            </div>

            <div className="p-5">
              {!selectedRoleId ? (
                <div className="py-20 flex flex-col items-center gap-3 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Shield size={28} className="text-zinc-400" />
                  </div>
                  <p className="font-medium text-zinc-500">No role selected</p>
                  <p className="text-sm text-zinc-400">Click a role on the left to configure its permissions</p>
                </div>
              ) : permsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  ))}
                </div>
              ) : (
                <PermissionMatrix
                  groups={permsData ?? []}
                  selectedIds={selectedPerms}
                  onToggle={handleTogglePermission}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
