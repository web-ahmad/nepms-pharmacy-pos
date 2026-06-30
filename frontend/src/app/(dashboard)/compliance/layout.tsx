import { ReactNode } from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, 
  ActivitySquare,
  Clock,
  History
} from 'lucide-react';

export default function ComplianceLayout({ children }: { children: ReactNode }) {
  const links = [
    { name: 'Audit Logs', href: '/compliance/audit-logs', icon: ActivitySquare },
    { name: 'Sensitive Actions', href: '/compliance/sensitive-actions', icon: ShieldAlert },
    { name: 'Login History', href: '/compliance/login-history', icon: History },
    { name: 'Data Retention', href: '/compliance/retention', icon: Clock },
  ];

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Compliance Center</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Track audit logs, secure endpoints, and enforce data retention rules.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
