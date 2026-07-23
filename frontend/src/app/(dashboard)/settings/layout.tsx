"use client";

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Blocks, Building2, Receipt, Percent,
  MonitorSmartphone, GitBranch, Boxes, Heart, Users2,
  Stethoscope, SlidersHorizontal,
} from 'lucide-react';

type NavItem = { name: string; href: string; icon: any; exact?: boolean };

const NAV_ITEMS: NavItem[] = [
  { name: 'General', href: '/settings', icon: Settings, exact: true },
  { name: 'Company & Branch', href: '/settings/company', icon: Building2 },
  { name: 'Tax', href: '/settings/tax', icon: Percent },
  { name: 'Invoice & Receipt', href: '/settings/invoice', icon: Receipt },
  { name: 'POS', href: '/settings/pos', icon: MonitorSmartphone },
  { name: 'Branches', href: '/settings/branches', icon: GitBranch },
  { name: 'Inventory', href: '/settings/inventory', icon: Boxes },
  { name: 'CRM & Loyalty', href: '/settings/crm', icon: Heart },
  { name: 'HR & Payroll', href: '/settings/hr', icon: Users2 },
  { name: 'Prescriptions', href: '/settings/prescriptions', icon: Stethoscope },
  { name: 'Modules', href: '/settings/modules', icon: Blocks },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30">
          <SlidersHorizontal className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">System Settings</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage global configuration, compliance, and module activation.</p>
        </div>
      </div>

      {/* Top nav */}
      <div className="flex flex-wrap gap-1.5 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-50 to-blue-50/50 text-blue-700 shadow-sm ring-1 ring-blue-100 dark:from-blue-500/10 dark:to-blue-500/5 dark:text-blue-400 dark:ring-blue-900/30'
                  : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-50'
              }`}
            >
              <Icon
                className={`h-4 w-4 flex-shrink-0 transition-colors ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300'
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
