'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import {
  Globe, CheckCircle2, TrendingUp, XCircle,
} from 'lucide-react';
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
  const { accessToken } = useAuthStore();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [patchingId, setPatchingId] = useState<string | null>(null);

  const fetchPharmacies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/super-admin/pharmacies', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (res.ok) setPharmacies(await res.json());
    } finally {
      setLoading(false);
    }
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
