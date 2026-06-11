import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useTeacherMoreItems } from '@/features/navigation/hooks/useTeacherMoreItems';
import { LockedModuleCard } from '@/components/common/LockedModuleCard';
import { VITANA_COLORS } from '@/theme/tokens';

export default function TeacherMore() {
  const { primaryColor } = useSchoolTheme();
  const user = useAuthStore((s) => s.user);
  const { logout } = useLogout();
  const menuItems = useTeacherMoreItems();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16, paddingBottom: 32, gap: 8 }}>
          {/* User info header */}
          <View
            style={{
              backgroundColor: primaryColor,
              borderRadius: 14,
              padding: 18,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: 'rgba(255,255,255,0.25)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
                {user?.fullName?.[0] ?? 'T'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                {user?.fullName ?? 'Teacher'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 }}>
                {user?.role ?? 'Teacher'}
              </Text>
            </View>
          </View>

          {menuItems.map((item) => {
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
                {item.badge && item.badge > 0 ? (
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
                      {(item.badge ?? 0) > 9 ? '9+' : String(item.badge)}
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
