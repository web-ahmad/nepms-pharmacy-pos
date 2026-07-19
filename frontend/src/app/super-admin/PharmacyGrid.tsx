'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import {
  Building2, Plus, RefreshCw, Search, LayoutGrid, List,
  CheckCircle2, XCircle, Clock, Activity, Users, GitBranch,
  Eye, ToggleLeft, ToggleRight, MoreHorizontal, Edit,
  Globe, ExternalLink, AlertTriangle, X, ArrowLeft,
  ChevronLeft, ChevronRight, Filter, Trash2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Pharmacy {
  id: string;
  name: string;
  owner_contact: string | null;
  subscription_status: 'active' | 'suspended' | 'trial';
  is_active: boolean;
  created_at: string;
  staff_count: number;
  branch_count: number;
  branches?: { id: string; name: string; code: string; }[];
}

export interface PharmacyDetail extends Pharmacy {
  branches: { id: string; name: string; code: string; is_main: boolean }[];
  users: { id: string; username: string; full_name: string; email: string; is_active: boolean }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

const STATUS_CFG = {
  active:    { icon: CheckCircle2, label: 'Active',    color: 'var(--sa-success)',        bg: 'var(--sa-success-muted)' },
  suspended: { icon: XCircle,      label: 'Suspended', color: 'var(--sa-danger)',         bg: 'var(--sa-danger-muted)' },
  trial:     { icon: Clock,        label: 'Trial',     color: 'var(--sa-warning)',        bg: 'var(--sa-warning-muted)' },
} as const;

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? {
    icon: Activity, label: status, color: 'var(--sa-text-muted)', bg: 'var(--sa-surface-raised)',
  };
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function PharmacyAvatar({ name, status }: { name: string; status: string }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'PH';
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG];
  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
      style={{ background: cfg?.color ?? 'var(--sa-accent)', opacity: 0.9 }}
    >
      {initials}
    </div>
  );
}

// ── Create Pharmacy Modal ──────────────────────────────────────────────────────

function CreatePharmacyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { accessToken } = useAuthStore();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<'active' | 'suspended' | 'trial'>('trial');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Pharmacy name is required'); return; }
    if (!adminUsername.trim() || !adminPassword.trim()) { setError('Admin username and password are required'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/v1/super-admin/pharmacies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name, owner_contact: contact, subscription_status: status, admin_username: adminUsername, admin_password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Failed to create pharmacy'); return; }
      onCreated(); onClose();
    } catch { setError('Network error — please try again'); }
    finally { setLoading(false); }
  };

  const inputCls = "w-full rounded-xl px-3.5 py-2.5 text-sm transition-all outline-none";
  const inputStyle = {
    background: 'var(--sa-surface-raised)',
    border: '1px solid var(--sa-border-strong)',
    color: 'var(--sa-text)',
  } as React.CSSProperties;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl p-6 sa-fade-up"
        style={{ background: 'var(--sa-surface)', border: '1px solid var(--sa-border-strong)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--sa-accent-muted)' }}>
              <Plus className="w-4 h-4" style={{ color: 'var(--sa-accent)' }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--sa-text)' }}>New Pharmacy</h2>
              <p className="text-xs" style={{ color: 'var(--sa-text-muted)' }}>Register a new pharmacy on the platform</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: 'var(--sa-text-muted)', background: 'var(--sa-surface-raised)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--sa-text-muted)' }}>PHARMACY NAME <span style={{ color: 'var(--sa-danger)' }}>*</span></label>
            <input id="pharmacy-name-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Al-Noor Medical Center" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--sa-text-muted)' }}>OWNER CONTACT</label>
            <input id="pharmacy-contact-input" type="text" value={contact} onChange={e => setContact(e.target.value)} placeholder="e.g. +92 300 1234567" className={inputCls} style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--sa-text-muted)' }}>ADMIN USERNAME <span style={{ color: 'var(--sa-danger)' }}>*</span></label>
              <input id="pharmacy-admin-user" type="text" value={adminUsername} onChange={e => setAdminUsername(e.target.value)} placeholder="e.g. admin_noor" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--sa-text-muted)' }}>ADMIN PASSWORD <span style={{ color: 'var(--sa-danger)' }}>*</span></label>
              <input id="pharmacy-admin-pass" type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="••••••••" className={inputCls} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--sa-text-muted)' }}>INITIAL STATUS</label>
            <div className="flex gap-2">
              {(['trial', 'active', 'suspended'] as const).map(s => {
                const cfg = STATUS_CFG[s];
                const active = status === s;
                return (
                  <button key={s} type="button" id={`status-btn-${s}`} onClick={() => setStatus(s)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all"
                    style={{
                      color: active ? cfg.color : 'var(--sa-text-muted)',
                      background: active ? cfg.bg : 'var(--sa-surface-raised)',
                      border: `1px solid ${active ? cfg.color + '40' : 'var(--sa-border)'}`,
                    }}
                  >{s}</button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ color: 'var(--sa-danger)', background: 'var(--sa-danger-muted)', border: '1px solid var(--sa-danger)30' }}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)', color: 'var(--sa-text-muted)' }}>
              Cancel
            </button>
            <button id="create-pharmacy-submit" type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'var(--sa-accent)' }}>
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…</> : <><Plus className="w-4 h-4" />Create Pharmacy</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Detail Drawer ──────────────────────────────────────────────────────────────

