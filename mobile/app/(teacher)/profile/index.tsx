import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { Avatar } from '@/components/ui/Avatar';

interface StaffProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
  employeeId?: string | null;
  dateOfJoining?: string | null;
  qualification?: string | null;
  experience?: string | null;
  address?: string | null;
  bloodGroup?: string | null;
  profilePhotoUrl?: string | null;
  subjects?: string[];
  classes?: string[];
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Feather name={icon} size={14} color={VITANA_COLORS.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function TeacherProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery<StaffProfile>({
    queryKey: ['staff-profile', user?.linkedEntityId ?? user?.id],
    queryFn: () => apiClient.get(`/staff/${user?.linkedEntityId ?? user?.id}`),
    enabled: !!(user?.linkedEntityId ?? user?.id),
    staleTime: 5 * 60 * 1000,
  });

  const fullName = data
    ? `${data.firstName} ${data.lastName}`.trim()
    : `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.fullName || 'Teacher';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="My Profile" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
      >
        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={primaryColor} size="large" /></View>
        ) : (
          <>
            {/* Header */}
            <View style={[styles.headerCard, { backgroundColor: primaryColor }]}>
              <Avatar name={fullName} size="xl" />
              <Text style={styles.headerName}>{fullName}</Text>
              {(data?.designation ?? user?.designation) && (
                <Text style={styles.headerDesignation}>{data?.designation ?? (user as any)?.designation}</Text>
              )}
              {data?.department && <Text style={styles.headerDept}>{data.department}</Text>}
            </View>

            {/* Contact */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <InfoRow icon="mail" label="Email" value={data?.email ?? user?.email} />
              <InfoRow icon="phone" label="Phone" value={data?.phone} />
              <InfoRow icon="map-pin" label="Address" value={data?.address} />
            </View>

            {/* Professional */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Professional Details</Text>
              <InfoRow icon="briefcase" label="Employee ID" value={data?.employeeId} />
              <InfoRow icon="calendar" label="Date of Joining" value={
                data?.dateOfJoining ? new Date(data.dateOfJoining).toLocaleDateString('en-IN') : null
              } />
              <InfoRow icon="award" label="Qualification" value={data?.qualification} />
              <InfoRow icon="clock" label="Experience" value={data?.experience} />
              <InfoRow icon="activity" label="Blood Group" value={data?.bloodGroup} />
            </View>

            {/* Subjects & Classes */}
            {((data?.subjects?.length ?? 0) > 0 || (data?.classes?.length ?? 0) > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Teaching Assignment</Text>
                {(data?.subjects?.length ?? 0) > 0 && (
                  <>
                    <Text style={styles.chipSectionLabel}>Subjects</Text>
                    <View style={styles.chipRow}>
                      {data!.subjects!.map((s) => (
                        <View key={s} style={[styles.chip, { backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}40` }]}>
                          <Text style={[styles.chipText, { color: primaryColor }]}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
                {(data?.classes?.length ?? 0) > 0 && (
                  <>
                    <Text style={[styles.chipSectionLabel, { marginTop: 12 }]}>Classes</Text>
                    <View style={styles.chipRow}>
                      {data!.classes!.map((c) => (
                        <View key={c} style={styles.chip}>
                          <Text style={styles.chipText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: VITANA_COLORS.background },
  center: { padding: 60, alignItems: 'center' },
  headerCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 8,
  },
  headerName: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
  headerDesignation: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  headerDept: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    gap: 14,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  infoLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginBottom: 2 },
  infoValue: { fontSize: 14, color: VITANA_COLORS.text, fontWeight: '500' },
  chipSectionLabel: { fontSize: 12, color: VITANA_COLORS.textSecondary, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: VITANA_COLORS.border, backgroundColor: '#f8fafc' },
  chipText: { fontSize: 12, fontWeight: '500', color: VITANA_COLORS.textSecondary },
});
