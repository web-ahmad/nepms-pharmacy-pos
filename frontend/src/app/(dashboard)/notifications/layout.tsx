import { ReactNode } from 'react';

export default function NotificationsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Notification Center</h1>
        <p className="text-zinc-500 dark:text-zinc-400">View and manage all system alerts.</p>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
