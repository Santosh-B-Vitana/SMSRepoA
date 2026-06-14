import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { parentApi } from '@/api/endpoints/parent';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { VITANA_COLORS } from '@/theme/tokens';

interface HostelStudentDetail {
  studentId: string;
  studentName?: string;
  blockName?: string | null;
  roomNumber?: string | null;
  bedNumber?: string | null;
  checkInDate?: string | null;
  feePerMonth?: number | null;
  status?: string | null;
}

function InfoRow({ icon, label, value }: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <View style={s.infoRow}>
      <Feather name={icon} size={14} color={VITANA_COLORS.textSecondary} style={{ width: 18 }} />
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

export default function ParentHostelScreen() {
  const { primaryColor } = useSchoolTheme();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data: children = [] } = useQuery({
    queryKey: ['my-children'],
    queryFn: parentApi.getMyChildren,
    staleTime: 5 * 60_000,
  });

  const activeChildId = selectedChildId ?? children[0]?.id ?? null;

  const { data, isLoading, refetch, isRefetching, error } = useQuery<HostelStudentDetail>({
    queryKey: ['hostel-child', activeChildId],
    queryFn: () =>
      apiClient.get(`/hostel/parent/my-child/${activeChildId}`),
    enabled: !!activeChildId,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const notInHostel = (error as any)?.response?.status === 404;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <SubScreenHeader title="Hostel Information" />

      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
      >
        <View style={s.body}>
          {/* Child switcher */}
          {children.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                {children.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.chip, activeChildId === c.id && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                    onPress={() => setSelectedChildId(c.id)}
                  >
                    <Text style={[s.chipText, activeChildId === c.id && { color: '#fff' }]}>
                      {c.studentName.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={primaryColor} />
          ) : notInHostel ? (
            <View style={s.empty}>
              <Feather name="home" size={40} color={VITANA_COLORS.border} />
              <Text style={s.emptyTitle}>Not a hostel resident</Text>
              <Text style={s.emptyText}>Your child is not currently assigned to any hostel accommodation.</Text>
            </View>
          ) : !data ? (
            <View style={s.empty}>
              <Feather name="home" size={40} color={VITANA_COLORS.border} />
              <Text style={s.emptyText}>No hostel information available.</Text>
            </View>
          ) : (
            <>
              {/* Room card */}
              <View style={s.roomCard}>
                <View style={s.roomIconWrap}>
                  <Feather name="home" size={28} color={primaryColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.roomNumber}>Room {data.roomNumber ?? '—'}</Text>
                  {data.blockName ? (
                    <Text style={s.blockName}>{data.blockName}</Text>
                  ) : null}
                  {data.status ? (
                    <View style={[s.statusBadge, { backgroundColor: data.status === 'active' ? '#dcfce7' : '#f3f4f6' }]}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: data.status === 'active' ? '#16a34a' : '#6b7280' }}>
                        {data.status}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Details */}
              <View style={s.card}>
                <Text style={s.sectionTitle}>Accommodation Details</Text>
                <InfoRow icon="home" label="Block" value={data.blockName} />
                <InfoRow icon="hash" label="Room No." value={data.roomNumber} />
                <InfoRow icon="grid" label="Bed" value={data.bedNumber} />
                <InfoRow icon="calendar" label="Check-in" value={data.checkInDate ? new Date(data.checkInDate).toLocaleDateString('en-IN') : null} />
                {data.feePerMonth != null ? (
                  <View style={s.infoRow}>
                    <Feather name="credit-card" size={14} color={VITANA_COLORS.textSecondary} style={{ width: 18 }} />
                    <Text style={s.infoLabel}>Monthly Fee</Text>
                    <Text style={[s.infoValue, { fontWeight: '600', color: VITANA_COLORS.text }]}>
                      ₹{data.feePerMonth.toLocaleString('en-IN')}
                    </Text>
                  </View>
                ) : null}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100,
    borderWidth: 1, borderColor: VITANA_COLORS.border, backgroundColor: '#fff',
  },
  chipText: { fontSize: 13, fontWeight: '500', color: VITANA_COLORS.text },
  roomCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderWidth: 1, borderColor: VITANA_COLORS.border,
  },
  roomIconWrap: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
  },
  roomNumber: { fontSize: 22, fontWeight: '800', color: VITANA_COLORS.text },
  blockName: { fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10,
    borderWidth: 1, borderColor: VITANA_COLORS.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text, marginBottom: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 13, color: VITANA_COLORS.textSecondary, width: 88 },
  infoValue: { fontSize: 13, color: VITANA_COLORS.text, flex: 1 },
  empty: { paddingVertical: 60, alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: VITANA_COLORS.text },
  emptyText: { fontSize: 14, color: VITANA_COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
});
