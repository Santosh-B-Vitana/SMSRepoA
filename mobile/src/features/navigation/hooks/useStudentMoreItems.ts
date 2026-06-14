import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import type { MoreMenuItem } from './useParentMoreItems';

/**
 * Returns dynamic More menu items for the Student portal.
 * Library screen exists at /(student)/library/index — shown when flag is on,
 * shown as locked when flag is off.
 */
export function useStudentMoreItems(): MoreMenuItem[] {
  const hasLibrary = useFeatureFlag('library');
  const hasOnlineExams = useFeatureFlag('onlineExams');
  const hasOnlineClasses = useFeatureFlag('online_classes', false);

  const items: MoreMenuItem[] = [
    {
      key: 'attendance',
      label: 'Attendance',
      icon: 'user-check',
      route: '/(student)/attendance/index',
    },
    {
      key: 'fees',
      label: 'Fee Summary',
      icon: 'credit-card',
      route: '/(student)/fees/index',
    },
    {
      key: 'behaviour',
      label: 'Behaviour Record',
      icon: 'award',
      route: '/(student)/behaviour/index',
    },
    {
      key: 'health',
      label: 'Health Record',
      icon: 'heart',
      route: '/(student)/health/index',
    },
    {
      key: 'leaves',
      label: 'Leave Applications',
      icon: 'calendar',
      route: '/(student)/leaves/index',
    },
    {
      key: 'announcements',
      label: 'Announcements',
      icon: 'book-open',
      route: '/(student)/announcements/index',
    },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: 'bell',
      route: '/(student)/notifications/index',
    },
    {
      key: 'profile',
      label: 'My Profile',
      icon: 'user',
      route: '/(student)/profile/index',
    },
  ];

  // Online Classes
  if (hasOnlineClasses) {
    items.push({
      key: 'online-classes',
      label: 'Online Classes',
      icon: 'video',
      route: '/(student)/online-classes/index',
    });
  }

  // Library: screen exists at /(student)/library/index
  if (hasLibrary) {
    items.push({
      key: 'library',
      label: 'Library',
      icon: 'book',
      route: '/(student)/library/index',
      isLocked: false,
    });
  } else {
    items.push({
      key: 'library',
      label: 'Library',
      icon: 'book',
      route: '',
      isLocked: true,
      lockReason: 'Not available on your current plan',
    });
  }

  // Online exams: screen not yet built
  if (hasOnlineExams) {
    items.push({
      key: 'online-exams',
      label: 'Online Exams',
      icon: 'edit-3',
      route: '',
      isLocked: true,
      lockReason: 'Coming soon',
    });
  }

  return items;
}
