import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import type { Feather } from '@expo/vector-icons';

export interface MoreMenuItem {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  /** Empty string when isLocked is true */
  route: string;
  badge?: number;
  /** When true, render as LockedModuleCard instead of a tappable row */
  isLocked?: boolean;
  /** Reason shown inside the locked card */
  lockReason?: string;
}

/**
 * Returns dynamic More menu items for the Parent portal.
 * Feature-flagged items that are disabled appear as LockedModuleCard.
 * Feature-flagged items whose screens are not yet built also appear locked.
 */
export function useParentMoreItems(): MoreMenuItem[] {
  const hasLibrary = useFeatureFlag('library');
  const hasTransport = useFeatureFlag('transport');
  const hasHostel = useFeatureFlag('hostel');

  const items: MoreMenuItem[] = [
    {
      key: 'announcements',
      label: 'Announcements',
      icon: 'book-open',
      route: '/(parent)/announcements/index',
    },
    {
      key: 'diary',
      label: 'Class Diary',
      icon: 'book',
      route: '/(parent)/diary/',
    },
    {
      key: 'leaves',
      label: 'Leave Applications',
      icon: 'calendar',
      route: '/(parent)/leaves/index',
    },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: 'bell',
      route: '/(parent)/notifications/index',
    },
  ];

  // Optional modules: show locked card when disabled (not on plan)
  // or locked with "coming soon" when enabled but screen not yet built
  if (!hasLibrary) {
    items.push({
      key: 'library',
      label: 'Library',
      icon: 'book-open',
      route: '',
      isLocked: true,
      lockReason: 'Not available on your current plan',
    });
  } else {
    items.push({
      key: 'library',
      label: 'Library',
      icon: 'book-open',
      route: '',
      isLocked: true,
      lockReason: 'Coming soon',
    });
  }

  if (!hasTransport) {
    items.push({
      key: 'transport',
      label: 'Transport',
      icon: 'map-pin',
      route: '',
      isLocked: true,
      lockReason: 'Not available on your current plan',
    });
  } else {
    items.push({
      key: 'transport',
      label: 'Transport',
      icon: 'map-pin',
      route: '',
      isLocked: true,
      lockReason: 'Coming soon',
    });
  }

  if (!hasHostel) {
    items.push({
      key: 'hostel',
      label: 'Hostel',
      icon: 'home',
      route: '',
      isLocked: true,
      lockReason: 'Not available on your current plan',
    });
  } else {
    items.push({
      key: 'hostel',
      label: 'Hostel',
      icon: 'home',
      route: '',
      isLocked: true,
      lockReason: 'Coming soon',
    });
  }

  return items;
}
