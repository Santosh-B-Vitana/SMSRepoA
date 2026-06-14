import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useQuery } from '@tanstack/react-query';
import { communicationApi } from '@/api/endpoints/communication';
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

  const { data: unreadData } = useQuery({
    queryKey: ['messages-unread'],
    queryFn: communicationApi.getUnreadCount,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const messageUnreadCount = unreadData?.count ?? 0;

  const items: MoreMenuItem[] = [
    {
      key: 'messages',
      label: 'Messages',
      icon: 'message-square',
      route: '/(parent)/messages/index',
      badge: messageUnreadCount,
    },
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
      key: 'ptm',
      label: 'Parent-Teacher Meetings',
      icon: 'users',
      route: '/(parent)/ptm/index',
    },
    {
      key: 'behaviour',
      label: 'Behaviour Reports',
      icon: 'award',
      route: '/(parent)/behaviour/index',
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
    // Transport screen now available at /(parent)/transport/index
    items.push({
      key: 'transport',
      label: 'Transport',
      icon: 'map-pin',
      route: '/(parent)/transport/index',
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
      route: '/(parent)/hostel/index',
    });
  }

  return items;
}