function PharmacyDetailDrawer({ id, onClose, onStatusChange }: { id: string; onClose: () => void; onStatusChange: () => void }) {
  const { accessToken } = useAuthStore();
  const [detail, setDetail] = useState<PharmacyDetail | null>(null);
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [patching, setPatching] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/super-admin/pharmacies/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json()).then(setDetail).finally(() => setLoading(false));
    fetch(`/api/v1/super-admin/pharmacies/${id}/billing`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json()).then(setBilling).catch(console.error);
  }, [id, accessToken]);


  const handleToggle = async () => {
    if (!detail) return;
    const next = detail.subscription_status === 'suspended' ? 'active' : 'suspended';
    setPatching(true);
    const res = await fetch(`/api/v1/super-admin/pharmacies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ subscription_status: next }),
    });
    if (res.ok) { const u = await res.json(); setDetail(d => d ? { ...d, ...u } : d); onStatusChange(); }
    setPatching(false);
  };

  const panelStyle = {
    background: 'var(--sa-surface)',
    border: '1px solid var(--sa-border-strong)',
  } as React.CSSProperties;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full max-h-[90vh] rounded-2xl shadow-2xl overflow-y-auto sa-slide-in sa-scrollbar p-6" style={panelStyle}>

        <div className="flex items-center justify-between mb-6">
          <button onClick={onClose} className="flex items-center gap-2 text-sm transition-colors" style={{ color: 'var(--sa-text-muted)' }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: 'var(--sa-text-muted)', background: 'var(--sa-surface-raised)' }} onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--sa-accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : detail ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--sa-text)' }}>{detail.name}</h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--sa-text-muted)' }}>{detail.owner_contact || 'No contact'}</p>
                <div className="mt-2"><StatusBadge status={detail.subscription_status} /></div>
              </div>
              <button id="drawer-toggle-status" onClick={handleToggle} disabled={patching}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  color: detail.subscription_status === 'suspended' ? 'var(--sa-success)' : 'var(--sa-danger)',
                  background: detail.subscription_status === 'suspended' ? 'var(--sa-success-muted)' : 'var(--sa-danger-muted)',
                  border: `1px solid ${detail.subscription_status === 'suspended' ? 'var(--sa-success)' : 'var(--sa-danger)'}30`,
                }}
              >
                {detail.subscription_status === 'suspended' ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                {patching ? 'Updating…' : detail.subscription_status === 'suspended' ? 'Reactivate' : 'Suspend'}
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Users, label: 'Staff', value: detail.staff_count, color: 'var(--sa-accent)' },
                { icon: GitBranch, label: 'Branches', value: detail.branch_count, color: '#a78bfa' },
                { icon: Activity, label: 'Active', value: detail.is_active ? 'Yes' : 'No', color: 'var(--sa-success)' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)' }}>
                  <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
                  <p className="text-2xl font-bold" style={{ color: 'var(--sa-text)' }}>{value}</p>
                  <p className="text-xs" style={{ color: 'var(--sa-text-muted)' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Created date */}
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)' }}>
              <span style={{ color: 'var(--sa-text-muted)' }}>Created: </span>
              <span style={{ color: 'var(--sa-text)' }}>
                {new Date(detail.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            {/* Billing */}
            {billing && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--sa-text-muted)' }}>
                    <Globe className="w-4 h-4" style={{ color: 'var(--sa-success)' }} /> Billing & Subscription
                  </h3>
                  <button
                    onClick={() => {
                      const amt = prompt('Enter manual payment amount (e.g. 5000):');
                      if (!amt) return;
                      const note = prompt('Enter reference note:');
                      if (!note) return;
                      fetch(`/api/v1/super-admin/pharmacies/${id}/manual-payment`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                        body: JSON.stringify({ amount: parseFloat(amt), reference_note: note }),
                      }).then(() => {
                        fetch(`/api/v1/super-admin/pharmacies/${id}/billing`, { headers: { Authorization: `Bearer ${accessToken}` } })
                          .then(r => r.json()).then(setBilling);
                      });
                    }}
                    className="text-xs text-white px-2 py-1 rounded-lg font-medium transition-colors"
                    style={{ background: 'var(--sa-accent)' }}
                  >
                    + Record Payment
                  </button>
                </div>
                <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)' }}>
                  {billing.subscription ? (
                    <>
                      {[
                        { label: 'Plan', value: `${billing.subscription.plan_name} (${billing.subscription.billing_cycle})` },
                        { label: 'Valid Until', value: billing.subscription.current_period_end ? new Date(billing.subscription.current_period_end).toLocaleDateString() : 'N/A' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center text-sm">
                          <span style={{ color: 'var(--sa-text-muted)' }}>{label}:</span>
                          <span className="font-medium" style={{ color: 'var(--sa-text)' }}>{value}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center text-sm">
                        <span style={{ color: 'var(--sa-text-muted)' }}>Status:</span>
                        <StatusBadge status={billing.subscription.status} />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--sa-text-muted)' }}>No active subscription found.</p>
                  )}

                  {billing.transactions?.length > 0 && (
                    <div className="pt-3" style={{ borderTop: '1px solid var(--sa-border)' }}>
                      <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--sa-text-faint)' }}>Recent Payments</p>
                      <div className="space-y-2">
                        {billing.transactions.slice(0, 3).map((t: any) => (
                          <div key={t.id} className="flex justify-between items-center text-xs">
                            <div>
                              <span className="block" style={{ color: 'var(--sa-text-muted)' }}>{new Date(t.created_at).toLocaleDateString()}</span>
                              <span className="capitalize" style={{ color: 'var(--sa-text-faint)' }}>{t.gateway}</span>
                            </div>
                            <div className="text-right">
                              <span className="block font-medium" style={{ color: 'var(--sa-text)' }}>{t.currency} {t.amount}</span>
                              <span style={{ color: t.status === 'success' ? 'var(--sa-success)' : 'var(--sa-danger)' }} className="capitalize">{t.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Branches */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--sa-text-muted)' }}>
                  <GitBranch className="w-4 h-4" style={{ color: '#a78bfa' }} /> Branches
                </h3>
                <button
                  onClick={() => {
                    const branchName = prompt('Enter new branch name:');
                    if (!branchName) return;
                    const code = prompt('Enter branch code (e.g. BR-001):');
                    if (!code) return;
                    fetch(`/api/v1/super-admin/pharmacies/${id}/branches`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                      body: JSON.stringify({ name: branchName, code, is_main: false }),
                    }).then(() => {
                      fetch(`/api/v1/super-admin/pharmacies/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } })
                        .then(r => r.json()).then(setDetail);
                    });
                  }}
                  className="text-xs text-white px-2 py-1 rounded-lg font-medium"
                  style={{ background: '#7c3aed' }}
                >
                  + Add Branch
                </button>
              </div>
              {detail.branches.length > 0 ? (
                <div className="space-y-2">
                  {detail.branches.map(b => (
                    <div key={b.id} className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--sa-text)' }}>{b.name}</p>
                        <p className="text-xs" style={{ color: 'var(--sa-text-faint)' }}>{b.code}</p>
                      </div>
                      {b.is_main && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--sa-accent-muted)', color: 'var(--sa-accent)' }}>Main</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-center rounded-xl p-4" style={{ color: 'var(--sa-text-muted)', background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)' }}>No branches found.</div>
              )}
            </div>

            {/* Users */}
            {detail.users.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--sa-text-muted)' }}>
                  <Users className="w-4 h-4" style={{ color: 'var(--sa-accent)' }} /> Staff Accounts
                </h3>
                <div className="space-y-2">
                  {detail.users.map(u => (
                    <div key={u.id} className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--sa-text)' }}>{u.full_name || u.username}</p>
                        <p className="text-xs" style={{ color: 'var(--sa-text-faint)' }}>{u.email}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                        color: u.is_active ? 'var(--sa-success)' : 'var(--sa-text-faint)',
                        background: u.is_active ? 'var(--sa-success-muted)' : 'var(--sa-surface-hover)',
                      }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center mt-20" style={{ color: 'var(--sa-text-muted)' }}>Pharmacy not found.</p>
        )}
      </div>
    </div>
  );
}

