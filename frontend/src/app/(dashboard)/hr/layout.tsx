'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore, useIsSuperAdmin } from '@/stores/auth-store';
import {
  LayoutDashboard, Users, Building2, Contact2,
  Clock, CalendarCheck, Palmtree, Wallet, Banknote, HandCoins, Settings2,
  Target, GraduationCap, CheckSquare, FolderOpen, Network
} from 'lucide-react';

const links = [
  { name: 'Dashboard',    href: '/hr',               icon: LayoutDashboard },
  { name: 'Employees',    href: '/hr/employees',      icon: Users },
  { name: 'Departments',  href: '/hr/departments',    icon: Building2 },
  { name: 'Designations', href: '/hr/designations',   icon: Contact2 },
  { name: 'Org Chart',    href: '/hr/org-chart',      icon: Network },
  { name: 'Shifts',       href: '/hr/shifts',         icon: Clock },
  { name: 'Attendance',   href: '/hr/attendance',     icon: CalendarCheck },
  { name: 'Leaves',       href: '/hr/leaves',         icon: Palmtree },
  { name: 'Advances',     href: '/hr/advances',       icon: HandCoins },
  { name: 'Salary Setup', href: '/hr/payroll/setup',  icon: Wallet },
  { name: 'Payroll Rules', href: '/hr/payroll-settings', icon: Settings2 },
  { name: 'Payroll',      href: '/hr/payroll',        icon: Banknote },
  { name: 'Performance',  href: '/hr/performance',    icon: Target },
  { name: 'Training',     href: '/hr/training',       icon: GraduationCap },
  { name: 'Tasks',        href: '/hr/tasks',          icon: CheckSquare },
  { name: 'Documents',    href: '/hr/documents',      icon: FolderOpen },
];

export default function HRLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isSuperAdmin = useIsSuperAdmin();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  // Self-service-only staff (e.g. a Cashier with hr:self but not hr:view) should
  // NOT see the full admin HR hero + tab bar — just their own self-service page.
  const isHrAdmin = isSuperAdmin || hasPermission('hr:view');

  if (!isHrAdmin) {
    return <div className="flex h-full flex-col gap-0">{children}</div>;
  }

  return (
    <div className="flex h-full flex-col gap-0">
      {/* Hero Header */}
      <div className="brand-surface-br brand-shadow relative overflow-hidden rounded-2xl px-6 py-6 mb-4 print:hidden">
        <div className="pointer-events-none absolute -top-8 -right-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30 shadow-inner">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">HR &amp; Payroll Center</h1>
            <p className="text-white/85 text-sm mt-0.5">
              Staff directory · Attendance &amp; leaves · Automated payroll runs
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="print:hidden overflow-x-auto scrollbar-none mb-4">
        <nav className="flex gap-1 min-w-max rounded-xl bg-gray-100 dark:bg-zinc-900 p-1 border border-gray-200 dark:border-zinc-800">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/hr' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                style={isActive ? { color: 'var(--brand)', boxShadow: '0 0 0 1px var(--brand-soft)' } : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white dark:bg-zinc-800 shadow-sm'
                    : 'text-gray-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-white/70 dark:hover:bg-zinc-800/70'
                }`}
              >
                <Icon size={13} />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
