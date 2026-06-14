import { useAuthStore } from '@/stores/authStore';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useParentMoreItems } from '@/features/navigation/hooks/useParentMoreItems';
import { MoreScreenLayout } from '@/features/navigation/components/MoreScreenLayout';

export default function ParentMore() {
  const { primaryColor } = useSchoolTheme();
  const user = useAuthStore((s) => s.user);
  const { logout } = useLogout();
  const menuItems = useParentMoreItems();

  return (
    <MoreScreenLayout
      userName={user?.fullName ?? 'Parent'}
      userRole={user?.role ?? 'Parent'}
      primaryColor={primaryColor}
      menuItems={menuItems}
      onLogout={logout}
    />
  );
}
