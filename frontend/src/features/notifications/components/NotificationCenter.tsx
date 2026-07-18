import { 
  Notification, 
  useMarkNotificationRead, 
  useMarkAllRead, 
  useDeleteNotification, 
  useClearAllNotifications, 
  useSeedNotifications 
} from '../services/notifications.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { 
  Bell, 
  AlertCircle, 
  Info, 
  FileText, 
  CheckCircle2, 
  ExternalLink, 
  Trash2, 
  RefreshCw, 
  Check, 
  Filter 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface NotificationCenterProps {
  data: Notification[];
  isLoading: boolean;
}

export default function NotificationCenter({ data, isLoading }: NotificationCenterProps) {
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const deleteNotif = useDeleteNotification();
  const clearAll = useClearAllNotifications();
  const seedNotifs = useSeedNotifications();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const filteredData = data?.filter(n => activeTab === 'all' || !n.is_read) || [];
  
  const unreadCount = data?.filter(n => !n.is_read).length || 0;

  const getIcon = (category: string) => {
    switch (category) {
      case 'Inventory': return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'Payroll': return <FileText className="h-5 w-5 text-indigo-500" />;
      case 'Pharmacy': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'System': return <RefreshCw className="h-5 w-5 text-blue-500" />;
      default: return <Info className="h-5 w-5 text-zinc-500" />;
    }
  };

  const isMutating = markAllRead.isPending || clearAll.isPending || seedNotifs.isPending;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2.5 rounded-lg">
            <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="default" className="bg-indigo-500 hover:bg-indigo-600 border-none px-2 rounded-full h-5 text-xs font-semibold">
                  {unreadCount} new
                </Badge>
              )}
            </h2>
            <p className="text-sm text-zinc-500">Manage your system alerts and updates.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => seedNotifs.mutate()}
            disabled={isMutating}
            className="whitespace-nowrap bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${seedNotifs.isPending ? 'animate-spin' : ''}`} />
            Seed Mock Data
          </Button>

          {data?.length > 0 && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => markAllRead.mutate()}
                disabled={isMutating || unreadCount === 0}
                className="whitespace-nowrap"
              >
                <Check className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => clearAll.mutate()}
                disabled={isMutating}
                className="whitespace-nowrap"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-zinc-100/50 dark:bg-zinc-800/30 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
            activeTab === 'all' 
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
            activeTab === 'unread' 
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          Unread
          {unreadCount > 0 && activeTab !== 'unread' && (
            <span className="flex h-2 w-2 rounded-full bg-indigo-500" />
          )}
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-start gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-3/4 rounded bg-zinc-100 dark:bg-zinc-900" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredData.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-full mb-4">
            <Bell className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            {activeTab === 'unread' ? "No unread notifications" : "You're all caught up!"}
          </h3>
          <p className="text-sm text-zinc-500 text-center max-w-sm">
            We'll notify you when something important happens. Keep up the great work!
          </p>
        </div>
      ) : (
        /* Notification List */
        <div className="space-y-3">
          {filteredData.map((notif) => (
            <div 
              key={notif.id} 
              className={`group flex items-start gap-4 p-4 rounded-xl border transition-all relative overflow-hidden ${
                notif.is_read 
                  ? 'border-zinc-200 bg-white opacity-80 hover:opacity-100 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900' 
                  : 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-900/20 hover:shadow-md'
              }`}
            >
              {/* Unread Indicator Bar */}
              {!notif.is_read && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl" />
              )}
              
              <div className="mt-1 bg-white dark:bg-zinc-800 p-2 rounded-full border border-zinc-100 dark:border-zinc-700 shadow-sm">
                {getIcon(notif.category)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 
                      className={`text-[15px] font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                        notif.is_read ? 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100' : 'text-zinc-900 dark:text-zinc-50'
                      }`}
                      onClick={() => {
                        if (!notif.is_read) markRead.mutate(notif.id);
                        if (notif.link) router.push(notif.link);
                      }}
                    >
                      {notif.title}
                      {notif.link && <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />}
                    </h4>
                    <p className={`mt-1 text-sm leading-relaxed ${notif.is_read ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                      {notif.message}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-zinc-400 whitespace-nowrap mt-1">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                  </span>
                </div>
                
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-semibold border-zinc-200 dark:border-zinc-700 bg-white/50 dark:bg-zinc-800/50 ${notif.is_read ? 'text-zinc-500' : 'text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'}`}>
                    {notif.category}
                  </Badge>

                  {/* Actions (visible on hover) */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    {!notif.is_read && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                        onClick={() => markRead.mutate(notif.id)}
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => deleteNotif.mutate(notif.id)}
                      title="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
