import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { studentApi } from '@/api/endpoints/student';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { VITANA_COLORS } from '@/theme/tokens';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function StudentBehaviourScreen() {
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['student-behaviour-me'],
    queryFn: studentApi.getBehaviourSummary,
    staleTime: 5 * 60_000,
  });

  const records = data?.records ?? [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <SubScreenHeader title="Behaviour Record" />

      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
      >
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={primaryColor} />
        ) : (
          <View style={s.body}>
            {/* Points summary */}
            <View style={s.summaryCard}>
              <View style={s.pointsCenter}>
                <Text style={[s.pointsValue, { color: (data?.totalPoints ?? 0) >= 0 ? '#16a34a' : '#dc2626' }]}>
                  {(data?.totalPoints ?? 0) > 0 ? '+' : ''}{data?.totalPoints ?? 0}
                </Text>
                <Text style={s.pointsLabel}>Total Points</Text>
              </View>
              <View style={s.statsRow}>
                {[
                  { label: 'Merits', value: data?.meritCount ?? 0, color: '#16a34a', icon: 'star' as const },
                  { label: 'Demerits', value: data?.demeritCount ?? 0, color: '#dc2626', icon: 'alert-triangle' as const },
                  { label: 'Open Cases', value: data?.openCount ?? 0, color: '#d97706', icon: 'clock' as const },
                ].map(({ label, value, color, icon }) => (
                  <View key={label} style={s.statItem}>
                    <Feather name={icon} size={16} color={color} />
                    <Text style={[s.statValue, { color }]}>{value}</Text>
                    <Text style={s.statLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Records list */}
            {records.length === 0 ? (
              <View style={s.empty}>
                <Feather name="check-circle" size={40} color={VITANA_COLORS.border} />
                <Text style={s.emptyText}>No behaviour records found.</Text>
              </View>
            ) : (
              records.map((record) => {
                const isMerit = record.incidentType === 'positive';
                return (
                  <View key={record.id} style={s.card}>
                    <View style={s.cardHeader}>
                      <View style={[s.typeTag, { backgroundColor: isMerit ? '#dcfce7' : '#fee2e2' }]}>
                        <Feather name={isMerit ? 'award' : 'alert-circle'} size={12} color={isMerit ? '#16a34a' : '#dc2626'} />
                        <Text style={[s.typeText, { color: isMerit ? '#16a34a' : '#dc2626' }]}>
                          {isMerit ? 'Merit' : 'Demerit'}
                        </Text>
                      </View>
                      <Text style={[s.points, { color: isMerit ? '#16a34a' : '#dc2626' }]}>
                        {isMerit ? '+' : ''}{record.points} pts
                      </Text>
                    </View>
                    <Text style={s.category}>{record.category}</Text>
                    <Text style={s.description}>{record.description}</Text>
                    {record.actionTaken ? (
                      <Text style={s.action}>Action: {record.actionTaken}</Text>
                    ) : null}
                    <View style={s.cardFooter}>
                      <Text style={s.date}>{formatDate(record.incidentDate)}</Text>
                      <View style={[s.statusBadge, { backgroundColor: record.status === 'resolved' ? '#dcfce7' : '#fef3c7' }]}>
                        <Text style={{ fontSize: 11, color: record.status === 'resolved' ? '#16a34a' : '#92400e', fontWeight: '600' }}>
                          {record.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: VITANA_COLORS.border,
  },
  pointsCenter: { alignItems: 'center', marginBottom: 16 },
  pointsValue: { fontSize: 40, fontWeight: '800' },
  pointsLabel: { fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, color: VITANA_COLORS.textSecondary },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 6,
    borderWidth: 1, borderColor: VITANA_COLORS.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100,
  },
  typeText: { fontSize: 12, fontWeight: '600' },
  points: { fontSize: 14, fontWeight: '700' },
  category: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.text },
  description: { fontSize: 13, color: VITANA_COLORS.textSecondary, lineHeight: 18 },
  action: { fontSize: 12, color: '#6b7280', fontStyle: 'italic' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  date: { fontSize: 12, color: VITANA_COLORS.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  empty: { paddingVertical: 60, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, color: VITANA_COLORS.textSecondary },
});
