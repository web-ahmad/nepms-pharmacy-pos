'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import {
  Globe, CheckCircle2, TrendingUp, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PharmacyGrid, CreatePharmacyModal } from './PharmacyGrid';
import type { Pharmacy } from './PharmacyGrid';

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  muted,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  muted: string;
}) {
  return (
    <div
      className="relative rounded-2xl p-5 overflow-hidden transition-all duration-200"
      style={{ background: 'var(--sa-surface)', border: '1px solid var(--sa-border)' }}
      onMouseEnter={e => (e.currentTarget.style.border = '1px solid var(--sa-border-strong)')}
      onMouseLeave={e => (e.currentTarget.style.border = '1px solid var(--sa-border)')}
    >
      {/* Glow orb */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20"
        style={{ background: color }}
      />
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: muted }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--sa-text-faint)' }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: 'var(--sa-text)' }}>{value}</p>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [patchingId, setPatchingId] = useState<string | null>(null);

  const fetchPharmacies = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Pharmacy[]>('/api/v1/super-admin/pharmacies');
      setPharmacies(data);
    } catch {
      // 401s are handled globally by the api client (logout + redirect to /login)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPharmacies(); }, [fetchPharmacies]);

  const handleToggleStatus = async (pharmacy: Pharmacy, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = pharmacy.subscription_status === 'suspended' ? 'active' : 'suspended';
    setPatchingId(pharmacy.id);
    try {
      const { data } = await api.patch(`/api/v1/super-admin/pharmacies/${pharmacy.id}`, { subscription_status: next });
      setPharmacies(ps => ps.map(p => p.id === pharmacy.id ? { ...p, ...data } : p));
      toast.success(`${pharmacy.name} ${next === 'suspended' ? 'suspended' : 'activated'}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to update pharmacy status');
    } finally {
      setPatchingId(null);
    }
  };

  const handleDelete = async (pharmacy: Pharmacy, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to permanently delete ${pharmacy.name}? This action cannot be undone.`)) {
      return;
    }

    setPatchingId(pharmacy.id);
    try {
      await api.delete(`/api/v1/super-admin/pharmacies/${pharmacy.id}`);
      setPharmacies(ps => ps.filter(p => p.id !== pharmacy.id));
      toast.success(`${pharmacy.name} deleted`);
    } catch (err: any) {
      toast.error(`Failed to delete pharmacy: ${err?.response?.data?.detail ?? 'Unknown error'}`);
    } finally {
      setPatchingId(null);
    }
  };

  // Derived stats
  const stats = {
    total:     pharmacies.length,
    active:    pharmacies.filter(p => p.subscription_status === 'active').length,
    trial:     pharmacies.filter(p => p.subscription_status === 'trial').length,
    suspended: pharmacies.filter(p => p.subscription_status === 'suspended').length,
  };

  const STAT_CARDS = [
    { label: 'Total Pharmacies', value: stats.total,     icon: Globe,         color: 'var(--sa-accent)',   muted: 'var(--sa-accent-muted)' },
    { label: 'Active',           value: stats.active,    icon: CheckCircle2,  color: 'var(--sa-success)',  muted: 'var(--sa-success-muted)' },
    { label: 'On Trial',         value: stats.trial,     icon: TrendingUp,    color: 'var(--sa-warning)',  muted: 'var(--sa-warning-muted)' },
    { label: 'Suspended',        value: stats.suspended, icon: XCircle,       color: 'var(--sa-danger)',   muted: 'var(--sa-danger-muted)' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      {/* Create modal */}
      {showCreate && (
        <CreatePharmacyModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchPharmacies}
        />
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {STAT_CARDS.map((s, i) => (
          <div key={s.label} className="sa-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
            <StatCard {...s} />
          </div>
        ))}
      </div>

      {/* Pharmacy grid / list */}
      <PharmacyGrid
        pharmacies={pharmacies}
        loading={loading}
        onRefresh={fetchPharmacies}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        patchingId={patchingId}
        onOpenCreate={() => setShowCreate(true)}
      />

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between text-[11px]" style={{ color: 'var(--sa-text-faint)' }}>
        <span>{pharmacies.length} pharmacies registered</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--sa-success)' }} />
          <span>NEPMS Platform v2 — Super Admin Portal</span>
        </div>
      </div>
    </div>
  );
}
