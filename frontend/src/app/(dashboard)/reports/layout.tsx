"use client";

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, TrendingUp, Package, Users, Activity, FileText, 
  PieChart, ChevronRight, ChevronDown, ShoppingCart, Target,
  Briefcase, Boxes, Box, Calculator
} from 'lucide-react';

const REPORT_CATEGORIES = [
  { name: 'Dashboard Hub', href: '/reports', icon: PieChart, exact: true },
  { name: 'Sales Reports', href: '/reports/sales', icon: TrendingUp },
  { name: 'Purchase Reports', href: '/reports/purchases', icon: ShoppingCart },
  { name: 'Inventory Reports', href: '/reports/inventory', icon: Package },
  { name: 'Expiry Reports', href: '/reports/expiry', icon: Activity },
  { name: 'Low Stock Reports', href: '/reports/low-stock', icon: Target },
  { name: 'Financial Reports', href: '/reports/financial', icon: Calculator },
  { name: 'Customer Reports', href: '/reports/customers', icon: Users },
  { name: 'Supplier Reports', href: '/reports/suppliers', icon: Briefcase },
  { name: 'Branch Reports', href: '/reports/branch', icon: Boxes },
  { name: 'Warehouse Reports', href: '/reports/warehouse', icon: Box },
];

export default function ReportsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      {/* Secondary Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-y-auto">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Reporting</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Analytics & Intelligence</p>
        </div>
        <nav className="p-3 space-y-1">
          {REPORT_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = category.exact ? pathname === category.href : pathname.startsWith(category.href);
            return (
              <Link
                key={category.name}
                href={category.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400'} />
                {category.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950 p-6 md:p-8">
        {children}
      </div>
    </div>
  );
}
