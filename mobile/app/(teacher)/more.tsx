import { useAuthStore } from '@/stores/authStore';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useTeacherMoreItems } from '@/features/navigation/hooks/useTeacherMoreItems';
import { MoreScreenLayout } from '@/features/navigation/components/MoreScreenLayout';

export default function TeacherMore() {
  const { primaryColor } = useSchoolTheme();
  const user = useAuthStore((s) => s.user);
  const { logout } = useLogout();
  const menuItems = useTeacherMoreItems();

  return (
    <MoreScreenLayout
      userName={user?.fullName ?? 'Teacher'}
      userRole={user?.role ?? 'Teacher'}
      primaryColor={primaryColor}
      menuItems={menuItems}
      onLogout={logout}
    />
  );
}