// ── Card View ──────────────────────────────────────────────────────────────────

function PharmacyCard({
  pharmacy,
  onView,
  onToggleStatus,
  onDelete,
  patching,
}: {
  pharmacy: Pharmacy;
  onView: (id: string) => void;
  onToggleStatus: (pharmacy: Pharmacy, e: React.MouseEvent) => void;
  onDelete: (pharmacy: Pharmacy, e: React.MouseEvent) => void;
  patching: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = STATUS_CFG[pharmacy.subscription_status];

  return (
    <div
      className="relative flex flex-col rounded-2xl p-5 transition-all duration-200 group"
      style={{
        background: 'var(--sa-surface)',
        border: '1px solid var(--sa-border)',
      }}
      onMouseEnter={e => (e.currentTarget.style.border = '1px solid var(--sa-border-strong)')}
      onMouseLeave={e => (e.currentTarget.style.border = '1px solid var(--sa-border)')}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <PharmacyAvatar name={pharmacy.name} status={pharmacy.subscription_status} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--sa-text)' }}>
            {pharmacy.name}
          </p>
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--sa-text-muted)' }}>
            {pharmacy.owner_contact || 'No contact info'}
          </p>
        </div>
        {/* More menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'var(--sa-text-muted)', background: 'var(--sa-surface-raised)' }}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-8 w-40 rounded-xl shadow-xl z-20 overflow-hidden sa-dropdown"
              style={{ background: 'var(--sa-surface)', border: '1px solid var(--sa-border-strong)' }}
            >
              <button
                onClick={e => { setMenuOpen(false); onToggleStatus(pharmacy, e); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-left transition-colors"
                style={{ color: pharmacy.subscription_status === 'suspended' ? 'var(--sa-success)' : 'var(--sa-warning)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--sa-surface-raised)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {pharmacy.subscription_status === 'suspended' ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                {pharmacy.subscription_status === 'suspended' ? 'Reactivate' : 'Suspend'}
              </button>
              <button
                onClick={e => { setMenuOpen(false); onDelete(pharmacy, e); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-left transition-colors"
                style={{ color: 'var(--sa-danger)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--sa-danger-muted)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Plan badge */}
      <div className="mb-3">
        <StatusBadge status={pharmacy.subscription_status} />
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--sa-text-muted)' }}>
          <Users className="w-3.5 h-3.5" />
          <span>{pharmacy.staff_count} staff</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--sa-text-muted)' }}>
          <GitBranch className="w-3.5 h-3.5" />
          <span>{pharmacy.branch_count} branches</span>
        </div>
      </div>

      {/* Branches Chain View */}
      {pharmacy.branches && pharmacy.branches.length > 0 && (
        <div className="mb-3 pl-1">
          <div className="border-l-2 border-dashed border-zinc-300 dark:border-zinc-700 pl-3 py-1 space-y-2">
            {pharmacy.branches.map(b => (
              <div key={b.id} className="relative flex items-center group/branch">
                {/* Horizontal dashed line */}
                <div className="absolute -left-3 top-1/2 w-3 border-t-2 border-dashed border-zinc-300 dark:border-zinc-700" />
                <div className="bg-zinc-100/50 dark:bg-zinc-800/50 rounded-lg px-2 py-1.5 flex flex-col w-full border border-zinc-200/50 dark:border-zinc-700/50 transition-colors group-hover/branch:border-zinc-300 dark:group-hover/branch:border-zinc-600">
                  <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 leading-tight truncate" title={b.name}>{b.name}</p>
                  <p className="text-[9px] text-zinc-500 mt-0.5">{b.code}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date row */}
      <p className="text-[10px] mb-4" style={{ color: 'var(--sa-text-faint)' }}>
        Added {new Date(pharmacy.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>

      {/* Action footer */}
      <div className="flex items-center gap-2 pt-3 mt-auto" style={{ borderTop: '1px solid var(--sa-border)' }}>
        <button
          id={`view-detail-${pharmacy.id}`}
          onClick={() => onView(pharmacy.id)}
          className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-xs font-medium transition-all"
          style={{ color: 'var(--sa-accent)', background: 'var(--sa-accent-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--sa-accent-muted-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--sa-accent-muted)')}
        >
          <Eye className="w-3.5 h-3.5" />
          View
        </button>

        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--sa-accent)', background: 'var(--sa-accent-muted)' }}
          title="Create New Branch/Franchise"
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `/super-admin/pharmacies/${pharmacy.id}/branches/new`;
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sa-accent)'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sa-accent-muted)'; (e.currentTarget as HTMLElement).style.color = 'var(--sa-accent)'; }}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--sa-text-muted)', background: 'var(--sa-surface-raised)' }}
          title="Edit (coming soon)"
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--sa-text)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--sa-text-muted)'; }}
        >
          <Edit className="w-3.5 h-3.5" />
        </button>

        <button
          id={`toggle-status-${pharmacy.id}`}
          onClick={e => onToggleStatus(pharmacy, e)}
          disabled={patching}
          title={pharmacy.subscription_status === 'suspended' ? 'Reactivate' : 'Suspend'}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
          style={{
            color: pharmacy.subscription_status === 'suspended' ? 'var(--sa-success)' : 'var(--sa-danger)',
            background: pharmacy.subscription_status === 'suspended' ? 'var(--sa-success-muted)' : 'var(--sa-danger-muted)',
          }}
        >
          {patching
            ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            : pharmacy.subscription_status === 'suspended'
              ? <ToggleLeft className="w-3.5 h-3.5" />
              : <ToggleRight className="w-3.5 h-3.5" />
          }
        </button>
      </div>
    </div>
  );
}

