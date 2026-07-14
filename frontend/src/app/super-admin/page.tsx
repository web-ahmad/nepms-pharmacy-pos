'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import {
  Building2, Plus, RefreshCw, Shield, Users, GitBranch,
  CheckCircle2, XCircle, Clock, ChevronRight, X, AlertTriangle,
  Activity, Search, ArrowLeft, Eye, ToggleLeft, ToggleRight,
  Sparkles, Globe, TrendingUp,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Pharmacy {
  id: string;
  name: string;
  owner_contact: string | null;
  subscription_status: 'active' | 'suspended' | 'trial';
  is_active: boolean;
  created_at: string;
  staff_count: number;
  branch_count: number;
}

interface PharmacyDetail extends Pharmacy {
  branches: { id: string; name: string; code: string; is_main: boolean }[];
  users: { id: string; username: string; full_name: string; email: string; is_active: boolean }[];
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    active:    { icon: CheckCircle2, cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', label: 'Active' },
    suspended: { icon: XCircle,      cls: 'bg-red-500/15 text-red-300 border-red-500/30',             label: 'Suspended' },
    trial:     { icon: Clock,        cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',        label: 'Trial' },
  }[status] ?? { icon: Activity, cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30', label: status };

  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="relative bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm overflow-hidden group hover:bg-white/8 transition-all duration-300">
      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-300 ${color}`} />
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color} bg-opacity-20`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

// ── Create Pharmacy Modal ─────────────────────────────────────────────────────

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
        body: JSON.stringify({ 
          name, 
          owner_contact: contact, 
          subscription_status: status,
          admin_username: adminUsername,
          admin_password: adminPassword
        })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Failed to create pharmacy'); return; }
      onCreated();
      onClose();
    } catch { setError('Network error — please try again'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Plus className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">New Pharmacy</h2>
              <p className="text-slate-400 text-xs">Register a new pharmacy on the platform</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">Pharmacy Name <span className="text-red-400">*</span></label>
            <input
              id="pharmacy-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Al-Noor Medical Center"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">Owner Contact</label>
            <input
              id="pharmacy-contact-input"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. +92 300 1234567"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Admin Username <span className="text-red-400">*</span></label>
              <input
                id="pharmacy-admin-user"
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="e.g. admin_noor"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Admin Password <span className="text-red-400">*</span></label>
              <input
                id="pharmacy-admin-pass"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">Initial Status</label>
            <div className="flex gap-2">
              {(['trial', 'active', 'suspended'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  id={`status-btn-${s}`}
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${
                    status === s
                      ? s === 'active'   ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : s === 'suspended' ? 'bg-red-500/20 border-red-500/50 text-red-300'
                      : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/8'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              id="create-pharmacy-submit"
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating…</> : <><Plus className="w-4 h-4" /> Create Pharmacy</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function PharmacyDetailDrawer({ id, onClose, onStatusChange }: { id: string; onClose: () => void; onStatusChange: () => void }) {
  const { accessToken } = useAuthStore();
  const [detail, setDetail] = useState<PharmacyDetail | null>(null);
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [patching, setPatching] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/super-admin/pharmacies/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then(setDetail)
      .finally(() => setLoading(false));
      
    fetch(`/api/v1/super-admin/pharmacies/${id}/billing`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then(setBilling)
      .catch(console.error);
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
    if (res.ok) {
      const updated = await res.json();
      setDetail((d) => d ? { ...d, ...updated } : d);
      onStatusChange();
    }
    setPatching(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg h-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-right duration-300 p-6">

        <div className="flex items-center justify-between mb-6">
          <button onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center" onClick={onClose}>
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : detail ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white leading-tight">{detail.name}</h2>
                <p className="text-slate-400 text-sm mt-0.5">{detail.owner_contact || 'No contact'}</p>
                <div className="mt-2"><StatusBadge status={detail.subscription_status} /></div>
              </div>
              <button
                id="drawer-toggle-status"
                onClick={handleToggle}
                disabled={patching}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  detail.subscription_status === 'suspended'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-red-500/15 border-red-500/30 text-red-300 hover:bg-red-500/25'
                } disabled:opacity-50`}
              >
                {detail.subscription_status === 'suspended' ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                {patching ? 'Updating…' : detail.subscription_status === 'suspended' ? 'Reactivate' : 'Suspend'}
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <Users className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">{detail.staff_count}</p>
                <p className="text-xs text-slate-400">Staff</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <GitBranch className="w-5 h-5 text-violet-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">{detail.branch_count}</p>
                <p className="text-xs text-slate-400">Branches</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <Activity className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">{detail.is_active ? 'Yes' : 'No'}</p>
                <p className="text-xs text-slate-400">Active</p>
              </div>
            </div>

            {/* Created */}
            <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-slate-400">
              Created: <span className="text-white">{new Date(detail.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>

            {/* Billing */}
            {billing && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-300 text-sm font-semibold flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" /> Billing & Subscription
                  </h3>
                  <button 
                    onClick={() => {
                       const amt = prompt('Enter manual payment amount (e.g. 5000):');
                       if (!amt) return;
                       const note = prompt('Enter reference note (e.g. Bank Transfer):');
                       if (!note) return;
                       
                       fetch(`/api/v1/super-admin/pharmacies/${id}/manual-payment`, {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                         body: JSON.stringify({ amount: parseFloat(amt), reference_note: note })
                       }).then(() => {
                         // Refresh billing
                         fetch(`/api/v1/super-admin/pharmacies/${id}/billing`, { headers: { Authorization: `Bearer ${accessToken}` } })
                           .then(r => r.json())
                           .then(setBilling);
                       });
                    }}
                    className="text-xs bg-indigo-500 hover:bg-indigo-400 text-white px-2 py-1 rounded-md transition-colors"
                  >
                    + Record Payment
                  </button>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  {billing.subscription ? (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Plan:</span>
                        <span className="text-white font-medium">{billing.subscription.plan_name} ({billing.subscription.billing_cycle})</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Status:</span>
                        <StatusBadge status={billing.subscription.status} />
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Valid Until:</span>
                        <span className="text-white font-medium">
                           {billing.subscription.current_period_end ? new Date(billing.subscription.current_period_end).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-slate-400">No active subscription found.</div>
                  )}

                  {billing.transactions && billing.transactions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider font-semibold">Recent Payments</p>
                      <div className="space-y-2">
                        {billing.transactions.slice(0, 3).map((t: any) => (
                          <div key={t.id} className="flex justify-between items-center text-xs">
                            <div>
                              <span className="text-slate-300 block">{new Date(t.created_at).toLocaleDateString()}</span>
                              <span className="text-slate-500 capitalize">{t.gateway}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-white font-medium block">{t.currency} {t.amount}</span>
                              <span className={`${t.status === 'success' ? 'text-emerald-400' : 'text-red-400'} capitalize`}>{t.status}</span>
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
            {/* Branches */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-slate-300 text-sm font-semibold flex items-center gap-2"><GitBranch className="w-4 h-4 text-violet-400" /> Branches</h3>
                <button
                  onClick={() => {
                    const name = prompt('Enter new branch name (e.g. Downtown Branch):');
                    if (!name) return;
                    const code = prompt('Enter branch code (e.g. BR-001):');
                    if (!code) return;
                    
                    fetch(`/api/v1/super-admin/pharmacies/${id}/branches`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                      body: JSON.stringify({ name, code, is_main: false })
                    }).then(() => {
                      // Refresh detail to show new branch
                      fetch(`/api/v1/super-admin/pharmacies/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } })
                        .then(r => r.json())
                        .then(setDetail);
                    });
                  }}
                  className="text-xs bg-violet-500 hover:bg-violet-400 text-white px-2 py-1 rounded-md transition-colors"
                >
                  + Add Branch
                </button>
              </div>
              {detail.branches.length > 0 ? (
                <div className="space-y-2">
                  {detail.branches.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                      <div>
                        <p className="text-white text-sm font-medium">{b.name}</p>
                        <p className="text-slate-500 text-xs">{b.code}</p>
                      </div>
                      {b.is_main && <span className="text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full">Main</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400 bg-white/5 border border-white/10 rounded-xl p-4 text-center">No branches found.</div>
              )}
            </div>

            {/* Users */}
            {detail.users.length > 0 && (
              <div>
                <h3 className="text-slate-300 text-sm font-semibold mb-2 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-400" /> Staff Accounts</h3>
                <div className="space-y-2">
                  {detail.users.map(u => (
                    <div key={u.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                      <div>
                        <p className="text-white text-sm font-medium">{u.full_name || u.username}</p>
                        <p className="text-slate-500 text-xs">{u.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${u.is_active ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-500/10 border-slate-500/30 text-slate-400'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-400 text-center mt-20">Pharmacy not found.</p>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const { accessToken } = useAuthStore();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [patchingId, setPatchingId] = useState<string | null>(null);

  const fetchPharmacies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/super-admin/pharmacies', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (res.ok) setPharmacies(await res.json());
    } finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { fetchPharmacies(); }, [fetchPharmacies]);

  const handleToggleStatus = async (pharmacy: Pharmacy, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = pharmacy.subscription_status === 'suspended' ? 'active' : 'suspended';
    setPatchingId(pharmacy.id);
    const res = await fetch(`/api/v1/super-admin/pharmacies/${pharmacy.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ subscription_status: next }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPharmacies(ps => ps.map(p => p.id === pharmacy.id ? { ...p, ...updated } : p));
    }
    setPatchingId(null);
  };

  // Derived stats
  const stats = {
    total:     pharmacies.length,
    active:    pharmacies.filter(p => p.subscription_status === 'active').length,
    trial:     pharmacies.filter(p => p.subscription_status === 'trial').length,
    suspended: pharmacies.filter(p => p.subscription_status === 'suspended').length,
  };

  // Filtered list
  const filtered = pharmacies.filter(p => {
    const matchName = p.name.toLowerCase().includes(search.toLowerCase()) ||
                      (p.owner_contact ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.subscription_status === filterStatus;
    return matchName && matchStatus;
  });

  return (
    <div className="min-h-screen p-6 md:p-10">
      {/* Modals */}
      {showCreate && <CreatePharmacyModal onClose={() => setShowCreate(false)} onCreated={fetchPharmacies} />}
      {selectedId && (
        <PharmacyDetailDrawer
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onStatusChange={fetchPharmacies}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">Super Admin</h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Platform Control
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">Manage all pharmacies across the NEPMS platform</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="refresh-pharmacies"
            onClick={fetchPharmacies}
            disabled={loading}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            id="open-create-pharmacy"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
          >
            <Plus className="w-4 h-4" /> New Pharmacy
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Pharmacies" value={stats.total}     icon={Globe}         color="bg-indigo-500" />
        <StatCard label="Active"           value={stats.active}    icon={CheckCircle2}  color="bg-emerald-500" />
        <StatCard label="On Trial"         value={stats.trial}     icon={TrendingUp}    color="bg-amber-500" />
        <StatCard label="Suspended"        value={stats.suspended} icon={XCircle}       color="bg-red-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="pharmacy-search"
            type="text"
            placeholder="Search pharmacies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/60 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'trial', 'suspended'] as const).map(s => (
            <button
              key={s}
              id={`filter-${s}`}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${
                filterStatus === s
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/8'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span>Pharmacy</span>
          <span>Status</span>
          <span className="hidden md:block">Staff</span>
          <span className="hidden md:block">Branches</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400 text-sm">Loading pharmacies…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {search || filterStatus !== 'all' ? 'No pharmacies match your filters.' : 'No pharmacies registered yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((pharmacy) => (
              <div
                key={pharmacy.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors cursor-pointer group"
                onClick={() => setSelectedId(pharmacy.id)}
                id={`pharmacy-row-${pharmacy.id}`}
              >
                {/* Name */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-indigo-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate group-hover:text-indigo-300 transition-colors">{pharmacy.name}</p>
                    <p className="text-slate-500 text-xs truncate">{pharmacy.owner_contact || '—'}</p>
                  </div>
                </div>

                {/* Status */}
                <div><StatusBadge status={pharmacy.subscription_status} /></div>

                {/* Staff */}
                <div className="hidden md:flex items-center gap-1.5 text-slate-300 text-sm">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  {pharmacy.staff_count}
                </div>

                {/* Branches */}
                <div className="hidden md:flex items-center gap-1.5 text-slate-300 text-sm">
                  <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                  {pharmacy.branch_count}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    id={`toggle-status-${pharmacy.id}`}
                    onClick={(e) => handleToggleStatus(pharmacy, e)}
                    disabled={patchingId === pharmacy.id}
                    title={pharmacy.subscription_status === 'suspended' ? 'Reactivate' : 'Suspend'}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all disabled:opacity-50 ${
                      pharmacy.subscription_status === 'suspended'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                    }`}
                  >
                    {patchingId === pharmacy.id
                      ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      : pharmacy.subscription_status === 'suspended'
                        ? <ToggleLeft className="w-4 h-4" />
                        : <ToggleRight className="w-4 h-4" />
                    }
                  </button>
                  <button
                    id={`view-detail-${pharmacy.id}`}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(pharmacy.id); }}
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between text-xs text-slate-600">
        <span>{filtered.length} of {pharmacies.length} pharmacies</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>NEPMS Platform v2 — Super Admin Portal</span>
        </div>
      </div>
    </div>
  );
}
