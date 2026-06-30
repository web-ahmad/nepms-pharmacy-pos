"use client";

import { useNotifications } from '@/features/notifications/services/notifications.api';
import NotificationCenter from '@/features/notifications/components/NotificationCenter';

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications();

  return (
    <div className="space-y-6">
      <div className="max-w-4xl mx-auto">
        <NotificationCenter data={data!} isLoading={isLoading} />
      </div>
    </div>
  );
}
