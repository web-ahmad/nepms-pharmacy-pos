'use client';
// app/(dashboard)/roles/page.tsx
// Enterprise Role & Permission Management — clean, modern, module-scoped.

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldAlert, Crown, Building2, Calculator, Pill, CreditCard,
  UserRound, Users, Plus, Copy, Trash2, Loader2, RefreshCw, Search, Check,
  ChevronDown, Lock, X, Save, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { RouteGuard } from '@/components/auth/RouteGuard';
import {
  useEnterpriseRoles, useEnterpriseRole, usePermissionsCatalogue,
  useCreateRole, useDeleteRole, useCloneRole, useSetRolePermissions,
} from '@/features/users/services/role.api';
import type { RoleListItem, Permission, PermissionGrouped } from '@/features/users/types/user';
import { MODULE_ORDER } from '@/features/roles/utils/permission-categories';

// ── Icon + hierarchy config ───────────────────────────────────────────────────
const ROLE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  ShieldAlert, Crown, Building2, Calculator, Pill, CreditCard, UserRound, Users, Shield,
};
function RoleIcon({ name, size = 20, className }: { name?: string; size?: number; className?: string }) {
  const Cmp = (name && ROLE_ICONS[name]) || Shield;
  return <Cmp size={size} className={className} />;
}

