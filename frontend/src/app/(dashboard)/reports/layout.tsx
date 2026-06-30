import { ReactNode } from 'react';
import Link from 'next/link';
import { BarChart3, TrendingUp, Package, Users, Activity, FileText, PieChart } from 'lucide-react';

export default function ReportsLayout({ children }: { children: ReactNode }) {
  const links = [
    { name: 'Reports Hub', href: '/reports', icon: PieChart },
    { name: 'Sales', href: '/reports/sales', icon: TrendingUp },
    { name: 'Purchases', href: '/reports/purchases', icon: BarChart3 },
    { name: 'Inventory', href: '/reports/inventory', icon: Package },
    { name: 'Customers', href: '/reports/customers', icon: Users },
    { name: 'Prescriptions', href: '/reports/prescriptions', icon: Activity },
    { name: 'Financial', href: '/reports/financial', icon: FileText },
  ];

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Report Center</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Enterprise Reporting and Business Intelligence Suite.</p>
      </div>

      <div className="flex space-x-1 overflow-x-auto border-b border-zinc-200 pb-px dark:border-zinc-800">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className="flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-medium text-zinc-500 border-b-2 border-transparent hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-300"
            >
              <Icon size={16} />
              {link.name}
            </Link>
          );
        })}
      </div>

      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