// ── List Row View ──────────────────────────────────────────────────────────────

function PharmacyRow({
  pharmacy,
  onView,
  onToggleStatus,
  onDelete,
  patching,
}: {
  pharmacy: Pharmacy;
  onView: (id: string) => void;
  onToggleStatus: (pharmacy: Pharmacy, e: React.MouseEvent) => void;
  onDelete: (pharmacy: Pharmacy, e: React.MouseEvent) => void;
  patching: boolean;
}) {
  return (
    <div
      id={`pharmacy-row-${pharmacy.id}`}
      className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors"
      style={{ borderBottom: '1px solid var(--sa-border)' }}
      onClick={() => onView(pharmacy.id)}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--sa-surface-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <PharmacyAvatar name={pharmacy.name} status={pharmacy.subscription_status} />

      <div className="flex-1 min-w-0 py-1">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--sa-text)' }}>{pharmacy.name}</p>
        <p className="text-xs truncate" style={{ color: 'var(--sa-text-muted)' }}>{pharmacy.owner_contact || '—'}</p>

        {/* Branches Chain inside row */}
        {pharmacy.branches && pharmacy.branches.length > 0 && (
          <div className="mt-2.5 pl-2">
            <div className="border-l-2 border-dashed border-zinc-300 dark:border-zinc-700 pl-3 py-0.5 space-y-1.5">
              {pharmacy.branches.map(b => (
                <div key={b.id} className="relative flex items-center group/branch w-fit">
                  <div className="absolute -left-3 top-1/2 w-3 border-t-2 border-dashed border-zinc-300 dark:border-zinc-700" />
                  <div className="bg-zinc-100/50 dark:bg-zinc-800/50 rounded-lg px-2 py-1 flex items-center gap-2 border border-zinc-200/50 dark:border-zinc-700/50 transition-colors group-hover/branch:border-zinc-300 dark:group-hover/branch:border-zinc-600">
                    <p className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">{b.name}</p>
                    <p className="text-[9px] text-zinc-500">{b.code}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="hidden sm:block w-28 shrink-0">
        <StatusBadge status={pharmacy.subscription_status} />
      </div>

      <div className="hidden md:flex items-center gap-1.5 w-20 text-xs" style={{ color: 'var(--sa-text-muted)' }}>
        <Users className="w-3.5 h-3.5" /> {pharmacy.staff_count}
      </div>

      <div className="hidden md:flex items-center gap-1.5 w-24 text-xs" style={{ color: 'var(--sa-text-muted)' }}>
        <GitBranch className="w-3.5 h-3.5" /> {pharmacy.branch_count}
      </div>

      <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onView(pharmacy.id)}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--sa-text-muted)', background: 'var(--sa-surface-raised)' }}
          title="View details"
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--sa-accent)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--sa-text-muted)'; }}
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button
          id={`toggle-status-${pharmacy.id}`}
          onClick={e => onToggleStatus(pharmacy, e)}
          disabled={patching}
          title={pharmacy.subscription_status === 'suspended' ? 'Reactivate' : 'Suspend'}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
          style={{
            color: pharmacy.subscription_status === 'suspended' ? 'var(--sa-success)' : 'var(--sa-danger)',
            background: pharmacy.subscription_status === 'suspended' ? 'var(--sa-success-muted)' : 'var(--sa-danger-muted)',
          }}
        >
          {patching
            ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            : pharmacy.subscription_status === 'suspended'
              ? <ToggleLeft className="w-3.5 h-3.5" />
              : <ToggleRight className="w-3.5 h-3.5" />
          }
        </button>
      </div>
    </div>
  );
}

