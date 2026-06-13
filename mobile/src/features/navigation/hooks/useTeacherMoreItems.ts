import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { OfflineQueueProcessor } from '@/offline/queue';
import { useAuthStore } from '@/stores/authStore';
import { communicationApi } from '@/api/endpoints/communication';
import type { MoreMenuItem } from './useParentMoreItems';

/**
 * Returns dynamic More menu items for the Teacher portal.
 */
export function useTeacherMoreItems(): MoreMenuItem[] {
  const hasWhatsApp = useFeatureFlag('whatsapp');
  const hasHealthRecords = useFeatureFlag('healthRecords');
  const user = useAuthStore((s) => s.user);
  const [pendingCount, setPendingCount] = useState(0);

  const { data: unreadData } = useQuery({
    queryKey: ['messages-unread'],
    queryFn: communicationApi.getUnreadCount,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const messageUnreadCount = unreadData?.count ?? 0;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    OfflineQueueProcessor.getPendingCount(user.id)
      .then((count) => {
        if (!cancelled) setPendingCount(count);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user]);

  const items: MoreMenuItem[] = [
    {
      key: 'messages',
      label: 'Messages',
      icon: 'message-square',
      route: '/(teacher)/messages/index',
      badge: messageUnreadCount,
    },
    {
      key: 'announcements',
      label: 'Announcements',
      icon: 'bell',
      route: '/(teacher)/announcements/index',
    },
    {
      key: 'marks-entry',
      label: 'Marks Entry',
      icon: 'edit-3',
      route: '/(teacher)/marks',
    },
    {
      key: 'assignments',
      label: 'Assignments',
      icon: 'clipboard',
      route: '/(teacher)/assignments',
    },
    {
      key: 'leave-requests',
      label: 'Student Leave Requests',
      icon: 'users',
      route: '/(teacher)/leaves/index',
    },
    {
      key: 'my-leaves',
      label: 'My Leave Applications',
      icon: 'calendar',
      route: '/(teacher)/leaves/status',
    },
    {
      key: 'apply-leave',
      label: 'Apply for Leave',
      icon: 'edit',
      route: '/(teacher)/leaves/apply',
    },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: 'bell',
      route: '/(teacher)/notifications/index',
    },
    {
      key: 'sync-status',
      label: 'Sync Status',
      icon: 'upload-cloud',
      route: '/(teacher)/sync-status',
      badge: pendingCount,
    },
  ];

  // Optional modules — screens not yet built
  if (hasWhatsApp) {
    items.push({
      key: 'whatsapp',
      label: 'WhatsApp Notifications',
      icon: 'message-circle',
      route: '',
      isLocked: true,
      lockReason: 'Coming soon',
    });
  }

  if (!hasHealthRecords) {
    items.push({
      key: 'health',
      label: 'Health Records',
      icon: 'activity',
      route: '',
      isLocked: true,
      lockReason: 'Not available on your current plan',
    });
  }

  return items;
}
