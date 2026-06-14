import { useAuthStore } from '@/stores/authStore';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useTeacherMoreItems } from '@/features/navigation/hooks/useTeacherMoreItems';
import { MoreScreenLayout } from '@/features/navigation/components/MoreScreenLayout';
import type { UserRole } from '@/shared-types/api/auth';

// Human-readable display labels for non-teaching roles in the teacher portal.
const ROLE_DISPLAY_LABELS: Partial<Record<UserRole, string>> = {
  Librarian:        'Librarian',
  TransportManager: 'Transport Manager',
  HostelWarden:     'Hostel Warden',
  Receptionist:     'Receptionist',
  Accountant:       'Accountant',
};

export default function TeacherMore() {
  const { primaryColor } = useSchoolTheme();
  const user = useAuthStore((s) => s.user);
  const { logout } = useLogout();
  const menuItems = useTeacherMoreItems();

  const roleLabel =
    ROLE_DISPLAY_LABELS[user?.role as UserRole] ?? user?.role ?? 'Teacher';

  return (
    <MoreScreenLayout
      userName={user?.fullName ?? 'Teacher'}
      userRole={roleLabel}
      primaryColor={primaryColor}
      menuItems={menuItems}
      onLogout={logout}
    />
  );
}
