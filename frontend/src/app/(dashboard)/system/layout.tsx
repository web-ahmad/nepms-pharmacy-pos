import { ReactNode } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  DatabaseBackup,
  ScanText
} from 'lucide-react';

export default function SystemLayout({ children }: { children: ReactNode }) {
  const links = [
    { name: 'System Health', href: '/system/health', icon: Activity },
    { name: 'Backup Management', href: '/system/backups', icon: DatabaseBackup },
    { name: 'OCR Processing Queue', href: '/system/ocr-queue', icon: ScanText },
  ];

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">System Administration</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Monitor health, execute backups, and track background jobs.</p>
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
