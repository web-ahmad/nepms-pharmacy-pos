'use client';
// features/branches/components/BranchDetailView.tsx
// 7-tab detail panel: Overview, Sales, Inventory, Staff, Customers, Settings, Activity

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BarChart2, Package, Users, UserCheck,
  Settings, Activity, MapPin, Phone, Mail, Calendar,
  Shield, Clock, Globe, Tag, FileText, ExternalLink, Edit,
  AlertTriangle, CheckCircle2, Loader2,
} from 'lucide-react';
import type { Branch, BranchStats } from '../types/branch';
import { BranchStatusBadge } from './BranchStatusBadge';
import { BranchTypeBadge } from './BranchTypeBadge';
import { BranchHealthScore } from './BranchHealthScore';
import { useBranchStats, useBranchStaff } from '../services/branch.api';
import { useRouter } from 'next/navigation';
import { STAFF_ROLE_LABELS } from '../types/branch';

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, prefix = '', suffix = '', color = 'indigo', isLoading,
}: {
  label: string; value?: number; prefix?: string; suffix?: string;
  color?: string; isLoading?: boolean;
}) {
  if (isLoading) return <div className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />;
  const formatted = typeof value === 'number'
    ? (value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toLocaleString())
    : '—';
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 text-${color}-600 dark:text-${color}-400 tabular-nums`}>
        {prefix}{formatted}{suffix}
      </p>
    </div>
  );
}

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: LayoutDashboard },
  { id: 'sales',      label: 'Sales',      icon: BarChart2 },
  { id: 'inventory',  label: 'Inventory',  icon: Package },
  { id: 'staff',      label: 'Staff',      icon: Users },
  { id: 'customers',  label: 'Customers',  icon: UserCheck },
  { id: 'settings',   label: 'Settings',   icon: Settings },
  { id: 'activity',   label: 'Activity',   icon: Activity },
];

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ branch, stats, statsLoading }: { branch: Branch; stats?: BranchStats; statsLoading: boolean }) {
  const themeColor = branch.theme_color || '#6366f1';
  const infoRows = [
    { icon: MapPin,    label: 'Location',  value: [branch.city, branch.province, branch.country].filter(Boolean).join(', ') },
    { icon: Phone,     label: 'Phone',     value: branch.phone },
    { icon: Mail,      label: 'Email',     value: branch.email },
    { icon: Calendar,  label: 'Opened',    value: branch.opening_date || '—' },
    { icon: Globe,     label: 'Timezone',  value: branch.timezone },
    { icon: Tag,       label: 'Currency',  value: branch.currency },
    { icon: FileText,  label: 'License #', value: branch.drug_license_number },
    { icon: Shield,    label: 'Tax No.',   value: branch.tax_number },
  ];

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Sales"     value={stats?.total_sales}     prefix="Rs " isLoading={statsLoading} color="emerald" />
        <StatCard label="Monthly Sales"   value={stats?.monthly_sales}   prefix="Rs " isLoading={statsLoading} color="blue" />
        <StatCard label="Staff"           value={stats?.staff_count}                  isLoading={statsLoading} color="indigo" />
        <StatCard label="Inventory Value" value={stats?.inventory_value} prefix="Rs " isLoading={statsLoading} color="violet" />
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Branch Information</h3>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {infoRows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <Icon size={14} className="text-zinc-400 flex-shrink-0" />
                <span className="text-xs text-zinc-500 dark:text-zinc-400 w-24 flex-shrink-0">{label}</span>
                <span className="text-sm text-zinc-800 dark:text-zinc-200 truncate">{value || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* Manager card */}
          {branch.manager_name && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Branch Manager</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: themeColor }}>
                  {branch.manager_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{branch.manager_name}</p>
                  {branch.manager_email && <p className="text-xs text-zinc-400">{branch.manager_email}</p>}
                  {branch.manager_phone && <p className="text-xs text-zinc-400">{branch.manager_phone}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Health + license */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Branch Health</p>
            <div className="flex items-center gap-4">
              <BranchHealthScore score={branch.health_score ?? 100} size={56} showLabel />
              <div className="space-y-1.5">
                {stats?.license_days_remaining != null && (
                  <div className={`flex items-center gap-1.5 text-xs ${stats.license_days_remaining < 30 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {stats.license_days_remaining < 30
                      ? <AlertTriangle size={12} />
                      : <CheckCircle2 size={12} />
                    }
                    License expires in {stats.license_days_remaining} days
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <AlertTriangle size={12} className="text-amber-500" />
                  {stats?.low_stock_count ?? 0} low stock items
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Clock size={12} className="text-orange-500" />
                  {stats?.expiry_count ?? 0} items expiring soon
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sales Tab ─────────────────────────────────────────────────────────────────
function SalesTab({ stats, isLoading }: { stats?: BranchStats; isLoading: boolean }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <StatCard label="Total Sales"    value={stats?.total_sales}    prefix="Rs " isLoading={isLoading} color="emerald" />
      <StatCard label="Monthly Sales"  value={stats?.monthly_sales}  prefix="Rs " isLoading={isLoading} color="blue" />
      <StatCard label="Daily Sales"    value={stats?.daily_sales}    prefix="Rs " isLoading={isLoading} color="indigo" />
      <StatCard label="Total Profit"   value={stats?.total_profit}   prefix="Rs " isLoading={isLoading} color="violet" />
      <StatCard label="Monthly Profit" value={stats?.monthly_profit} prefix="Rs " isLoading={isLoading} color="pink" />
    </div>
  );
}

// ── Inventory Tab ─────────────────────────────────────────────────────────────
function InventoryTab({ stats, isLoading }: { stats?: BranchStats; isLoading: boolean }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <StatCard label="Inventory Value" value={stats?.inventory_value} prefix="Rs " isLoading={isLoading} color="violet" />
      <StatCard label="Low Stock Items" value={stats?.low_stock_count}              isLoading={isLoading} color="amber" />
      <StatCard label="Expiring Soon"   value={stats?.expiry_count}                 isLoading={isLoading} color="red" />
    </div>
  );
}

