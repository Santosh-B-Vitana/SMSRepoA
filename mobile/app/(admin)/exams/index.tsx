import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

interface ExamItem {
  id: string;
  name: string;
  examType?: string;
  startDate?: string;
  endDate?: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  className?: string;
  totalStudents?: number;
  resultsPublished?: boolean;
  academicYear?: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  scheduled:  { color: '#2563eb', bg: '#eff6ff', icon: 'clock' },
  ongoing:    { color: '#059669', bg: '#f0fdf4', icon: 'activity' },
  completed:  { color: '#64748b', bg: '#f1f5f9', icon: 'check-circle' },
  cancelled:  { color: '#dc2626', bg: '#fef2f2', icon: 'x-circle' },
};

function ExamCard({ item }: { item: ExamItem }) {
  const { primaryColor } = useSchoolTheme();
  const conf = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.scheduled;
  const start = item.startDate ? new Date(item.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null;
  const end = item.endDate ? new Date(item.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.name}</Text>
          {item.examType && <Text style={styles.cardType}>{item.examType}</Text>}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: conf.bg }]}>
          <Feather name={conf.icon as any} size={11} color={conf.color} />
          <Text style={[styles.statusText, { color: conf.color }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        {start && end && (
          <View style={styles.metaRow}>
            <Feather name="calendar" size={12} color={VITANA_COLORS.textSecondary} />
            <Text style={styles.metaText}>{start} – {end}</Text>
          </View>
        )}
        {item.className && (
          <View style={styles.metaRow}>
            <Feather name="book-open" size={12} color={VITANA_COLORS.textSecondary} />
            <Text style={styles.metaText}>{item.className}</Text>
          </View>
        )}
        {item.totalStudents != null && (
          <View style={styles.metaRow}>
            <Feather name="users" size={12} color={VITANA_COLORS.textSecondary} />
            <Text style={styles.metaText}>{item.totalStudents} students</Text>
          </View>
        )}
      </View>

      {item.resultsPublished && (
        <View style={styles.resultsBadge}>
          <Feather name="check" size={12} color="#059669" />
          <Text style={styles.resultsText}>Results Published</Text>
        </View>
      )}
    </View>
  );
}

export default function ExamScheduleScreen() {
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery<any>({
    queryKey: ['admin-exam-schedule'],
    queryFn: () => apiClient.get('/examinations/exam-setup', { params: { page: 1, pageSize: 30 } }),
    staleTime: 5 * 60 * 1000,
  });

  const exams: ExamItem[] = Array.isArray(data) ? data : (data?.items ?? data?.examSetups ?? data?.data ?? []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Exam Schedule" />

      <View style={styles.infoBar}>
        <Feather name="info" size={13} color={primaryColor} />
        <Text style={[styles.infoText, { color: primaryColor }]}>
          View-only. Configure exam setup from the CRM portal.
        </Text>
      </View>

      <FlatList
        data={exams}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExamCard item={item} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={primaryColor} /></View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center', gap: 8 }}>
              <Feather name="award" size={36} color={VITANA_COLORS.border} />
              <Text style={{ color: VITANA_COLORS.textSecondary }}>No exams scheduled</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  infoBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#eff6ff', paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#dbeafe',
  },
  infoText: { flex: 1, fontSize: 12, fontWeight: '500' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  cardName: { fontSize: 15, fontWeight: '700', color: VITANA_COLORS.text },
  cardType: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardMeta: { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: VITANA_COLORS.textSecondary },
  resultsBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  resultsText: { fontSize: 12, color: '#059669', fontWeight: '600' },
});
