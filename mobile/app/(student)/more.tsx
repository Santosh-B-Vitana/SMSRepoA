import { useAuthStore } from '@/stores/authStore';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useStudentMoreItems } from '@/features/navigation/hooks/useStudentMoreItems';
import { MoreScreenLayout } from '@/features/navigation/components/MoreScreenLayout';

export default function StudentMore() {
  const { primaryColor } = useSchoolTheme();
  const user = useAuthStore((s) => s.user);
  const { logout } = useLogout();
  const menuItems = useStudentMoreItems();

  return (
    <MoreScreenLayout
      userName={user?.fullName ?? 'Student'}
      userRole={user?.role ?? 'Student'}
      primaryColor={primaryColor}
      menuItems={menuItems}
      onLogout={logout}
    />
  );
}
