import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

interface StaffProfile {
  id: string; employeeId: string; firstName: string; lastName: string;
  gender: string; dateOfBirth: string; designation: string; department: string;
  email: string; phone: string; qualification: string; experience: number;
  joiningDate: string; status: string; profilePhoto: string | null;
  subjects?: { id: string; name: string; code: string }[];
  classes?: { id: string; name: string; section: string }[];
  address?: string; emergencyContact?: string;
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Feather name={icon as any} size={14} color={VITANA_COLORS.textSecondary} style={styles.infoIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function StaffProfileScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-staff-profile', id],
    queryFn: () => apiClient.get(`/staff/${id}`) as Promise<StaffProfile>,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const fullName = data ? `${data.firstName} ${data.lastName}` : (name ?? 'Staff Profile');
  const initials = fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title={fullName} />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar + Name */}
          <View style={styles.heroCard}>
            {data?.profilePhoto ? (
              <Image source={{ uri: data.profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${primaryColor}20` }]}>
                <Text style={[styles.initials, { color: primaryColor }]}>{initials}</Text>
              </View>
            )}
            <Text style={styles.heroName}>{fullName}</Text>
            <Text style={styles.heroRole}>{data?.designation} · {data?.department}</Text>
            <Text style={styles.heroId}>ID: {data?.employeeId}</Text>
            <View style={[styles.statusBadge, { backgroundColor: data?.status === 'active' ? '#dcfce7' : '#fee2e2' }]}>
              <Text style={[styles.statusText, { color: data?.status === 'active' ? '#166534' : '#991b1b' }]}>
                {data?.status?.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Contact & Personal */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <InfoRow icon="mail" label="Email" value={data?.email} />
            <InfoRow icon="phone" label="Phone" value={data?.phone} />
            <InfoRow icon="user" label="Gender" value={data?.gender} />
            <InfoRow icon="calendar" label="Date of Birth" value={data?.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString('en-IN') : null} />
            <InfoRow icon="award" label="Qualification" value={data?.qualification} />
            <InfoRow icon="briefcase" label="Experience" value={data?.experience !== undefined ? `${data.experience} years` : null} />
            <InfoRow icon="clock" label="Joining Date" value={data?.joiningDate ? new Date(data.joiningDate).toLocaleDateString('en-IN') : null} />
            <InfoRow icon="map-pin" label="Address" value={data?.address} />
          </View>

          {/* Subjects */}
          {(data?.subjects?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Subjects Taught</Text>
              <View style={styles.tagRow}>
                {data!.subjects!.map((s) => (
                  <View key={s.id} style={[styles.tag, { backgroundColor: `${primaryColor}15` }]}>
                    <Text style={[styles.tagText, { color: primaryColor }]}>{s.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Classes */}
          {(data?.classes?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Classes</Text>
              {data!.classes!.map((cls) => (
                <View key={cls.id} style={styles.classRow}>
                  <Feather name="users" size={14} color={VITANA_COLORS.textSecondary} />
                  <Text style={styles.classText}>{cls.name} {cls.section}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { paddingBottom: 32 },
  heroCard: {
    backgroundColor: '#fff', alignItems: 'center', padding: 24,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 6,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 8 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  initials: { fontSize: 28, fontWeight: '700' },
  heroName: { fontSize: 20, fontWeight: '700', color: VITANA_COLORS.text, fontFamily: 'Poppins' },
  heroRole: { fontSize: 14, color: VITANA_COLORS.textSecondary },
  heroId: { fontSize: 12, color: '#9ca3af' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  section: {
    backgroundColor: '#fff', marginTop: 12, marginHorizontal: 12,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#f1f5f9',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 12, fontFamily: 'Poppins' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  infoIcon: { marginTop: 2 },
  infoLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginBottom: 2 },
  infoValue: { fontSize: 14, color: VITANA_COLORS.text, fontWeight: '500' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  tagText: { fontSize: 13, fontWeight: '500' },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  classText: { fontSize: 14, color: VITANA_COLORS.text },
});
