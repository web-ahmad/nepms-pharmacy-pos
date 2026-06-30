import { ReactNode } from 'react';
import Link from 'next/link';
import { 
  Settings, 
  Blocks,
  Building2,
  Receipt,
  MonitorSmartphone,
  ShieldCheck,
  Bell
} from 'lucide-react';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const links = [
    { name: 'General', href: '/settings', icon: Settings },
    { name: 'Modules', href: '/settings/modules', icon: Blocks },
    { name: 'Branch & Company', href: '/settings/company', icon: Building2 },
    { name: 'Tax & Invoice', href: '/settings/invoice', icon: Receipt },
    { name: 'POS & Inventory', href: '/settings/pos', icon: MonitorSmartphone },
    { name: 'Compliance', href: '/settings/compliance', icon: ShieldCheck },
    { name: 'Notifications', href: '/settings/notifications', icon: Bell },
  ];

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">System Settings</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Manage global configuration, compliance, and module activation.</p>
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
