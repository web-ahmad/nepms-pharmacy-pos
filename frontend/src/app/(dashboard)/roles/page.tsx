'use client';
// app/(dashboard)/roles/page.tsx
// Enterprise Role & Permission Management — accordion of roles; expanding a
// role reveals a dense tree-table of Category → Module → permission checkboxes
// (spreadsheet-style, module-wise, every real module + sub-module).

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  useCreateRole, useDeleteRole, useCloneRole, useSetRolePermissions, useUpdateRole,
} from '@/features/users/services/role.api';
import type { RoleListItem, Permission, PermissionGrouped } from '@/features/users/types/user';

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
function Checkbox({ checked, indeterminate = false, disabled = false, small = false, onChange }: {
  checked: boolean; indeterminate?: boolean; disabled?: boolean; small?: boolean; onChange: () => void;
}) {
  const dim = small ? 'h-[15px] w-[15px]' : 'h-[18px] w-[18px]';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      disabled={disabled}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) onChange(); }}
      className={`flex ${dim} shrink-0 items-center justify-center rounded-[5px] border transition-all ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${
        checked || indeterminate
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-zinc-300 bg-white hover:border-emerald-400 dark:border-zinc-600 dark:bg-zinc-800'
      }`}
    >
      {checked && <Check size={small ? 11 : 13} strokeWidth={3} />}
      {indeterminate && !checked && <span className="h-0.5 w-2 rounded-full bg-white" />}
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

  // Accordion: only one role's editor open at a time.
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Auto-open the first role ONCE on initial load only — must not re-fire every
  // time the user collapses a row (openId → null), or closing would instantly
  // reopen roles[0] and the accordion would feel "stuck open".
  const didAutoOpen = useRef(false);
  useEffect(() => {
    if (!didAutoOpen.current && roles.length) {
      setOpenId(roles[0].id);
      didAutoOpen.current = true;
    }
  }, [roles]);

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
          <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {roles.map((r, i) => (
            <RoleAccordionRow
              key={r.id}
              role={r}
              isOpen={openId === r.id}
              isLast={i === roles.length - 1}
              onToggle={() => setOpenId((cur) => (cur === r.id ? null : r.id))}
              onDeleted={() => setOpenId(null)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {createOpen && (
          <CreateRoleModal
            onClose={() => setCreateOpen(false)}
            onCreated={(id) => { setCreateOpen(false); setOpenId(id); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Accordion row: collapsed header + expandable tree-table body ───────────────
function RoleAccordionRow({ role, isOpen, isLast, onToggle, onDeleted }: {
  role: RoleListItem; isOpen: boolean; isLast: boolean; onToggle: () => void; onDeleted: () => void;
}) {
  const color = role.color || '#10b981';
  const hb = HIERARCHY[role.hierarchy_level ?? 4] ?? HIERARCHY[4];
  const cloneRole = useCloneRole();
  const deleteRole = useDeleteRole();

  const doClone = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nm = window.prompt('New role name', `${role.name} Copy`);
    if (!nm) return;
    cloneRole.mutate({ id: role.id, newName: nm }, {
      onSuccess: () => toast.success('Role cloned'),
      onError: () => toast.error('Failed to clone role'),
    });
  };
  const doDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    deleteRole.mutate(role.id, {
      onSuccess: () => { toast.success('Role deleted'); onDeleted(); },
      onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to delete role'),
    });
  };

  return (
    <div className={!isLast ? 'border-b border-zinc-200 dark:border-zinc-800' : ''}>
      {/* Collapsed header row — a div (not <button>) since it contains the
          Clone/Delete buttons; nesting <button> inside <button> is invalid HTML. */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors ${
          isOpen ? 'bg-zinc-50 dark:bg-zinc-900/60' : 'hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40'
        }`}
      >
        <ChevronDown size={16} className={`shrink-0 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
          <RoleIcon name={role.icon} size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{role.name}</span>
            {role.is_system_default && <Lock size={11} className="shrink-0 text-zinc-400" />}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset ${hb.cls}`}>
              L{role.hierarchy_level ?? 4} · {hb.label}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">{role.description || 'No description'}</p>
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 sm:flex">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium dark:bg-zinc-800">{role.permission_count} perms</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium dark:bg-zinc-800">{role.user_count} users</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button onClick={doClone} title="Clone role"
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-200/70 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200">
            <Copy size={14} />
          </button>
          {!role.is_system_default && (
            <button onClick={doDelete} title="Delete role"
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <RoleEditorBody roleId={role.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Editor body: Name/Label + search + dense Category → Module tree table ──────
function RoleEditorBody({ roleId }: { roleId: string }) {
  const { data: role, isLoading } = useEnterpriseRole(roleId);
  const { data: catalogue } = usePermissionsCatalogue();
  const setPerms = useSetRolePermissions(roleId);
  const updateRole = useUpdateRole(roleId);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (role) {
      const ids = new Set(role.permissions.map((p) => p.id));
      setSelected(new Set(ids));
      setInitial(new Set(ids));
      setName(role.name ?? '');
      setLabel(role.description ?? '');
    }
  }, [role]);

  // Both Pharmacy Owner (L2) and Franchise Owner (L3) are DB-driven at login
  // time (see auth_service.py compute_effective_permissions) — genuinely and
  // safely editable. Only Super Admin (L1, never listed here — system role)
  // would be a hardcoded exception.
  const readOnly = (role?.hierarchy_level ?? 4) <= 1;

  const permsDirty = useMemo(() => {
    if (selected.size !== initial.size) return true;
    for (const id of selected) if (!initial.has(id)) return true;
    return false;
  }, [selected, initial]);
  const metaDirty = !!role && (name !== (role.name ?? '') || label !== (role.description ?? ''));
  const dirty = permsDirty || metaDirty;

  // Category → modules → permissions, in the exact order the backend groups
  // every real module + sub-module in the software.
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
              || prettyAction(p.action).toLowerCase().includes(q)
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

  const reset = () => {
    setSelected(new Set(initial));
    if (role) { setName(role.name ?? ''); setLabel(role.description ?? ''); }
  };

  const save = async () => {
    try {
      if (metaDirty && !readOnly) {
        if (!name.trim()) { toast.error('Name is required'); return; }
        await updateRole.mutateAsync({ name: name.trim(), description: label.trim() });
      }
      if (permsDirty && !readOnly) {
        await setPerms.mutateAsync([...selected]);
      }
      setInitial(new Set(selected));
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    }
  };

  if (isLoading || !role) {
    return (
      <div className="flex h-32 items-center justify-center border-t border-zinc-200 dark:border-zinc-800">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
      </div>
    );
  }

  const saving = setPerms.isPending || updateRole.isPending;

  return (
    <div className="border-t border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/20">
      {/* Name / Label + search */}
      <div className="space-y-3 border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">Name <span className="text-red-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:disabled:bg-zinc-900/60" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">Label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} disabled={readOnly} placeholder="Display label / description"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:disabled:bg-zinc-900/60" />
          </div>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search features…"
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900" />
        </div>
        {readOnly && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
            <AlertTriangle size={13} />
            Pharmacy Owner always has full tenant-wide access at login (a backend rule, not these checkboxes) — editing here wouldn’t take effect, so it’s locked.
          </div>
        )}
      </div>

      {/* Dense tree table: Category → Module rows with inline permission checkboxes */}
      <div className="max-h-[60vh] overflow-y-auto">
        {categories.length === 0 && (
          <div className="py-10 text-center text-sm text-zinc-400">No features match “{search}”.</div>
        )}
        {categories.map(({ category, modules }) => {
          const catPerms = modules.flatMap((m) => m.permissions);
          const catOn = catPerms.filter((p) => selected.has(p.id)).length;
          return (
            <div key={category}>
              {/* Category header */}
              <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-200 bg-zinc-100/90 px-4 py-1.5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-800/80">
                <span className="h-3 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                <h4 className="text-[11px] font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{category}</h4>
                <span className="text-[10px] font-semibold text-zinc-400">{catOn}/{catPerms.length}</span>
              </div>
              {/* Module rows */}
              {modules.map(({ module, module_label, permissions }) => {
                const onCount = permissions.filter((p) => selected.has(p.id)).length;
                const allOn = onCount === permissions.length;
                const someOn = onCount > 0 && !allOn;
                return (
                  <div key={module}
                    className="flex flex-col gap-2 border-b border-zinc-100 px-4 py-2.5 even:bg-white odd:bg-zinc-50/60 dark:border-zinc-800/70 dark:even:bg-zinc-950 dark:odd:bg-zinc-900/30 sm:flex-row sm:items-start">
                    <label className={`flex w-full shrink-0 items-center gap-2 sm:w-52 ${readOnly ? '' : 'cursor-pointer'}`}>
                      <Checkbox checked={allOn} indeterminate={someOn} disabled={readOnly} onChange={() => toggleModule(permissions)} />
                      <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{module_label}</span>
                    </label>
                    <div className="flex flex-1 flex-wrap gap-x-4 gap-y-1.5">
                      {permissions.map((p) => {
                        const on = selected.has(p.id);
                        return (
                          <label key={p.id} title={p.code}
                            className={`flex items-center gap-1.5 text-xs ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                            <Checkbox checked={on} disabled={readOnly} small onChange={() => toggle(p.id)} />
                            <span className={on ? 'font-medium text-zinc-800 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'}>{prettyAction(p.action)}</span>
                            {p.is_sensitive && <span className="h-1 w-1 shrink-0 rounded-full bg-amber-400" title="Sensitive permission" />}
                          </label>
                        );
                      })}
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-zinc-400">{onCount}/{permissions.length}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer: Cancel / Update */}
      {!readOnly && (
        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {dirty ? 'You have unsaved changes' : `${selected.size} permissions selected`}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={reset} disabled={!dirty || saving}
              className="rounded-lg border border-zinc-200 px-3.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              Cancel
            </button>
            <button onClick={save} disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:brightness-105 disabled:opacity-60">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Update
            </button>
          </div>
        </div>
      )}
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
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
            <input
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What can this role do?"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
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
