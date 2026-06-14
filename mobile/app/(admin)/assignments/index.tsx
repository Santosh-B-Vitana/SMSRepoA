import { useState } from 'react';
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

interface AssignmentSummary {
  id: string;
  title: string;
  subjectName?: string;
  className?: string;
  teacherName?: string;
  assignedDate: string;
  dueDate: string;
  totalStudents?: number;
  submissionCount?: number;
  status: 'active' | 'overdue' | 'completed';
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  active:    { color: '#2563eb', bg: '#eff6ff' },
  overdue:   { color: '#dc2626', bg: '#fef2f2' },
  completed: { color: '#059669', bg: '#f0fdf4' },
};

function AssignmentCard({ item }: { item: AssignmentSummary }) {
  const conf = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.active;
  const due = new Date(item.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const submissionRate = item.totalStudents
    ? Math.round(((item.submissionCount ?? 0) / item.totalStudents) * 100)
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          {item.subjectName && <Text style={styles.cardSub}>{item.subjectName}</Text>}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: conf.bg }]}>
          <Text style={[styles.statusText, { color: conf.color }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {item.className && (
          <View style={styles.metaItem}>
            <Feather name="book-open" size={12} color={VITANA_COLORS.textSecondary} />
            <Text style={styles.metaText}>{item.className}</Text>
          </View>
        )}
        {item.teacherName && (
          <View style={styles.metaItem}>
            <Feather name="user" size={12} color={VITANA_COLORS.textSecondary} />
            <Text style={styles.metaText}>{item.teacherName}</Text>
          </View>
        )}
        <View style={styles.metaItem}>
          <Feather name="calendar" size={12} color={VITANA_COLORS.textSecondary} />
          <Text style={styles.metaText}>Due {due}</Text>
        </View>
      </View>

      {submissionRate != null && (
        <View style={styles.submissionRow}>
          <Text style={styles.submissionLabel}>
            Submissions: {item.submissionCount ?? 0} / {item.totalStudents ?? 0}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
              width: `${submissionRate}%` as any,
              backgroundColor: submissionRate >= 80 ? '#059669' : submissionRate >= 50 ? '#d97706' : '#dc2626',
            }]} />
          </View>
          <Text style={styles.submissionPct}>{submissionRate}%</Text>
        </View>
      )}
    </View>
  );
}

export default function AssignmentMonitorScreen() {
  const { primaryColor } = useSchoolTheme();
  const [filter, setFilter] = useState<'all' | 'active' | 'overdue'>('all');

  const { data, isLoading, refetch, isRefetching } = useQuery<any>({
    queryKey: ['admin-assignments', filter],
    queryFn: () =>
      apiClient.get('/assignments', {
        params: { page: 1, pageSize: 30, status: filter === 'all' ? undefined : filter },
      }),
    staleTime: 5 * 60 * 1000,
  });

  const assignments: AssignmentSummary[] = Array.isArray(data) ? data : (data?.items ?? data?.assignments ?? data?.data ?? []);

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'overdue', label: 'Overdue' },
  ] as const;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Assignment Monitoring" />

      <View style={styles.filterBar}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && { backgroundColor: primaryColor, borderColor: primaryColor }]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && { color: '#fff', fontWeight: '700' }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AssignmentCard item={item} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={primaryColor} /></View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center', gap: 8 }}>
              <Feather name="clipboard" size={36} color={VITANA_COLORS.border} />
              <Text style={{ color: VITANA_COLORS.textSecondary }}>No assignments found</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  filterBar: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  filterText: { fontSize: 13, fontWeight: '500', color: VITANA_COLORS.textSecondary },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text, lineHeight: 20 },
  cardSub: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: VITANA_COLORS.textSecondary },
  submissionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f9fafb' },
  submissionLabel: { fontSize: 12, color: VITANA_COLORS.textSecondary, width: 130 },
  progressTrack: { flex: 1, height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  submissionPct: { fontSize: 12, fontWeight: '700', color: VITANA_COLORS.text, width: 36, textAlign: 'right' },
});
