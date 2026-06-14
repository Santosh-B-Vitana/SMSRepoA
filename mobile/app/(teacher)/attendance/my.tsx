import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave' | 'half_day';
  checkInTime?: string | null;
  checkOutTime?: string | null;
  remarks?: string | null;
  leaveTypeName?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  present:  { label: 'Present',   color: '#15803d', bg: '#dcfce7', dot: '#16a34a' },
  absent:   { label: 'Absent',    color: '#dc2626', bg: '#fef2f2', dot: '#ef4444' },
  late:     { label: 'Late',      color: '#d97706', bg: '#fef9c3', dot: '#f59e0b' },
  leave:    { label: 'On Leave',  color: '#7c3aed', bg: '#ede9fe', dot: '#8b5cf6' },
  half_day: { label: 'Half Day',  color: '#0891b2', bg: '#e0f2fe', dot: '#0ea5e9' },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['S','M','T','W','T','F','S'];

// ─── Calendar ─────────────────────────────────────────────────────────────────

function AttendanceCalendar({
  records,
  year,
  month,
  primaryColor,
}: {
  records: AttendanceRecord[];
  year: number;
  month: number; // 0-indexed
  primaryColor: string;
}) {
  const today = new Date();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const recordMap: Record<number, AttendanceRecord> = {};
  records.forEach((r) => {
    const d = new Date(r.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      recordMap[d.getDate()] = r;
    }
  });

  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <View>
      {/* Day headers */}
      <View style={styles.calendarRow}>
        {DAYS.map((d, i) => (
          <View key={i} style={styles.calCell}>
            <Text style={[styles.calDayHeader, i === 0 && { color: '#ef4444' }]}>{d}</Text>
          </View>
        ))}
      </View>
      {/* Weeks */}
      {chunkArray(cells, 7).map((week, wi) => (
        <View key={wi} style={styles.calendarRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={styles.calCell} />;
            const rec = recordMap[day];
            const cfg = rec ? STATUS_CONFIG[rec.status] ?? STATUS_CONFIG.absent : null;
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <View key={di} style={styles.calCell}>
                <View
                  style={[
                    styles.calDayWrap,
                    cfg && { backgroundColor: cfg.bg },
                    isToday && { borderWidth: 1.5, borderColor: primaryColor },
                  ]}
                >
                  <Text style={[styles.calDayNum, cfg && { color: cfg.color }]}>{day}</Text>
                  {cfg && <View style={[styles.calDot, { backgroundColor: cfg.dot }]} />}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MyAttendanceScreen() {
  const { primaryColor } = useSchoolTheme();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const fromDate = new Date(year, month, 1).toISOString().split('T')[0];
  const toDate   = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const { data: allRecords = [], isLoading, refetch, isFetching } = useQuery<AttendanceRecord[]>({
    queryKey: ['my-attendance', year],
    queryFn: () =>
      (apiClient.get('/attendance/my-attendance', {
        params: { fromDate: `${year}-01-01`, toDate: `${year}-12-31` },
      }) as Promise<any>).then((r) => (Array.isArray(r) ? r : r?.items ?? r?.records ?? [])),
    staleTime: 5 * 60 * 1000,
  });

  const monthRecords = allRecords.filter((r) => {
    const d = new Date(r.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  // Stats for full year
  const presentCount  = allRecords.filter((r) => r.status === 'present').length;
  const absentCount   = allRecords.filter((r) => r.status === 'absent').length;
  const lateCount     = allRecords.filter((r) => r.status === 'late').length;
  const leaveCount    = allRecords.filter((r) => r.status === 'leave' || r.status === 'half_day').length;
  const total         = allRecords.length;
  const attendancePct = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  // Month stats
  const mPresent = monthRecords.filter((r) => r.status === 'present').length;
  const mAbsent  = monthRecords.filter((r) => r.status === 'absent').length;
  const mLate    = monthRecords.filter((r) => r.status === 'late').length;
  const mLeave   = monthRecords.filter((r) => r.status === 'leave' || r.status === 'half_day').length;

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="My Attendance" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={primaryColor} />}
      >
        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={primaryColor} size="large" /></View>
        ) : (
          <>
            {/* Year stats */}
            <View style={styles.yearStats}>
              <View style={styles.yearStatRow}>
                <Text style={styles.yearLabel}>{year} Overview</Text>
                <View style={[styles.pctBadge, { backgroundColor: `${primaryColor}15` }]}>
                  <Text style={[styles.pctText, { color: primaryColor }]}>{attendancePct}%</Text>
                </View>
              </View>
              <View style={styles.statsGrid}>
                <StatBox label="Present" value={presentCount} color="#15803d" bg="#dcfce7" />
                <StatBox label="Absent"  value={absentCount}  color="#dc2626" bg="#fef2f2" />
                <StatBox label="Late"    value={lateCount}    color="#d97706" bg="#fef9c3" />
                <StatBox label="Leave"   value={leaveCount}   color="#7c3aed" bg="#ede9fe" />
              </View>
              {/* Attendance bar */}
              <View style={styles.barWrap}>
                <View style={[styles.barFill, { width: `${attendancePct}%` as any, backgroundColor: primaryColor }]} />
              </View>
            </View>

            {/* Month navigator */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                <Feather name="chevron-left" size={20} color={VITANA_COLORS.text} />
              </TouchableOpacity>
              <View style={styles.monthInfo}>
                <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
                <Text style={styles.monthSub}>
                  {mPresent}P · {mAbsent}A · {mLate}L · {mLeave} Leave
                </Text>
              </View>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                <Feather name="chevron-right" size={20} color={VITANA_COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Calendar */}
            <View style={styles.calendarWrap}>
              <AttendanceCalendar
                records={allRecords}
                year={year}
                month={month}
                primaryColor={primaryColor}
              />
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <View key={key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: cfg.dot }]} />
                  <Text style={styles.legendLabel}>{cfg.label}</Text>
                </View>
              ))}
            </View>

            {/* Monthly record list */}
            {monthRecords.length > 0 && (
              <View style={styles.listSection}>
                <Text style={styles.listTitle}>Records — {MONTHS[month]}</Text>
                {[...monthRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((rec) => {
                  const cfg = STATUS_CONFIG[rec.status] ?? STATUS_CONFIG.absent;
                  const d = new Date(rec.date);
                  const checkIn  = rec.checkInTime  ? String(rec.checkInTime).slice(0, 5) : null;
                  const checkOut = rec.checkOutTime ? String(rec.checkOutTime).slice(0, 5) : null;
                  return (
                    <View key={rec.id} style={styles.recordRow}>
                      <View style={[styles.recordDateBox, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.recordDay, { color: cfg.color }]}>{d.getDate()}</Text>
                        <Text style={[styles.recordWeekday, { color: cfg.color }]}>
                          {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
                          <View style={[styles.statusChipDot, { backgroundColor: cfg.dot }]} />
                          <Text style={[styles.statusChipText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                        {(checkIn || checkOut) && (
                          <Text style={styles.recordTime}>
                            {checkIn ? `In: ${checkIn}` : ''}
                            {checkIn && checkOut ? '  ·  ' : ''}
                            {checkOut ? `Out: ${checkOut}` : ''}
                          </Text>
                        )}
                        {rec.remarks && <Text style={styles.recordRemarks} numberOfLines={1}>{rec.remarks}</Text>}
                        {rec.leaveTypeName && <Text style={styles.recordRemarks}>{rec.leaveTypeName}</Text>}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <View style={[styles.statBox, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: VITANA_COLORS.background },
  center: { padding: 60, alignItems: 'center' },

  yearStats: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: VITANA_COLORS.border },
  yearStatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  yearLabel: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text },
  pctBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  pctText: { fontSize: 14, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 10, fontWeight: '500', marginTop: 1 },
  barWrap: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
  },
  navBtn: { padding: 8 },
  monthInfo: { alignItems: 'center' },
  monthTitle: { fontSize: 16, fontWeight: '700', color: VITANA_COLORS.text },
  monthSub: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },

  calendarWrap: { backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 12 },
  calendarRow: { flexDirection: 'row', marginBottom: 4 },
  calCell: { flex: 1, alignItems: 'center' },
  calDayHeader: { fontSize: 11, fontWeight: '700', color: VITANA_COLORS.textSecondary, marginBottom: 4 },
  calDayWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', gap: 2 },
  calDayNum: { fontSize: 12, fontWeight: '600', color: VITANA_COLORS.text },
  calDot: { width: 4, height: 4, borderRadius: 2 },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: VITANA_COLORS.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary },

  listSection: { margin: 16, gap: 8 },
  listTitle: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 4 },
  recordRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: VITANA_COLORS.border,
  },
  recordDateBox: { width: 44, borderRadius: 10, alignItems: 'center', paddingVertical: 6 },
  recordDay: { fontSize: 18, fontWeight: '700' },
  recordWeekday: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 4 },
  statusChipDot: { width: 5, height: 5, borderRadius: 3 },
  statusChipText: { fontSize: 11, fontWeight: '600' },
  recordTime: { fontSize: 12, color: VITANA_COLORS.textSecondary },
  recordRemarks: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
});
