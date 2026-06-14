import { useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

interface StudentProfile {
  id: string; admissionNumber: string; firstName: string; middleName?: string; lastName: string;
  name: string; gender: string; dateOfBirth: string; class: string; section: string;
  rollNumber: string; status: string; photoUrl: string | null;
  bloodGroup?: string; religion?: string; category?: string;
  email?: string; phone?: string; address?: string;
  guardians?: { name: string; relation: string; phone: string; email?: string }[];
  attendanceSummary?: { present: number; absent: number; late: number; total: number; percentage: number };
  feeStatus?: { totalDue: number; totalPaid: number; pending: number };
  academicYear?: string;
}

const TABS = ['Profile', 'Attendance', 'Fees', 'Academic'] as const;
type Tab = typeof TABS[number];

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
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

export default function StudentProfileScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { primaryColor } = useSchoolTheme();
  const [tab, setTab] = useState<Tab>('Profile');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-student-profile', id],
    queryFn: () => apiClient.get(`/students/${id}`) as Promise<StudentProfile>,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: attendance } = useQuery({
    queryKey: ['admin-student-attendance', id],
    queryFn: () => apiClient.get(`/attendance/student/${id}`, { params: { pageSize: 30 } }) as Promise<any>,
    enabled: !!id && tab === 'Attendance',
    staleTime: 2 * 60 * 1000,
  });

  const { data: fees } = useQuery({
    queryKey: ['admin-student-fees', id],
    queryFn: () => apiClient.get(`/fees/student/${id}`) as Promise<any>,
    enabled: !!id && tab === 'Fees',
    staleTime: 2 * 60 * 1000,
  });

  const fullName = data?.name ?? name ?? 'Student Profile';
  const initials = fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const attPct = data?.attendanceSummary?.percentage ?? 0;
  const attColor = attPct >= 75 ? '#059669' : attPct >= 60 ? VITANA_COLORS.warning : '#ef4444';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title={fullName} />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : (
        <>
          {/* Hero */}
          <View style={styles.heroCard}>
            {data?.photoUrl ? (
              <Image source={{ uri: data.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.initials}>{initials}</Text>
              </View>
            )}
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{fullName}</Text>
              <Text style={styles.heroMeta}>{data?.class} {data?.section} · Roll #{data?.rollNumber}</Text>
              <Text style={styles.heroAdm}>Adm# {data?.admissionNumber}</Text>
            </View>
            {data?.attendanceSummary && (
              <View style={styles.attCircle}>
                <Text style={[styles.attPct, { color: attColor }]}>{attPct.toFixed(0)}%</Text>
                <Text style={styles.attLbl}>Attendance</Text>
              </View>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabBar}>
            {TABS.map((t) => (
              <TouchableOpacity key={t} style={[styles.tab, tab === t && { borderBottomColor: primaryColor, borderBottomWidth: 2 }]} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, tab === t && { color: primaryColor, fontWeight: '700' }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            {/* Profile Tab */}
            {tab === 'Profile' && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Personal Details</Text>
                  <InfoRow icon="user" label="Gender" value={data?.gender} />
                  <InfoRow icon="calendar" label="Date of Birth" value={data?.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString('en-IN') : null} />
                  <InfoRow icon="droplet" label="Blood Group" value={data?.bloodGroup} />
                  <InfoRow icon="tag" label="Category" value={data?.category} />
                  <InfoRow icon="mail" label="Email" value={data?.email} />
                  <InfoRow icon="phone" label="Phone" value={data?.phone} />
                  <InfoRow icon="map-pin" label="Address" value={data?.address} />
                </View>

                {(data?.guardians?.length ?? 0) > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Guardians</Text>
                    {data!.guardians!.map((g, i) => (
                      <View key={i} style={styles.guardianCard}>
                        <View style={styles.guardianHeader}>
                          <Text style={styles.guardianName}>{g.name}</Text>
                          <Text style={styles.guardianRelation}>{g.relation}</Text>
                        </View>
                        <Text style={styles.guardianPhone}>{g.phone}</Text>
                        {g.email && <Text style={styles.guardianEmail}>{g.email}</Text>}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Attendance Tab */}
            {tab === 'Attendance' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Attendance Summary</Text>
                {data?.attendanceSummary ? (
                  <>
                    <View style={styles.attGrid}>
                      {[
                        { label: 'Present', value: data.attendanceSummary.present, color: '#059669' },
                        { label: 'Absent', value: data.attendanceSummary.absent, color: '#ef4444' },
                        { label: 'Late', value: data.attendanceSummary.late, color: VITANA_COLORS.warning },
                        { label: 'Total Days', value: data.attendanceSummary.total, color: VITANA_COLORS.textSecondary },
                      ].map((item) => (
                        <View key={item.label} style={styles.attBox}>
                          <Text style={[styles.attNum, { color: item.color }]}>{item.value}</Text>
                          <Text style={styles.attBoxLabel}>{item.label}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.attBarTrack}>
                      <View style={[styles.attBarFill, { width: `${attPct}%` as any, backgroundColor: attColor }]} />
                    </View>
                    <Text style={[styles.attPctLabel, { color: attColor }]}>
                      {attPct.toFixed(1)}% attendance rate
                    </Text>
                  </>
                ) : (
                  <Text style={{ color: VITANA_COLORS.textSecondary, textAlign: 'center', padding: 20 }}>
                    No attendance data available
                  </Text>
                )}
              </View>
            )}

            {/* Fees Tab */}
            {tab === 'Fees' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fee Status</Text>
                {data?.feeStatus ? (
                  <View style={styles.feeGrid}>
                    {[
                      { label: 'Total Due', value: `₹${data.feeStatus.totalDue?.toLocaleString('en-IN')}`, color: VITANA_COLORS.text },
                      { label: 'Paid', value: `₹${data.feeStatus.totalPaid?.toLocaleString('en-IN')}`, color: '#059669' },
                      { label: 'Pending', value: `₹${data.feeStatus.pending?.toLocaleString('en-IN')}`, color: data.feeStatus.pending > 0 ? '#ef4444' : '#059669' },
                    ].map((item) => (
                      <View key={item.label} style={styles.feeBox}>
                        <Text style={[styles.feeAmount, { color: item.color }]}>{item.value}</Text>
                        <Text style={styles.feeLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: VITANA_COLORS.textSecondary, textAlign: 'center', padding: 20 }}>
                    No fee records available
                  </Text>
                )}
              </View>
            )}

            {/* Academic Tab */}
            {tab === 'Academic' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Academic Information</Text>
                <InfoRow icon="book-open" label="Class" value={`${data?.class} ${data?.section}`} />
                <InfoRow icon="hash" label="Roll Number" value={data?.rollNumber} />
                <InfoRow icon="calendar" label="Academic Year" value={data?.academicYear} />
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: primaryColor }]}
                  onPress={() => router.push({ pathname: '/(admin)/approvals', params: {} })}
                >
                  <Feather name="file-text" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>View Results</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  heroCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, gap: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 20, fontWeight: '700', color: '#4f46e5' },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 16, fontWeight: '700', color: VITANA_COLORS.text },
  heroMeta: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  heroAdm: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  attCircle: { alignItems: 'center' },
  attPct: { fontSize: 20, fontWeight: '800' },
  attLbl: { fontSize: 10, color: VITANA_COLORS.textSecondary },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, color: VITANA_COLORS.textSecondary, fontWeight: '500' },
  section: { backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 14, fontFamily: 'Poppins' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  infoIcon: { marginTop: 2 },
  infoLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary },
  infoValue: { fontSize: 14, color: VITANA_COLORS.text, fontWeight: '500', marginTop: 1 },
  guardianCard: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 8 },
  guardianHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  guardianName: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  guardianRelation: { fontSize: 11, color: VITANA_COLORS.textSecondary, backgroundColor: '#e5e7eb', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  guardianPhone: { fontSize: 13, color: VITANA_COLORS.textSecondary },
  guardianEmail: { fontSize: 12, color: '#9ca3af' },
  attGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  attBox: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, alignItems: 'center', gap: 4 },
  attNum: { fontSize: 22, fontWeight: '800' },
  attBoxLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary, textAlign: 'center' },
  attBarTrack: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  attBarFill: { height: 8, borderRadius: 4 },
  attPctLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  feeGrid: { flexDirection: 'row', gap: 8 },
  feeBox: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, alignItems: 'center', gap: 4 },
  feeAmount: { fontSize: 16, fontWeight: '700' },
  feeLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, gap: 8, marginTop: 12 },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
