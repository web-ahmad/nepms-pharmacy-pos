"use client";

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3, TrendingUp, Package, Users, Calculator,
  PieChart, ShoppingCart, Briefcase, UserCheck, ShieldAlert,
  Wand2, ChevronDown, ChevronRight, Shield, HardHat,
  Banknote, Activity
} from 'lucide-react';

type NavItem = {
  name: string;
  href: string;
  icon: any;
  exact?: boolean;
  badge?: string;
  badgeColor?: string;
};

type NavGroup = {
  heading: string;
  items: NavItem[];
  accent?: string;
};

const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Overview',
    accent: 'blue',
    items: [
      { name: 'Analytics Hub', href: '/reports', icon: Activity, exact: true },
    ],
  },
  {
    heading: 'Core Reports',
    accent: 'emerald',
    items: [
      { name: 'Sales', href: '/reports/sales', icon: TrendingUp, badge: '15' },
      { name: 'Inventory', href: '/reports/inventory', icon: Package, badge: '12' },
      { name: 'Purchases', href: '/reports/purchases', icon: ShoppingCart, badge: '6' },
      { name: 'Financial', href: '/reports/financial', icon: Calculator, badge: '7' },
    ],
  },
  {
    heading: 'People & CRM',
    accent: 'violet',
    items: [
      { name: 'Customers', href: '/reports/customers', icon: Users, badge: '6' },
      { name: 'Suppliers', href: '/reports/suppliers', icon: Briefcase, badge: '9' },
      { name: 'Staff Performance', href: '/reports/staff', icon: UserCheck, badge: '3' },
    ],
  },
  {
    heading: 'HR & Payroll',
    accent: 'amber',
    items: [
      { name: 'HR Reports', href: '/reports/hr', icon: HardHat, badge: '6', badgeColor: 'amber' },
    ],
  },
  {
    heading: 'Audit & Security',
    accent: 'red',
    items: [
      { name: 'Audit Trail', href: '/reports/audit', icon: Shield, badge: '6', badgeColor: 'red' },
      { name: 'Controlled Substances', href: '/reports/controlled', icon: ShieldAlert },
    ],
  },
  {
    heading: 'Advanced',
    accent: 'blue',
    items: [
      { name: 'Custom Report Builder', href: '/reports/custom', icon: Wand2, badge: 'PRO', badgeColor: 'blue' },
    ],
  },
];

const ACCENT_MAP: Record<string, string> = {
  blue: 'text-blue-500',
  emerald: 'text-emerald-500',
  violet: 'text-violet-500',
  amber: 'text-amber-500',
  red: 'text-red-500',
};

const BADGE_COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function NavSection({ group, pathname }: { group: NavGroup; pathname: string }) {
  const hasActive = group.items.some(item =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)
  );
  const [open, setOpen] = useState(hasActive || group.heading === 'Overview' || group.heading === 'Core Reports');
  const accentClass = ACCENT_MAP[group.accent || 'blue'];

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${accentClass} opacity-60`} style={{ backgroundColor: 'currentColor' }} />
          {group.heading}
        </div>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>

      {open && (
        <div className="space-y-0.5 pb-1">
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const badgeCol = item.badgeColor || group.accent || 'blue';
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-50 to-blue-50/50 text-blue-700 shadow-sm ring-1 ring-blue-100 dark:from-blue-500/10 dark:to-blue-500/5 dark:text-blue-400 dark:ring-blue-900/30'
                    : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-50'
                }`}
              >
                <Icon
                  className={`h-[15px] w-[15px] flex-shrink-0 transition-colors ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300'
                  }`}
                />
                <span className="flex-1 truncate">{item.name}</span>
                {item.badge && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${BADGE_COLOR_MAP[badgeCol]}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ReportsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-950">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
        {/* Sidebar Header */}
        <div className="px-4 py-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30">
              <BarChart3 className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Reports Center</h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-500">71 reports available</p>
            </div>
          </div>
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
          {NAV_GROUPS.map(group => (
            <NavSection key={group.heading} group={group} pathname={pathname} />
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-zinc-100 dark:border-zinc-800/80 px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-500">Real-time data</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-zinc-50/30 dark:bg-zinc-950 p-6 md:p-8 min-w-0">
        {children}
      </div>
    </div>
  );
}
