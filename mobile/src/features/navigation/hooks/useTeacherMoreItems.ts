import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { OfflineQueueProcessor } from '@/offline/queue';
import { useAuthStore } from '@/stores/authStore';
import { communicationApi } from '@/api/endpoints/communication';
import type { UserRole } from '@/shared-types/api/auth';
import type { MoreMenuItem } from './useParentMoreItems';

// Teaching roles that should see the full academic menu (classes, marks, assignments, attendance).
const TEACHING_ROLES: UserRole[] = ['Teacher', 'Staff'];

// Roles that land in the teacher portal but have a domain-specific function.
// They should NOT see academic items irrelevant to their work.
type NonTeachingPortalRole = 'Librarian' | 'TransportManager' | 'HostelWarden' | 'Receptionist' | 'Accountant';

const NON_TEACHING_PORTAL_ROLES = new Set<UserRole>([
  'Librarian', 'TransportManager', 'HostelWarden', 'Receptionist', 'Accountant',
]);

function isTeachingRole(role: UserRole | undefined): boolean {
  return !role || TEACHING_ROLES.includes(role as UserRole);
}

/**
 * Returns dynamic More menu items for the Teacher portal.
 * The list is role-differentiated: non-teaching designations (Librarian,
 * TransportManager, HostelWarden, Receptionist, Accountant) receive only the
 * items relevant to their function instead of the full academic menu.
 */
export function useTeacherMoreItems(): MoreMenuItem[] {
  const hasWhatsApp = useFeatureFlag('whatsapp');
  const hasHealthRecords = useFeatureFlag('healthRecords');
  const hasTransport = useFeatureFlag('transport');
  const hasHostel = useFeatureFlag('hostel');
  const hasLibrary = useFeatureFlag('library');
  const hasOnlineClasses = useFeatureFlag('online_classes', false);
  const user = useAuthStore((s) => s.user);
  const role = user?.role as UserRole | undefined;
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

  // ── Common items visible to all roles in this portal ─────────────────────
  const common: MoreMenuItem[] = [
    {
      key: 'announcements',
      label: 'Announcements',
      icon: 'bell',
      route: '/(teacher)/announcements/index',
    },
    {
      key: 'my-attendance',
      label: 'My Attendance',
      icon: 'check-square',
      route: '/(teacher)/attendance/my',
    },
    {
      key: 'my-salary',
      label: 'My Salary',
      icon: 'dollar-sign',
      route: '/(teacher)/salary/index',
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

  // ── Role-specific items ───────────────────────────────────────────────────

  // Teaching roles (Teacher / Staff) — full academic menu
  if (!NON_TEACHING_PORTAL_ROLES.has(role as NonTeachingPortalRole)) {
    const teachingItems: MoreMenuItem[] = [
      {
        key: 'messages',
        label: 'Messages',
        icon: 'message-square',
        route: '/(teacher)/messages/index',
        badge: messageUnreadCount,
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
        key: 'curriculum',
        label: 'My Curriculum',
        icon: 'book-open',
        route: '/(teacher)/syllabus/index',
      },
      {
        key: 'diary',
        label: 'Class Diary',
        icon: 'edit',
        route: '/(teacher)/diary/index',
      },
      {
        key: 'ptm',
        label: 'PTM Schedule',
        icon: 'calendar',
        route: '/(teacher)/ptm/index',
      },
      {
        key: 'performance',
        label: 'Student Performance',
        icon: 'bar-chart-2',
        route: '/(teacher)/performance/index',
      },
      {
        key: 'profile',
        label: 'My Profile',
        icon: 'user',
        route: '/(teacher)/profile/index',
      },
      {
        key: 'sync-status',
        label: 'Sync Status',
        icon: 'upload-cloud',
        route: '/(teacher)/sync-status',
        badge: pendingCount,
      },
    ];

    if (hasOnlineClasses) {
      teachingItems.push({
        key: 'online-classes',
        label: 'Online Classes',
        icon: 'video',
        route: '/(teacher)/online-classes/index',
      });
    }

    return [...teachingItems, ...common];
  }

  // ── Librarian ─────────────────────────────────────────────────────────────
  if (role === 'Librarian') {
    const librarianItems: MoreMenuItem[] = [
      {
        key: 'library',
        label: 'Library',
        icon: 'book-open',
        route: '/(teacher)/library/index',
      },
      {
        key: 'profile',
        label: 'My Profile',
        icon: 'user',
        route: '/(teacher)/profile/index',
      },
      ...common,
    ];
    return librarianItems;
  }

  // ── Transport Manager ─────────────────────────────────────────────────────
  if (role === 'TransportManager') {
    const transportItems: MoreMenuItem[] = [
      {
        key: 'transport',
        label: 'Transport Management',
        icon: 'truck',
        route: '/(teacher)/transport/index',
      },
      {
        key: 'profile',
        label: 'My Profile',
        icon: 'user',
        route: '/(teacher)/profile/index',
      },
      ...common,
    ];
    return transportItems;
  }

  // ── Hostel Warden ─────────────────────────────────────────────────────────
  if (role === 'HostelWarden') {
    const hostelItems: MoreMenuItem[] = [
      {
        key: 'hostel',
        label: 'Hostel Management',
        icon: 'home',
        route: '/(teacher)/hostel/index',
      },
      {
        key: 'hostel-visitors',
        label: 'Hostel Visitors',
        icon: 'user-check',
        route: '/(teacher)/hostel/visitors',
      },
      {
        key: 'health',
        label: 'Health Records',
        icon: 'activity',
        route: hasHealthRecords ? '/(teacher)/health/index' : '',
        isLocked: !hasHealthRecords,
        lockReason: !hasHealthRecords ? 'Health module not enabled for this school' : undefined,
      },
      {
        key: 'profile',
        label: 'My Profile',
        icon: 'user',
        route: '/(teacher)/profile/index',
      },
      ...common,
    ];
    return hostelItems;
  }

  // ── Receptionist ──────────────────────────────────────────────────────────
  if (role === 'Receptionist') {
    const receptionistItems: MoreMenuItem[] = [
      {
        key: 'visitor-management',
        label: 'Visitor Management',
        icon: 'user-check',
        route: '/(teacher)/visitors/index',
      },
      {
        key: 'messages',
        label: 'Messages',
        icon: 'message-square',
        route: '/(teacher)/messages/index',
        badge: messageUnreadCount,
      },
      {
        key: 'profile',
        label: 'My Profile',
        icon: 'user',
        route: '/(teacher)/profile/index',
      },
      ...common,
    ];
    return receptionistItems;
  }

  // ── Accountant ────────────────────────────────────────────────────────────
  if (role === 'Accountant') {
    const accountantItems: MoreMenuItem[] = [
      {
        key: 'fees',
        label: 'Fee Collection',
        icon: 'dollar-sign',
        route: '/(teacher)/fees/index',
        isLocked: true,
        lockReason: 'Coming soon',
      },
      ...common,
    ];
    return accountantItems;
  }

  // Fallback — return common items only
  return common;
}
