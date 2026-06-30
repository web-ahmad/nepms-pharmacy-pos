"use client";

import Link from 'next/link';
import { ShieldAlert, Activity, PackageSearch } from 'lucide-react';

export default function AuditHubPage() {
  const audits = [
    { name: 'General Activity', href: '/audit/activity', icon: Activity, desc: 'Track comprehensive system actions including creation, updates, and deletions.' },
    { name: 'Security Log', href: '/audit/security', icon: ShieldAlert, desc: 'Monitor failed logins, role modifications, and permission escalations.' },
    { name: 'Inventory Audit', href: '/audit/inventory', icon: PackageSearch, desc: 'Track precise stock adjustments, batch changes, and cost modifications.' },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {audits.map((audit) => {
        const Icon = audit.icon;
        return (
          <Link
            key={audit.name}
            href={audit.href}
            className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white dark:bg-zinc-900 dark:text-zinc-100 dark:group-hover:bg-zinc-100 dark:group-hover:text-zinc-900">
              <Icon size={24} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{audit.name}</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{audit.desc}</p>
          </Link>
        );
      })}
    </div>
  );
}
