'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore, useIsSuperAdmin } from '@/stores/auth-store';
import { useModules } from '@/lib/modules';
import { useLowStockAlerts } from '@/features/inventory/services/alerts.api';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  Package,
  ShoppingBag,
  FileText,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  UserCog,
  Bell,
  Monitor,
  ClipboardList,
  Stethoscope,
  Wallet,
  PlusCircle,
  Building2,
  Megaphone,
} from 'lucide-react';

interface SidebarState {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      toggleSidebar: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
    }),
    { name: 'nepms-sidebar-state' }
  )
);

/**
 * Colorful icon-chip palette. Each `color` key maps to fully-static Tailwind
 * classes (can't be interpolated at runtime) for the resting icon chip.
 * When a link is active, the chip flips to a translucent-white treatment.
 */
type IconColor =
  | 'sky' | 'emerald' | 'teal' | 'blue' | 'green' | 'indigo' | 'amber' | 'violet'
  | 'orange' | 'rose' | 'cyan' | 'pink' | 'fuchsia' | 'purple' | 'slate' | 'lime'
  | 'yellow' | 'zinc' | 'red';

const CHIP: Record<IconColor, string> = {
  sky:     'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  teal:    'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
  blue:    'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  green:   'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400',
  indigo:  'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
  amber:   'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  violet:  'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
  orange:  'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
  rose:    'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  cyan:    'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400',
  pink:    'bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400',
  fuchsia: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400',
  purple:  'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
  slate:   'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
  lime:    'bg-lime-50 text-lime-600 dark:bg-lime-500/10 dark:text-lime-400',
  yellow:  'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400',
  zinc:    'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/10 dark:text-zinc-400',
  red:     'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
};

/**
 * NAV_ITEMS maps each sidebar link to:
 * - permission: RBAC check
 * - moduleKey: the system_modules key that must be enabled (null = always visible)
 * - color:      colorful icon-chip accent
 */
export const NAV_ITEMS = [
  // ── Core ─────────────────────────────────────────────────────────────────────
  { label: 'Dashboard',       href: '/',                          icon: LayoutDashboard, permission: 'dashboard:view',           moduleKey: 'dashboard',      color: 'sky' as IconColor },
  // ── POS & Sales ──────────────────────────────────────────────────────────────
  { label: 'POS Terminal',    href: '/pos',                       icon: ShoppingCart,    permission: 'pos:create',              moduleKey: 'pos',            color: 'emerald' as IconColor },
  { label: 'Cashier Portal',  href: '/pos/cashier',               icon: Wallet,          permission: 'cashier:view',            moduleKey: 'cashier',        color: 'teal' as IconColor },
  { label: 'Sales History',   href: '/sales',                     icon: FileText,        permission: 'sales:view',              moduleKey: 'sales',          color: 'blue' as IconColor },
  // ── Inventory ─────────────────────────────────────────────────────────────────
  { label: 'Add Medicine',    href: '/inventory/medicines/add',   icon: PlusCircle,      permission: 'medicines:create',        moduleKey: 'add_medicine',   color: 'green' as IconColor },
  { label: 'Inventory Core',  href: '/inventory',                 icon: Package,         permission: 'inventory:view',          moduleKey: 'inventory',      color: 'indigo' as IconColor },
  { label: 'Low Stock Alerts',href: '/inventory/low-stock',       icon: AlertTriangle,   permission: 'inventory:view',          moduleKey: 'low_stock',      color: 'amber' as IconColor },
  { label: 'Physical Audit',  href: '/inventory/audit',           icon: ClipboardList,   permission: 'physical_audit:view',     moduleKey: 'physical_audit', color: 'violet' as IconColor },
  // ── Purchase ──────────────────────────────────────────────────────────────────
  { label: 'Purchases',       href: '/purchase',                  icon: ShoppingBag,     permission: 'purchase:view',           moduleKey: 'purchases',      color: 'orange' as IconColor },
  // ── Finance ───────────────────────────────────────────────────────────────────
  { label: 'Expenses',        href: '/expenses',                  icon: ClipboardList,   permission: 'expenses:view',           moduleKey: 'expenses',       color: 'rose' as IconColor },
  { label: 'Accounting',      href: '/accounts',                  icon: DollarSign,      permission: 'accounts:view',           moduleKey: 'accounting',     color: 'emerald' as IconColor },
  // ── CRM ───────────────────────────────────────────────────────────────────────
  { label: 'Customers',       href: '/customers',                 icon: Users,           permission: 'customers:view',          moduleKey: 'customers',      color: 'cyan' as IconColor },
  { label: 'Marketing',       href: '/marketing',                 icon: Megaphone,       permission: 'marketing:view',          moduleKey: 'marketing',      color: 'pink' as IconColor },
  // ── Clinical ──────────────────────────────────────────────────────────────────
  { label: 'Prescriptions',   href: '/prescriptions',             icon: Stethoscope,     permission: 'prescriptions:view',      moduleKey: 'prescriptions',  color: 'fuchsia' as IconColor },
  // ── Analytics & Reports ───────────────────────────────────────────────────────
  { label: 'Analytics',       href: '/analytics',                 icon: Activity,        permission: 'analytics:view',          moduleKey: 'analytics',      color: 'purple' as IconColor },
  { label: 'Reports',         href: '/reports',                   icon: PieChart,        permission: 'reports:view',            moduleKey: 'reports',        color: 'blue' as IconColor },
  // ── HR ────────────────────────────────────────────────────────────────────────
  { label: 'HR & Payroll',    href: '/hr',                        icon: UserCog,         permission: 'hr:view',                 moduleKey: 'hr',             color: 'teal' as IconColor },
  // ── Org ───────────────────────────────────────────────────────────────────────
  { label: 'Branches',        href: '/branches',                  icon: Building2,       permission: 'branches:view',           moduleKey: null,             color: 'slate' as IconColor },
  // ── Compliance & Audit ────────────────────────────────────────────────────────
  { label: 'Compliance',      href: '/compliance',                icon: ClipboardList,   permission: 'compliance:view',         moduleKey: 'compliance',     color: 'lime' as IconColor },
  { label: 'Audit Center',    href: '/audit',                     icon: ShieldCheck,     permission: 'audit:view',              moduleKey: 'audit_center',   color: 'green' as IconColor },
  // ── System ────────────────────────────────────────────────────────────────────
  { label: 'Notifications',   href: '/notifications',             icon: Bell,            permission: 'notifications:view',      moduleKey: 'notifications',  color: 'yellow' as IconColor },
  { label: 'System',          href: '/system',                    icon: Monitor,         permission: 'system_health:view',      moduleKey: null,             color: 'zinc' as IconColor },
  { label: 'Users & Roles',   href: '/users',                     icon: Users,           permission: 'users:view',              moduleKey: 'users',          color: 'indigo' as IconColor },
  { label: 'Roles',           href: '/roles',                     icon: ShieldAlert,     permission: 'roles:view',              moduleKey: 'roles',          color: 'red' as IconColor },
  { label: 'Settings',        href: '/settings',                  icon: Settings,        permission: 'settings:view',           moduleKey: null,             color: 'zinc' as IconColor },
];


