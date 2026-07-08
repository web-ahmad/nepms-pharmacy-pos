'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListTree,
  FileSignature,
  BookOpen,
  Scale,
  TrendingUp,
  Landmark,
  Wallet,
  CreditCard,
  Receipt,
} from 'lucide-react';

const links = [
  { name: 'Dashboard',         href: '/accounts',               icon: LayoutDashboard },
  { name: 'Chart of Accounts', href: '/accounts/chart',         icon: ListTree },
  { name: 'Journal Entries',   href: '/accounts/journals',      icon: FileSignature },
  { name: 'General Ledger',    href: '/accounts/ledger',        icon: BookOpen },
  { name: 'Trial Balance',     href: '/accounts/trial-balance', icon: Scale },
  { name: 'Profit & Loss',     href: '/accounts/profit-loss',   icon: TrendingUp },
  { name: 'Balance Sheet',     href: '/accounts/balance-sheet', icon: Landmark },
  { name: 'Cash Book',         href: '/accounts/cash-book',     icon: Wallet },
  { name: 'Bank Book',         href: '/accounts/bank-book',     icon: CreditCard },
  { name: 'Receivables Book',  href: '/accounts/receivables-book', icon: Receipt },
  { name: 'Payables Book',     href: '/accounts/payables-book', icon: Receipt },
  { name: 'Expenses',          href: '/accounts/expenses',      icon: Receipt },
];

export default function AccountsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-0">
      {/* ── Module Header ───────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 px-6 py-6 mb-4 shadow-lg print:hidden">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30 shadow-inner">
            <Landmark className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Financial Accounting</h1>
            <p className="text-emerald-100 text-sm mt-0.5">
              Strict double-entry general ledger · Trial balance · Financial statements
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────────── */}
      <div className="print:hidden overflow-x-auto scrollbar-none mb-4">
        <nav className="flex gap-1 min-w-max rounded-xl bg-gray-100 dark:bg-zinc-900 p-1 border border-gray-200 dark:border-zinc-800">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-200 dark:ring-emerald-800'
                    : 'text-gray-500 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-white/70 dark:hover:bg-zinc-800/70'
                }`}
              >
                <Icon size={13} />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Page Content ────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}
