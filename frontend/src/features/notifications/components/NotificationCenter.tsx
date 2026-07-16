import { Notification, useMarkNotificationRead } from '../services/notifications.api';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Bell, AlertCircle, Info, FileText, CheckCircle2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NotificationCenterProps {
  data: Notification[];
  isLoading: boolean;
}

export default function NotificationCenter({ data, isLoading }: NotificationCenterProps) {
  const markRead = useMarkNotificationRead();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="h-6 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="text-center text-zinc-500">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="font-medium">You're all caught up!</p>
        </div>
      </div>
    );
  }

  const getIcon = (category: string) => {
    switch (category) {
      case 'Inventory': return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'Payroll': return <FileText className="h-5 w-5 text-indigo-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {data.map((notif) => (
        <div 
          key={notif.id} 
          className={`flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
            notif.is_read 
              ? 'border-zinc-200 bg-white opacity-70 hover:opacity-100 dark:border-zinc-800 dark:bg-zinc-950' 
              : 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-900/10 dark:hover:bg-indigo-900/20'
          }`}
          onClick={() => {
            if (!notif.is_read) markRead.mutate(notif.id);
            if (notif.link) router.push(notif.link);
          }}
        >
          <div className="mt-1">{getIcon(notif.category)}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className={`text-sm font-semibold flex items-center gap-2 ${notif.is_read ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-900 dark:text-zinc-100'}`}>
                {notif.title}
                {notif.link && <ExternalLink className="h-3 w-3 text-zinc-400" />}
              </h4>
              <span className="text-xs text-zinc-500">{format(new Date(notif.created_at), 'MMM dd, HH:mm')}</span>
            </div>
            <p className={`mt-1 text-sm ${notif.is_read ? 'text-zinc-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
              {notif.message}
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs bg-transparent">
                {notif.category}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
