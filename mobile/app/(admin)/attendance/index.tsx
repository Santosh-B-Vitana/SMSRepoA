import { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ActivityIndicator,
  RefreshControl, StyleSheet, Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

interface AttendanceRecord {
  id: string;
  studentName: string;
  className: string;
  sectionName?: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Leave';
  markedByName?: string;
}

interface AttendanceStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  attendanceRate: number;
}

const STATUS_COLORS: Record<string, string> = {
  Present: '#059669',
  Absent:  '#dc2626',
  Late:    '#d97706',
  Leave:   '#7c3aed',
};

function StatBox({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <View style={[styles.statBox, { borderLeftColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Simple inline date-step picker (prev/next day buttons + display) */
function DatePicker({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const { primaryColor } = useSchoolTheme();
  const dt = new Date(date);

  function changeDay(delta: number) {
    const next = new Date(dt);
    next.setDate(next.getDate() + delta);
    // Do not allow future dates
    if (next > new Date()) return;
    onChange(next.toISOString().split('T')[0]);
  }

  const formatted = dt.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const isToday = date === new Date().toISOString().split('T')[0];

  return (
    <View style={styles.datePicker}>
      <TouchableOpacity onPress={() => changeDay(-1)} style={styles.dateArrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="chevron-left" size={20} color={primaryColor} />
      </TouchableOpacity>

      <View style={styles.dateCenter}>
        <Feather name="calendar" size={14} color={primaryColor} />
        <Text style={[styles.dateText, { color: primaryColor }]}>{formatted}</Text>
        {isToday && (
          <View style={[styles.todayBadge, { backgroundColor: `${primaryColor}18` }]}>
            <Text style={[styles.todayText, { color: primaryColor }]}>Today</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        onPress={() => changeDay(1)}
        style={[styles.dateArrow, isToday && { opacity: 0.3 }]}
        disabled={isToday}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="chevron-right" size={20} color={primaryColor} />
      </TouchableOpacity>
    </View>
  );
}

export default function AdminAttendanceScreen() {
  const { primaryColor } = useSchoolTheme();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const statsQuery = useQuery<AttendanceStats>({
    queryKey: ['admin-attendance-stats', selectedDate],
    queryFn: () =>
      (apiClient.get('/attendance/stats', { params: { date: selectedDate } }) as Promise<any>)
        .then((res: any) => res?.stats ?? res ?? {}),
    staleTime: 3 * 60 * 1000,
  });

  const recordsQuery = useQuery<{ items: AttendanceRecord[]; totalCount: number }>({
    queryKey: ['admin-attendance-records', selectedDate, statusFilter],
    queryFn: () =>
      apiClient.get('/attendance/records', {
        params: { date: selectedDate, pageSize: 100, status: statusFilter || undefined },
      }) as Promise<{ items: AttendanceRecord[]; totalCount: number }>,
    staleTime: 3 * 60 * 1000,
  });

  const stats  = statsQuery.data;
  const records = recordsQuery.data?.items ?? [];

  const statFilters = [
    { label: 'All', value: null, color: VITANA_COLORS.text },
    { label: 'Present', value: 'Present', color: '#059669' },
    { label: 'Absent', value: 'Absent', color: '#dc2626' },
    { label: 'Late', value: 'Late', color: '#d97706' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Attendance Overview" />

      {/* Date Picker */}
      <DatePicker date={selectedDate} onChange={setSelectedDate} />

      {/* Stats */}
      {statsQuery.isLoading ? (
        <View style={{ padding: 24, alignItems: 'center' }}><ActivityIndicator color={primaryColor} /></View>
      ) : stats ? (
        <View style={styles.statsRow}>
          <StatBox label="Present" value={stats.presentToday ?? 0} color="#059669" />
          <StatBox label="Absent"  value={stats.absentToday ?? 0}  color="#dc2626" />
          <StatBox label="Late"    value={stats.lateToday ?? 0}    color="#d97706" />
          <StatBox label="Rate"    value={`${(stats.attendanceRate ?? 0).toFixed(1)}%`} color={primaryColor} />
        </View>
      ) : null}

      {/* Status Filter Chips */}
      <View style={styles.filterRow}>
        {statFilters.map((f) => (
          <TouchableOpacity
            key={String(f.value)}
            style={[
              styles.filterChip,
              statusFilter === f.value && { backgroundColor: `${f.color}18`, borderColor: f.color },
            ]}
            onPress={() => setStatusFilter(statusFilter === f.value ? null : f.value)}
          >
            <Text style={[styles.filterText, statusFilter === f.value && { color: f.color, fontWeight: '700' }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Records list */}
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={recordsQuery.isRefetching || statsQuery.isRefetching}
            onRefresh={() => { void recordsQuery.refetch(); void statsQuery.refetch(); }}
            tintColor={primaryColor}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.record}>
            <View style={styles.recordLeft}>
              <Text style={styles.recordName}>{item.studentName}</Text>
              <Text style={styles.recordClass}>
                {item.className}{item.sectionName ? ` – ${item.sectionName}` : ''}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status] ?? '#6b7280'}18` }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] ?? '#6b7280' }]}>
                {item.status}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />}
        ListEmptyComponent={
          recordsQuery.isLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator color={primaryColor} />
            </View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center', gap: 8 }}>
              <Feather name="check-square" size={32} color={VITANA_COLORS.border} />
              <Text style={{ color: VITANA_COLORS.textSecondary }}>
                {statusFilter
                  ? `No ${statusFilter.toLowerCase()} records for this date`
                  : 'No attendance records for this date'}
              </Text>
              <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                Teachers submit attendance from their app. Records will appear here.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  datePicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  dateArrow: { padding: 6 },
  dateCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  dateText: { fontSize: 13, fontWeight: '600' },
  todayBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  todayText: { fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14, borderLeftWidth: 3, margin: 6, borderRadius: 8, backgroundColor: '#f9fafb' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  filterRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  filterText: { fontSize: 12, fontWeight: '500', color: VITANA_COLORS.textSecondary },
  record: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  recordLeft: { flex: 1 },
  recordName: { fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text },
  recordClass: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '700' },
});