// ── Staff Tab ─────────────────────────────────────────────────────────────────
function StaffTab({ branchId }: { branchId: string }) {
  const { data: staff, isLoading } = useBranchStaff(branchId);
  if (isLoading) return <div className="space-y-2">{Array.from({length:4}).map((_,i) => <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse"/>)}</div>;
  if (!staff?.length) return <p className="text-sm text-zinc-400 py-8 text-center">No staff assigned yet.</p>;
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {staff.map((s) => (
        <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-400">
              {(s.user?.full_name || s.user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{s.user?.full_name || s.user?.username || s.user_id}</p>
              {s.user?.email && <p className="text-xs text-zinc-400">{s.user.email}</p>}
            </div>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400">
            {STAFF_ROLE_LABELS[s.role as keyof typeof STAFF_ROLE_LABELS] || s.role}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Customers Tab ─────────────────────────────────────────────────────────────
function CustomersTab({ stats, isLoading }: { stats?: BranchStats; isLoading: boolean }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <StatCard label="Total Customers"    value={stats?.total_customers}     isLoading={isLoading} color="blue" />
      <StatCard label="Total Prescriptions" value={stats?.total_prescriptions} isLoading={isLoading} color="indigo" />
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ branch }: { branch: Branch }) {
  const rows = [
    ['Invoice Prefix', branch.invoice_prefix || '—'],
    ['Receipt Footer', branch.receipt_footer || '—'],
    ['Timezone',       branch.timezone || '—'],
    ['Currency',       branch.currency || '—'],
    ['Theme Color',    branch.theme_color || '—'],
  ];
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
        Operational Settings
      </div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Activity Tab ──────────────────────────────────────────────────────────────
function ActivityTab({ branch }: { branch: Branch }) {
  const events = [
    { label: 'Branch Created', date: branch.created_at, icon: CheckCircle2, color: 'text-emerald-600' },
    { label: 'Last Updated',   date: branch.updated_at,  icon: Edit,         color: 'text-blue-600' },
  ].filter((e) => e.date);
  return (
    <div className="space-y-3">
      {events.map((e) => {
        const Icon = e.icon;
        return (
          <div key={e.label} className="flex items-center gap-3 text-sm">
            <Icon size={16} className={e.color} />
            <span className="text-zinc-700 dark:text-zinc-300">{e.label}:</span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {e.date ? new Date(e.date).toLocaleString() : '—'}
            </span>
          </div>
        );
      })}
      <p className="text-xs text-zinc-400 mt-4">Full audit trail available in Audit Center.</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  branch: Branch;
  defaultTab?: string;
}

export function BranchDetailView({ branch, defaultTab = 'overview' }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { data: stats, isLoading: statsLoading } = useBranchStats(branch.id);
  const themeColor = branch.theme_color || '#6366f1';

  const tabContent: Record<string, React.ReactNode> = {
    overview:  <OverviewTab  branch={branch} stats={stats} statsLoading={statsLoading} />,
    sales:     <SalesTab     stats={stats} isLoading={statsLoading} />,
    inventory: <InventoryTab stats={stats} isLoading={statsLoading} />,
    staff:     <StaffTab     branchId={branch.id} />,
    customers: <CustomersTab stats={stats} isLoading={statsLoading} />,
    settings:  <SettingsTab  branch={branch} />,
    activity:  <ActivityTab  branch={branch} />,
  };

  return (
    <div className="space-y-6">
      {/* Branch header */}
      <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="h-2" style={{ background: themeColor }} />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0"
              style={{ background: themeColor }}
            >
              {branch.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{branch.name}</h1>
                <BranchStatusBadge status={branch.status} size="sm" />
                <BranchTypeBadge   type={branch.type}     size="sm" />
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">{branch.code}</p>
              {(branch.city || branch.province) && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
                  <MapPin size={12} />
                  {[branch.city, branch.province].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <BranchHealthScore score={branch.health_score ?? 100} size={52} showLabel />
              <button
                onClick={() => router.push(`/branches/${branch.id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                <Edit size={14} /> Edit
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: themeColor }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tabContent[activeTab]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