// ── PharmacyGrid ───────────────────────────────────────────────────────────────

interface PharmacyGridProps {
  pharmacies: Pharmacy[];
  loading: boolean;
  onRefresh: () => void;
  onToggleStatus: (pharmacy: Pharmacy, e: React.MouseEvent) => void;
  onDelete: (pharmacy: Pharmacy, e: React.MouseEvent) => void;
  patchingId: string | null;
  onOpenCreate: () => void;
}

export function PharmacyGrid({
  pharmacies,
  loading,
  onRefresh,
  onToggleStatus,
  onDelete,
  patchingId,
  onOpenCreate,
}: PharmacyGridProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Reset to page 1 when search or filter changes
  useEffect(() => { setPage(1); }, [search, filterStatus]);

  const filtered = pharmacies.filter(p => {
    const matchName = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.owner_contact ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.subscription_status === filterStatus;
    return matchName && matchStatus;
  });


  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const fromIdx = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toIdx = Math.min(page * PAGE_SIZE, filtered.length);

  const FILTER_TABS = ['all', 'active', 'trial', 'suspended'] as const;

  return (
    <>
      {selectedId && (
        <PharmacyDetailDrawer
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onStatusChange={onRefresh}
        />
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-5">
        {/* Row 1: search + view toggle + actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--sa-text-faint)' }} />
            <input
              id="pharmacy-search"
              type="text"
              placeholder="Search pharmacies, contacts…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all"
              style={{
                background: 'var(--sa-surface)',
                border: '1px solid var(--sa-border)',
                color: 'var(--sa-text)',
              }}
              onFocus={e => (e.currentTarget.style.border = '1px solid var(--sa-accent)')}
              onBlur={e => (e.currentTarget.style.border = '1px solid var(--sa-border)')}
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View toggle */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--sa-border)' }}>
              {([['grid', LayoutGrid], ['list', List]] as const).map(([mode, Icon]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="w-9 h-9 flex items-center justify-center transition-all"
                  style={{
                    color: viewMode === mode ? 'var(--sa-accent)' : 'var(--sa-text-muted)',
                    background: viewMode === mode ? 'var(--sa-accent-muted)' : 'var(--sa-surface)',
                  }}
                  title={mode === 'grid' ? 'Card grid view' : 'List view'}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              id="refresh-pharmacies"
              onClick={onRefresh}
              disabled={loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
              style={{ color: 'var(--sa-text-muted)', background: 'var(--sa-surface)', border: '1px solid var(--sa-border)' }}
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* New pharmacy */}
            <button
              id="open-create-pharmacy"
              onClick={onOpenCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'var(--sa-accent)', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--sa-accent-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--sa-accent)')}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Pharmacy</span>
            </button>
          </div>
        </div>

        {/* Row 2: status filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--sa-text-faint)' }} />
          {FILTER_TABS.map(s => {
            const active = filterStatus === s;
            const count = s === 'all' ? pharmacies.length : pharmacies.filter(p => p.subscription_status === s).length;
            return (
              <button
                key={s}
                id={`filter-${s}`}
                onClick={() => setFilterStatus(s)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium capitalize transition-all"
                style={{
                  color: active ? 'var(--sa-accent)' : 'var(--sa-text-muted)',
                  background: active ? 'var(--sa-accent-muted)' : 'var(--sa-surface)',
                  border: `1px solid ${active ? 'var(--sa-accent)40' : 'var(--sa-border)'}`,
                }}
              >
                {s}
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                  style={{
                    background: active ? 'var(--sa-accent)' : 'var(--sa-surface-raised)',
                    color: active ? 'white' : 'var(--sa-text-faint)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24 gap-3">
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--sa-accent)', borderTopColor: 'transparent' }} />
          <span className="text-sm" style={{ color: 'var(--sa-text-muted)' }}>Loading pharmacies…</span>
        </div>
      ) : paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)' }}>
            <Building2 className="w-7 h-7" style={{ color: 'var(--sa-text-faint)' }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--sa-text-muted)' }}>
            {search || filterStatus !== 'all' ? 'No pharmacies match your filters.' : 'No pharmacies registered yet.'}
          </p>
          {!search && filterStatus === 'all' && (
            <button onClick={onOpenCreate} className="text-sm font-semibold px-4 py-2 rounded-xl transition-all" style={{ color: 'var(--sa-accent)', background: 'var(--sa-accent-muted)' }}>
              + Create First Pharmacy
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {paginated.map((p, i) => (
            <div key={p.id} className="sa-fade-up" style={{ animationDelay: `${i * 0.04}s` }}>
              <PharmacyCard
                pharmacy={p}
                onView={setSelectedId}
                onToggleStatus={onToggleStatus}
                onDelete={onDelete}
                patching={patchingId === p.id}
              />
            </div>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--sa-surface)', border: '1px solid var(--sa-border)' }}>
          {/* List header */}
          <div className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: '1px solid var(--sa-border)', background: 'var(--sa-surface-raised)' }}>
            <div className="w-11 shrink-0" />
            <span className="flex-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--sa-text-faint)' }}>Pharmacy</span>
            <span className="hidden sm:block w-28 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--sa-text-faint)' }}>Status</span>
            <span className="hidden md:block w-20 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--sa-text-faint)' }}>Staff</span>
            <span className="hidden md:block w-24 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--sa-text-faint)' }}>Branches</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--sa-text-faint)' }}>Actions</span>
          </div>
          {paginated.map(p => (
            <PharmacyRow
              key={p.id}
              pharmacy={p}
              onView={setSelectedId}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
              patching={patchingId === p.id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-5 flex-wrap gap-3">
          <p className="text-xs" style={{ color: 'var(--sa-text-muted)' }}>
            Showing <span className="font-semibold" style={{ color: 'var(--sa-text)' }}>{fromIdx}</span>–<span className="font-semibold" style={{ color: 'var(--sa-text)' }}>{toIdx}</span> of <span className="font-semibold" style={{ color: 'var(--sa-text)' }}>{filtered.length}</span> pharmacies
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
              style={{ color: 'var(--sa-text-muted)', background: 'var(--sa-surface)', border: '1px solid var(--sa-border)' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => p === '...' ? (
                <span key={`ellipsis-${i}`} className="text-xs" style={{ color: 'var(--sa-text-faint)' }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className="w-8 h-8 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    color: page === p ? 'white' : 'var(--sa-text-muted)',
                    background: page === p ? 'var(--sa-accent)' : 'var(--sa-surface)',
                    border: `1px solid ${page === p ? 'transparent' : 'var(--sa-border)'}`,
                  }}
                >
                  {p}
                </button>
              ))
            }
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
              style={{ color: 'var(--sa-text-muted)', background: 'var(--sa-surface)', border: '1px solid var(--sa-border)' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Re-export for convenience
export { CreatePharmacyModal };
