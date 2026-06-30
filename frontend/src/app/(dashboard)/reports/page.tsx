"use client";

import Link from 'next/link';
import { BarChart3, TrendingUp, Package, Users, Activity, FileText } from 'lucide-react';

export default function ReportsHubPage() {
  const reports = [
    { name: 'Sales Reports', href: '/reports/sales', icon: TrendingUp, desc: 'Daily, weekly, custom sales trends, and breakdown by medicine or category.' },
    { name: 'Purchase Reports', href: '/reports/purchases', icon: BarChart3, desc: 'Supplier performance, outstanding payables, and historical purchase summaries.' },
    { name: 'Inventory Reports', href: '/reports/inventory', icon: Package, desc: 'Real-time stock valuation, low stock alerts, and expiry tracking.' },
    { name: 'Customer Reports', href: '/reports/customers', icon: Users, desc: 'Loyalty point liabilities, outstanding balances, and customer ledger summaries.' },
    { name: 'Prescription Reports', href: '/reports/prescriptions', icon: Activity, desc: 'Prescription volume by doctor, active vs expired counts.' },
    { name: 'Financial Reports', href: '/reports/financial', icon: FileText, desc: 'Profit and Loss statements, revenue trends, and gross margin analysis.' },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {reports.map((report) => {
        const Icon = report.icon;
        return (
          <Link
            key={report.name}
            href={report.href}
            className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white dark:bg-zinc-900 dark:text-zinc-100 dark:group-hover:bg-zinc-100 dark:group-hover:text-zinc-900">
              <Icon size={24} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{report.name}</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{report.desc}</p>
          </Link>
        );
      })}
    </div>
  );
}
