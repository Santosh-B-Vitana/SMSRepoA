import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { parentApi } from '@/api/endpoints/parent';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useParentMoreItems } from '@/features/navigation/hooks/useParentMoreItems';
import { LockedModuleCard } from '@/components/common/LockedModuleCard';
import { VITANA_COLORS } from '@/theme/tokens';

export default function MoreMenu() {
  const { primaryColor } = useSchoolTheme();
  const { logout } = useLogout();
  const menuItems = useParentMoreItems();

  const { data: dashboard } = useQuery({
    queryKey: ['parent-dashboard'],
    queryFn: parentApi.getDashboard,
    staleTime: 5 * 60 * 1000,
  });

  const notificationBadge = dashboard?.unreadNotificationCount;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16, paddingBottom: 32, gap: 8 }}>
          <Text
            style={{ fontSize: 22, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 8 }}
          >
            More
          </Text>

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
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: VITANA_COLORS.border,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  minHeight: 52,
                }}
                activeOpacity={0.6}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: `${primaryColor}18`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Feather name={item.icon} size={18} color={primaryColor} />
                </View>
                <Text
                  style={{ flex: 1, fontSize: 15, fontWeight: '500', color: VITANA_COLORS.text }}
                >
                  {item.label}
                </Text>
                {badge && badge > 0 ? (
                  <View
                    style={{
                      backgroundColor: '#ef4444',
                      borderRadius: 10,
                      minWidth: 20,
                      height: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                      marginRight: 8,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                      {badge > 9 ? '9+' : String(badge)}
                    </Text>
                  </View>
                ) : null}
                <Feather name="chevron-right" size={18} color={VITANA_COLORS.border} />
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            onPress={() => logout()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 8,
              backgroundColor: '#fff',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#fca5a5',
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
            activeOpacity={0.7}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#fee2e2',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Feather name="log-out" size={18} color="#dc2626" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '500', color: '#dc2626' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