const HIERARCHY: Record<number, { label: string; cls: string }> = {
  1: { label: 'System', cls: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20' },
  2: { label: 'Owner', cls: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20' },
  3: { label: 'Branch Head', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20' },
  4: { label: 'Staff', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20' },
};

// ── prettify helpers ──────────────────────────────────────────────────────────
const SPECIAL: Record<string, string> = { pos: 'POS', hr: 'HR', crm: 'CRM' };
const prettyModule = (m: string) =>
  SPECIAL[m] || m.split('_').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');
const prettyAction = (a: string) =>
  a.replace(/[:_]/g, ' ').split(' ').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');

// ── Checkbox ──────────────────────────────────────────────────────────────────
function Checkbox({ checked, indeterminate = false, disabled = false, onChange }: {
  checked: boolean; indeterminate?: boolean; disabled?: boolean; onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      disabled={disabled}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) onChange(); }}
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${
        checked || indeterminate
          ? 'border-indigo-500 bg-indigo-500 text-white'
          : 'border-zinc-300 bg-white hover:border-indigo-400 dark:border-zinc-600 dark:bg-zinc-800'
      }`}
    >
      {checked && <Check size={13} strokeWidth={3} />}
      {indeterminate && !checked && <span className="h-0.5 w-2.5 rounded-full bg-white" />}
    </button>
  );
}

export default function RolesPage() {
  return (
    <RouteGuard requiredPermission="roles:view">
      <RolesInner />
    </RouteGuard>
  );
}

function RolesInner() {
  const { data: rolesResp, isLoading, refetch, isRefetching } = useEnterpriseRoles();
  const roles = rolesResp?.items ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // auto-select the first role
  useEffect(() => {
    if (!selectedId && roles.length) setSelectedId(roles[0].id);
  }, [roles, selectedId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
            <Shield size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Roles &amp; Permissions</h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {roles.length} roles · module-scoped access control
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw size={16} className={isRefetching ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:brightness-105 active:scale-[0.98]"
          >
            <Plus size={16} /> New Role
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          {/* Role list */}
          <div className="space-y-3">
            {roles.map((r, i) => (
              <RoleCard
                key={r.id}
                role={r}
                index={i}
                active={selectedId === r.id}
                onClick={() => setSelectedId(r.id)}
              />
            ))}
          </div>

          {/* Detail */}
          <div className="min-w-0">
            {selectedId ? (
              <RoleDetail key={selectedId} roleId={selectedId} onDeleted={() => setSelectedId(null)} />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-zinc-300 text-sm text-zinc-400 dark:border-zinc-700">
                Select a role to view its permissions
              </div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {createOpen && (
          <CreateRoleModal
            onClose={() => setCreateOpen(false)}
            onCreated={(id) => { setCreateOpen(false); setSelectedId(id); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Role card ─────────────────────────────────────────────────────────────────
function RoleCard({ role, index, active, onClick }: {
  role: RoleListItem; index: number; active: boolean; onClick: () => void;
}) {
  const color = role.color || '#6366f1';
  const hb = HIERARCHY[role.hierarchy_level ?? 4] ?? HIERARCHY[4];
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all ${
        active
          ? 'border-transparent bg-white shadow-lg ring-2 ring-indigo-500 dark:bg-zinc-900'
          : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
        >
          <RoleIcon name={role.icon} size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{role.name}</span>
            {role.is_system_default && <Lock size={12} className="shrink-0 text-zinc-400" />}
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
            {role.description || 'No description'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${hb.cls}`}>
              L{role.hierarchy_level ?? 4} · {hb.label}
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {role.permission_count} perms
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {role.user_count} users
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ── Role detail + permission matrix ───────────────────────────────────────────
function RoleDetail({ roleId, onDeleted }: { roleId: string; onDeleted: () => void }) {
  const { data: role, isLoading } = useEnterpriseRole(roleId);
  const { data: catalogue } = usePermissionsCatalogue();
  const setPerms = useSetRolePermissions(roleId);
  const cloneRole = useCloneRole();
  const deleteRole = useDeleteRole();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (role) {
      const ids = new Set(role.permissions.map((p) => p.id));
      setSelected(new Set(ids));
      setInitial(new Set(ids));
    }
  }, [role]);

  // A full-access role (Owner / Manager / Super Admin) is managed by wildcard —
  // editing individual toggles would break that, so present it read-only.
  const readOnly = (role?.hierarchy_level ?? 4) <= 3;

  const dirty = useMemo(() => {
    if (selected.size !== initial.size) return true;
    for (const id of selected) if (!initial.has(id)) return true;
    return false;
  }, [selected, initial]);

  // Two-level: Category (e.g. "HR & Payroll") → sub-modules → permissions.
  // The backend already returns modules ordered by category, so we preserve it.
  const categories = useMemo(() => {
    const groups: PermissionGrouped[] = catalogue ?? [];
    const q = search.trim().toLowerCase();
    const filtered = groups
      .map((g) => ({
        module: g.module,
        group: g.group || 'Other',
        module_label: g.module_label || prettyModule(g.module),
        permissions: q
          ? g.permissions.filter((p) => p.code.toLowerCase().includes(q)
              || (g.module_label || g.module).toLowerCase().includes(q)
              || (g.group || '').toLowerCase().includes(q))
          : g.permissions,
      }))
      .filter((g) => g.permissions.length > 0);
    const byCat = new Map<string, typeof filtered>();
    for (const g of filtered) {
      if (!byCat.has(g.group)) byCat.set(g.group, []);
      byCat.get(g.group)!.push(g);
    }
    return Array.from(byCat.entries()).map(([category, mods]) => ({ category, modules: mods }));
  }, [catalogue, search]);

  const toggle = (id: string) => {
    if (readOnly) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleModule = (perms: Permission[]) => {
    if (readOnly) return;
    const allOn = perms.every((p) => selected.has(p.id));
    setSelected((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => (allOn ? next.delete(p.id) : next.add(p.id)));
      return next;
    });
  };

  const save = () => {
    setPerms.mutate([...selected], {
      onSuccess: () => { setInitial(new Set(selected)); toast.success('Permissions updated'); },
      onError: () => toast.error('Failed to update permissions'),
    });
  };

  const doClone = () => {
    const name = window.prompt('New role name', `${role?.name} Copy`);
    if (!name) return;
    cloneRole.mutate({ id: roleId, newName: name }, {
      onSuccess: () => toast.success('Role cloned'),
      onError: () => toast.error('Failed to clone role'),
    });
  };
  const doDelete = () => {
    if (!window.confirm(`Delete role "${role?.name}"? This cannot be undone.`)) return;
    deleteRole.mutate(roleId, {
      onSuccess: () => { toast.success('Role deleted'); onDeleted(); },
      onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to delete role'),
    });
  };

  if (isLoading || !role) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  const color = role.color || '#6366f1';
  const hb = HIERARCHY[role.hierarchy_level ?? 4] ?? HIERARCHY[4];

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      {/* header */}
      <div className="border-b border-zinc-200 p-5 dark:border-zinc-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
            >
              <RoleIcon name={role.icon} size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{role.name}</h2>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset ${hb.cls}`}>
                  L{role.hierarchy_level ?? 4} · {hb.label}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{role.description || 'No description'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={doClone}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Copy size={13} /> Clone
            </button>
            {!role.is_system_default && (
              <button
                onClick={doDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
        </div>

        {readOnly && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
            <AlertTriangle size={14} />
            Full-access role — permissions are granted automatically and can’t be edited here.
          </div>
        )}
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50/60 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="relative w-full sm:w-56">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search permissions…"
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <button onClick={() => setExpanded(new Set(categories.flatMap((c) => c.modules.map((m) => m.module))))} className="hover:text-indigo-600">Expand all</button>
          <span className="h-3 w-px bg-zinc-300 dark:bg-zinc-700" />
          <button onClick={() => setExpanded(new Set())} className="hover:text-indigo-600">Collapse all</button>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            {selected.size} selected
          </span>
        </div>
      </div>

      {/* matrix — Category → sub-module → permission checkboxes */}
      <div className="max-h-[calc(100vh-340px)] space-y-5 overflow-y-auto p-3 sm:p-4">
        {categories.length === 0 && (
          <div className="py-12 text-center text-sm text-zinc-400">No permissions match “{search}”.</div>
        )}
        {categories.map(({ category, modules }) => {
          const catPerms = modules.flatMap((m) => m.permissions);
          const catOn = catPerms.filter((p) => selected.has(p.id)).length;
          return (
            <div key={category} className="space-y-2">
              {/* Category header */}
              <div className="flex items-center gap-2 px-1">
                <span className="h-4 w-1.5 rounded-full bg-gradient-to-b from-indigo-500 to-violet-600" />
                <h4 className="text-sm font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">{category}</h4>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{catOn}/{catPerms.length}</span>
                <div className="ml-2 h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
              </div>

              {/* Sub-modules */}
              {modules.map(({ module, module_label, permissions }) => {
                const isOpen = expanded.has(module) || !!search.trim();
                const onCount = permissions.filter((p) => selected.has(p.id)).length;
                const allOn = onCount === permissions.length;
                const someOn = onCount > 0 && !allOn;
                return (
                  <div key={module} className="ml-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3 bg-zinc-50/80 px-3 py-2.5 sm:px-4 dark:bg-zinc-900/50">
                      <Checkbox checked={allOn} indeterminate={someOn} disabled={readOnly} onChange={() => toggleModule(permissions)} />
                      <button
                        onClick={() => setExpanded((prev) => { const n = new Set(prev); n.has(module) ? n.delete(module) : n.add(module); return n; })}
                        className="flex flex-1 items-center justify-between gap-2 text-left"
                      >
                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{module_label}</span>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700">{onCount}/{permissions.length}</span>
                          <ChevronDown size={16} className={`shrink-0 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                          <div className="grid grid-cols-1 gap-x-4 gap-y-0.5 p-2 sm:grid-cols-2 xl:grid-cols-3">
                            {permissions.map((p) => {
                              const on = selected.has(p.id);
                              return (
                                <label key={p.id} title={p.code}
                                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${readOnly ? 'cursor-default' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'}`}>
                                  <Checkbox checked={on} disabled={readOnly} onChange={() => toggle(p.id)} />
                                  <span className={`flex-1 ${on ? 'font-medium text-zinc-800 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>{prettyAction(p.action)}</span>
                                  {p.is_sensitive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" title="Sensitive permission" />}
                                </label>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* save bar */}
      <AnimatePresence>
        {dirty && !readOnly && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="flex items-center justify-between border-t border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <span className="text-sm text-zinc-500 dark:text-zinc-400">You have unsaved changes</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelected(new Set(initial))}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Reset
              </button>
              <button
                onClick={save}
                disabled={setPerms.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-60"
              >
                {setPerms.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Save Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Create role modal ─────────────────────────────────────────────────────────
const COLORS = ['#6366f1', '#22c55e', '#f97316', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#f59e0b'];
function CreateRoleModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const create = useCreateRole();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const submit = () => {
    if (!name.trim()) { toast.error('Role name is required'); return; }
    create.mutate(
      { name: name.trim(), description: description.trim() || undefined, color, hierarchy_level: 4, permission_ids: [] },
      {
        onSuccess: (r: any) => { toast.success('Role created'); onCreated(r.id); },
        onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to create role'),
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">New Role</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X size={18} /></button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Role name</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)} autoFocus
              placeholder="e.g. Store Supervisor"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
            <input
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What can this role do?"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Colour</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c} onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-lg transition-transform ${color === c ? 'scale-110 ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-zinc-900' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
            New roles start as branch staff (L4) with no permissions. Add permissions after creating.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-200 p-5 dark:border-zinc-800">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">Cancel</button>
          <button
            onClick={submit} disabled={create.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-60"
          >
            {create.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Create Role
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