export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const { user } = useAuthStore();

  const { data: lowStockData } = useLowStockAlerts({ skip: 0, limit: 1 });
  const lowStockCount = lowStockData?.total || 0;

  const isSuperAdmin = useIsSuperAdmin();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const { isModuleEnabled } = useModules();

  const visibleItems = NAV_ITEMS.filter((item) => {
    // 1. RBAC check using the helper
    if (item.permission && !isSuperAdmin && !hasPermission(item.permission)) {
      return false;
    }
    // 2. Module gate: if this link belongs to a module that the tenant has
    // disabled in Settings → Modules, hide it immediately.
    if (item.moduleKey && !isModuleEnabled(item.moduleKey)) {
      return false;
    }
    return true;
  });

  return (
    <div
      className={`relative z-20 flex flex-col border-r border-zinc-200 bg-white shadow-[2px_0_16px_-8px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[2px_0_16px_-8px_rgba(0,0,0,0.6)] ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* ── Brand header ──────────────────────────────────────────────────── */}
      <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-4 dark:border-zinc-800">
        <div className="brand-surface-br brand-shadow flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
          <span className="text-base font-black text-white">N</span>
        </div>
        {!isCollapsed && (
          <div className="flex flex-col leading-none">
            <span className="brand-gradient-text text-lg font-extrabold tracking-tight">
              NEPMS
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Pharmacy ERP
            </span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-5 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-md transition-transform hover:scale-110 active:scale-95 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-4 [scrollbar-width:thin]">
        <motion.nav
          className="space-y-1 px-2.5"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.025 } } }}
        >
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <motion.div
                key={item.href}
                variants={{
                  hidden: { opacity: 0, x: -12 },
                  show: { opacity: 1, x: 0, transition: { ease: [0.16, 1, 0.3, 1], duration: 0.35 } },
                }}
              >
                <Link
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={`group relative flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition-all duration-200 ${
                    isActive
                      ? 'brand-surface brand-shadow font-bold'
                      : 'font-medium text-zinc-600 hover:-translate-y-px hover:bg-zinc-50 hover:text-zinc-900 hover:shadow-sm dark:text-zinc-300 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                >
                  {/* Active accent bar */}
                  {isActive && !isCollapsed && (
                    <motion.span
                      layoutId="sidebar-active-bar"
                      className="absolute -left-2.5 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-white/70"
                      aria-hidden="true"
                    />
                  )}

                  {/* Colorful icon chip */}
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 group-active:scale-90 ${
                      isActive
                        ? 'bg-white/20 text-white shadow-inner'
                        : `${CHIP[item.color]} group-hover:scale-105`
                    }`}
                  >
                    <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>

                  {!isCollapsed && <span className="truncate">{item.label}</span>}

                  {/* Low-stock badge */}
                  {!isCollapsed && item.href === '/inventory/low-stock' && lowStockCount > 0 && (
                    <span
                      className={`ml-auto inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none shadow-sm ${
                        isActive ? 'bg-white/25 text-white' : 'bg-red-600 text-white'
                      }`}
                    >
                      {lowStockCount}
                    </span>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </motion.nav>
      </div>

      {/* ── User footer ───────────────────────────────────────────────────── */}
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <div className={`flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="brand-surface-br brand-shadow flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
            {user?.username?.[0]?.toUpperCase() ?? 'U'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{user?.username}</p>
              <div className="flex items-center gap-2">
                <p className="truncate text-xs text-zinc-500">{user?.role ?? 'User'}</p>
                {user?.hierarchy_level && (
                  <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold" style={{ color: 'var(--brand)', backgroundColor: 'var(--brand-soft)' }}>
                    L{user.hierarchy_level}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
