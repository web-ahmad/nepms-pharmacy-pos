'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore, useIsSuperAdmin } from '@/stores/auth-store';
import { useModules } from '@/lib/modules';
import { useLowStockAlerts } from '@/features/inventory/services/alerts.api';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Truck,
  Activity,
  Package,
  PackagePlus,
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
 * NAV_ITEMS maps each sidebar link to:
 * - permission: RBAC check
 * - moduleKey: the system_modules key that must be enabled (null = always visible)
 */
export const NAV_ITEMS = [
  // ── Core ─────────────────────────────────────────────────────────────────────
  { label: 'Dashboard',       href: '/',                          icon: LayoutDashboard, permission: 'dashboard:view',           moduleKey: 'dashboard' },
  // ── POS & Sales ──────────────────────────────────────────────────────────────
  { label: 'POS Terminal',    href: '/pos',                       icon: ShoppingCart,    permission: 'pos:create',              moduleKey: 'pos' },
  { label: 'Cashier Portal',  href: '/pos/cashier',               icon: Wallet,          permission: 'cashier:view',            moduleKey: 'pos' },
  { label: 'Sales History',   href: '/sales',                     icon: FileText,        permission: 'sales:view',              moduleKey: 'pos' },
  // ── Inventory ─────────────────────────────────────────────────────────────────
  { label: 'Add Medicine',    href: '/inventory/medicines/add',   icon: PlusCircle,      permission: 'medicines:create',        moduleKey: 'inventory' },
  { label: 'Inventory Core',  href: '/inventory',                 icon: Package,         permission: 'inventory:view',          moduleKey: 'inventory' },
  { label: 'Low Stock Alerts',href: '/inventory/low-stock',       icon: AlertTriangle,   permission: 'inventory:view',          moduleKey: 'inventory' },
  { label: 'Physical Audit',  href: '/inventory/audit',           icon: ClipboardList,   permission: 'physical_audit:view',     moduleKey: 'inventory' },
  // ── Purchase ──────────────────────────────────────────────────────────────────
  { label: 'Purchases',       href: '/purchase',                  icon: ShoppingBag,     permission: 'purchase:view',           moduleKey: 'purchase_orders' },
  // ── Finance ───────────────────────────────────────────────────────────────────
  { label: 'Expenses',        href: '/expenses',                  icon: ClipboardList,   permission: 'expenses:view',           moduleKey: 'journals' },
  { label: 'Accounting',      href: '/accounts',                  icon: DollarSign,      permission: 'accounting:view',         moduleKey: 'journals' },
  // ── CRM ───────────────────────────────────────────────────────────────────────
  { label: 'Customers',       href: '/customers',                 icon: Users,           permission: 'customers:view',          moduleKey: 'customers' },
  { label: 'Marketing',       href: '/marketing',                 icon: Megaphone,       permission: 'marketing:view',          moduleKey: 'customers' },
  // ── Clinical ──────────────────────────────────────────────────────────────────
  { label: 'Prescriptions',   href: '/prescriptions',             icon: Stethoscope,     permission: 'prescriptions:view',      moduleKey: 'digital_rx' },
  // ── Analytics & Reports ───────────────────────────────────────────────────────
  { label: 'Analytics',       href: '/analytics',                 icon: Activity,        permission: 'analytics:view',          moduleKey: 'analytics' },
  { label: 'Reports',         href: '/reports',                   icon: PieChart,        permission: 'reports:view',            moduleKey: 'reports' },
  // ── HR ────────────────────────────────────────────────────────────────────────
  { label: 'HR & Payroll',    href: '/hr',                        icon: UserCog,         permission: 'hr:view',                 moduleKey: 'employees' },
  // ── Org ───────────────────────────────────────────────────────────────────────
  { label: 'Branches',        href: '/branches',                  icon: Building2,       permission: 'branches:view',           moduleKey: null },
  // ── Compliance & Audit ────────────────────────────────────────────────────────
  { label: 'Compliance',      href: '/compliance',                icon: ClipboardList,   permission: 'compliance:view',         moduleKey: null },
  { label: 'Audit Center',    href: '/audit',                     icon: ShieldCheck,     permission: 'audit:view',              moduleKey: null },
  // ── System ────────────────────────────────────────────────────────────────────
  { label: 'Notifications',   href: '/notifications',             icon: Bell,            permission: 'notifications:view',      moduleKey: null },
  { label: 'System',          href: '/system',                    icon: Monitor,         permission: 'system_health:view',      moduleKey: null },
  { label: 'Users & Roles',   href: '/users',                     icon: Users,           permission: 'users:view',              moduleKey: null },
  { label: 'Roles',           href: '/roles',                     icon: ShieldAlert,     permission: 'roles:view',              moduleKey: null },
  { label: 'Settings',        href: '/settings',                  icon: Settings,        permission: 'settings:view',           moduleKey: null },
];


export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const { user } = useAuthStore();

  const { data: lowStockData } = useLowStockAlerts({ skip: 0, limit: 1 });
  const lowStockCount = lowStockData?.total || 0;

  const isSuperAdmin = useIsSuperAdmin();
  const hasPermission = useAuthStore((state) => state.hasPermission);

  const visibleItems = NAV_ITEMS.filter((item) => {
    // 1. RBAC check using the helper
    if (item.permission && !isSuperAdmin && !hasPermission(item.permission)) {
      return false;
    }
    return true;
  });

  return (
    <div
      className={`relative flex flex-col border-r border-zinc-200 bg-white transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950 ${isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800">
        {!isCollapsed && <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">NEPMS</span>}
        {isCollapsed && <span className="mx-auto text-xl font-bold text-blue-600">N</span>}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-5 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between rounded-md px-2 py-2 text-sm font-medium transition-colors ${isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50'
                  }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="flex items-center">
                  <item.icon className={`flex-shrink-0 ${isCollapsed ? 'mx-auto h-6 w-6' : 'mr-3 h-5 w-5'}`} aria-hidden="true" />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
                {!isCollapsed && item.href === '/inventory/low-stock' && lowStockCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                    {lowStockCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {!isCollapsed && (
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 truncate">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{user?.username}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-zinc-500 truncate">{user?.role ?? 'User'}</p>
                  {user?.hierarchy_level && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      L{user.hierarchy_level}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
