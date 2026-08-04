'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Activity, DatabaseBackup, ScanText } from 'lucide-react';

const LINKS = [
  { name: 'Control Center', href: '/system', icon: LayoutDashboard },
  { name: 'Health', href: '/system/health', icon: Activity },
  { name: 'Backups', href: '/system/backups', icon: DatabaseBackup },
  { name: 'OCR Queue', href: '/system/ocr-queue', icon: ScanText },
];

export default function SystemLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col space-y-1"
      >
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          System Administration
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Monitor health, run backups and automate routine maintenance.
        </p>
      </motion.div>

      <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 [scrollbar-width:none] dark:border-zinc-800 [&::-webkit-scrollbar]:hidden">
        {LINKS.map((link) => {
          const Icon = link.icon;
          // Exact match for the index route so it doesn't light up on children.
          const active = link.href === '/system' ? pathname === '/system' : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              <Icon size={15} />
              {link.name}
              {active && (
                <motion.span
                  layoutId="system-tab-underline"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-indigo-500"
                />
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex-1">{children}</div>
    </div>
  );
}
