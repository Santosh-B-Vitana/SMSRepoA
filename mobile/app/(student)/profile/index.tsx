import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { studentApi } from '@/api/endpoints/student';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

function ProfileRow({ icon, label, value }: {
  icon: keyof typeof Feather.glyphMap; label: string; value: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border, gap: 12,
      }}
    >
      <Feather name={icon} size={16} color={VITANA_COLORS.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 14, color: VITANA_COLORS.text, marginTop: 1 }}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { primaryColor } = useSchoolTheme();
  const { logout } = useLogout();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['student-profile'],
    queryFn: studentApi.getProfile,
    staleTime: 30 * 60 * 1000,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}>
          My Profile
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={{ alignItems: 'center', paddingVertical: 28, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border }}>
          {isLoading ? (
            <SkeletonLoader height={80} width={80} borderRadius={40} />
          ) : (
            <View
              style={{
                width: 80, height: 80, borderRadius: 40, overflow: 'hidden',
                backgroundColor: primaryColor + '20',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {profile?.photoUrl ? (
                <Image source={{ uri: profile.photoUrl }} style={{ width: 80, height: 80 }} contentFit="cover" />
              ) : (
                <Text style={{ fontSize: 28, fontWeight: '700', color: primaryColor }}>
                  {(profile?.name ?? user?.fullName ?? 'S')[0].toUpperCase()}
                </Text>
              )}
            </View>
          )}
          <Text style={{ fontSize: 18, fontWeight: '700', color: VITANA_COLORS.text, marginTop: 12 }}>
            {profile?.name ?? user?.fullName ?? '—'}
          </Text>
          {profile && (
            <Text style={{ fontSize: 14, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
              {profile.className} · Roll No. {profile.rollNumber}
            </Text>
          )}
        </View>

        <View style={{ padding: 16, gap: 12 }}>
          {/* Details card */}
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: VITANA_COLORS.border }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: VITANA_COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Academic Details
            </Text>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonLoader key={i} height={44} borderRadius={8} style={{ marginBottom: 8 }} />)
            ) : (
              <>
                <ProfileRow icon="hash" label="Roll Number" value={profile?.rollNumber ?? '—'} />
                <ProfileRow icon="book" label="Class" value={profile?.className ?? '—'} />
                <ProfileRow icon="users" label="Section" value={profile?.section ?? '—'} />
                <ProfileRow icon="file-text" label="Admission No." value={profile?.admissionNumber ?? '—'} />
                <ProfileRow icon="calendar" label="Date of Birth" value={profile?.dateOfBirth?.split('T')[0] ?? '—'} />
              </>
            )}
          </View>

          {/* Account card */}
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: VITANA_COLORS.border }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: VITANA_COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Account
            </Text>
            <ProfileRow icon="mail" label="Email" value={profile?.email ?? user?.email ?? '—'} />
          </View>

          {/* Logout */}
          <TouchableOpacity
            onPress={() => logout()}
            style={{
              backgroundColor: '#fff', borderRadius: 12, padding: 16,
              borderWidth: 1, borderColor: '#fca5a5',
              flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center',
            }}
          >
            <Feather name="log-out" size={18} color="#dc2626" />
            <Text style={{ fontSize: 15, fontWeight: '500', color: '#dc2626' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
