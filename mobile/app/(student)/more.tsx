import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { studentApi } from '@/api/endpoints/student';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useStudentMoreItems } from '@/features/navigation/hooks/useStudentMoreItems';
import { LockedModuleCard } from '@/components/common/LockedModuleCard';
import { VITANA_COLORS } from '@/theme/tokens';

export default function MoreScreen() {
  const { primaryColor } = useSchoolTheme();
  const user = useAuthStore((s) => s.user);
  const { logout } = useLogout();
  const menuItems = useStudentMoreItems();

  const { data: dashboard } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: studentApi.getDashboard,
    staleTime: 5 * 60 * 1000,
  });

  const notificationBadge = dashboard?.unreadCount;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: primaryColor,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
          {user?.fullName ?? 'Student'}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }}>
          {user?.role ?? 'Student'}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16, gap: 8 }}>
          {menuItems.map((item) => {
            const badge =
              item.key === 'notifications' && notificationBadge && notificationBadge > 0
                ? notificationBadge
                : undefined;

            if (item.isLocked) {
              return (
                <View key={item.key}>
                  <LockedModuleCard name={item.label} description={item.lockReason} />
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => router.push(item.route as never)}
                activeOpacity={0.7}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: VITANA_COLORS.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: `${primaryColor}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name={item.icon} size={20} color={primaryColor} />
                </View>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: VITANA_COLORS.text }}>
                  {item.label}
                </Text>
                {badge != null && badge > 0 && (
                  <View
                    style={{
                      backgroundColor: '#ef4444',
                      borderRadius: 10,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      minWidth: 22,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                      {badge > 99 ? '99+' : badge}
                    </Text>
                  </View>
                )}
                <Feather name="chevron-right" size={18} color={VITANA_COLORS.border} />
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            onPress={() => logout()}
            style={{
              marginTop: 8,
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: '#fca5a5',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}
            activeOpacity={0.7}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: '#fee2e2',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="log-out" size={20} color="#dc2626" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '500', color: '#dc2626' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
