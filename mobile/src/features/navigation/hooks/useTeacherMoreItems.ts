import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import type { MoreMenuItem } from './useParentMoreItems';

/**
 * Returns dynamic More menu items for the Teacher portal.
 */
export function useTeacherMoreItems(): MoreMenuItem[] {
  const hasWhatsApp = useFeatureFlag('whatsapp');
  const hasHealthRecords = useFeatureFlag('healthRecords');

  const items: MoreMenuItem[] = [
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
