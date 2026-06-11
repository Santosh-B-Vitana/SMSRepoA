import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { parentApi } from '@/api/endpoints/parent';
import { AttendanceBadge } from '@/components/common/AttendanceBadge';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type DayStatus = 'Present' | 'Absent' | 'Late' | 'Holiday' | 'HalfDay' | 'Future' | 'Weekend';

const STATUS_STYLES: Record<DayStatus, { bg: string; border: string; text: string }> = {
  Present: { bg: '#dcfce7', border: '#16a34a', text: '#16a34a' },
  Absent: { bg: '#fee2e2', border: '#ef4444', text: '#ef4444' },
  Late: { bg: '#fef3c7', border: '#f59e0b', text: '#d97706' },
  HalfDay: { bg: '#e0f2fe', border: '#0ea5e9', text: '#0369a1' },
  Holiday: { bg: '#f1f5f9', border: '#cbd5e1', text: '#94a3b8' },
  Future: { bg: '#f8fafc', border: '#f1f5f9', text: '#e2e8f0' },
  Weekend: { bg: '#f8fafc', border: '#f1f5f9', text: '#cbd5e1' },
};

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default function AttendanceCalendar() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const { primaryColor } = useSchoolTheme();
  const today = new Date();

  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', studentId, viewMonth, viewYear],
    queryFn: () => parentApi.getAttendance(studentId!, viewMonth, viewYear),
    staleTime: 10 * 60 * 1000,
    enabled: !!studentId,
  });

  function navigateMonth(direction: -1 | 1) {
    const d = new Date(viewYear, viewMonth - 1 + direction, 1);
    setViewMonth(d.getMonth() + 1);
    setViewYear(d.getFullYear());
  }

  const isCurrentMonth = viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();

  // Build calendar grid
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const recordMap = new Map(
    (data?.records ?? []).map((r) => [new Date(r.date).getDate(), r.status as DayStatus]),
  );

  function getCellStatus(day: number | null, colIndex: number): DayStatus {
    if (day === null) return 'Future';
    const isWeekend = colIndex === 0 || colIndex === 6;
    if (isWeekend) return recordMap.get(day) ?? 'Weekend';
    const cellDate = new Date(viewYear, viewMonth - 1, day);
    if (cellDate > today) return 'Future';
    return recordMap.get(day) ?? 'Future';
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      {/* Back header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}>
          Attendance
        </Text>
        {data ? <AttendanceBadge percentage={data.attendancePercent} size="sm" /> : null}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16, gap: 12 }}>
          {/* Month Navigator */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#fff',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: VITANA_COLORS.border,
            }}
          >
            <TouchableOpacity
              onPress={() => navigateMonth(-1)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="chevron-left" size={22} color={primaryColor} />
            </TouchableOpacity>
            <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>
              {MONTH_NAMES[viewMonth - 1]} {viewYear}
            </Text>
            <TouchableOpacity
              onPress={() => navigateMonth(1)}
              disabled={isCurrentMonth}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather
                name="chevron-right"
                size={22}
                color={isCurrentMonth ? VITANA_COLORS.border : primaryColor}
              />
            </TouchableOpacity>
          </View>

          {/* Calendar Grid */}
          {isLoading ? (
            <SkeletonLoader height={280} borderRadius={12} />
          ) : (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: VITANA_COLORS.border,
              }}
            >
              {/* Day headers */}
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border }}>
                {WEEK_DAYS.map((d, i) => (
                  <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: VITANA_COLORS.textSecondary }}>
                      {d}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Calendar rows */}
              {Array.from({ length: cells.length / 7 }, (_, row) => (
                <View key={row} style={{ flexDirection: 'row' }}>
                  {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                    if (day === null) {
                      return <View key={col} style={{ flex: 1, aspectRatio: 1, padding: 3 }} />;
                    }
                    const status = getCellStatus(day, col);
                    const styles = STATUS_STYLES[status];
                    const isToday =
                      day === today.getDate() && isCurrentMonth;

                    return (
                      <View key={col} style={{ flex: 1, aspectRatio: 1, padding: 3 }}>
                        <View
                          style={{
                            flex: 1,
                            borderRadius: 8,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: styles.bg,
                            borderWidth: isToday ? 2 : 1,
                            borderColor: isToday ? primaryColor : styles.border,
                          }}
                        >
                          <Text style={{ fontSize: 12, color: styles.text, fontWeight: isToday ? '700' : '400' }}>
                            {day}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          {/* Legend */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[
              { label: 'Present', ...STATUS_STYLES.Present },
              { label: 'Absent', ...STATUS_STYLES.Absent },
              { label: 'Late', ...STATUS_STYLES.Late },
              { label: 'Holiday', ...STATUS_STYLES.Holiday },
            ].map(({ label, bg, border }) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: bg, borderWidth: 1, borderColor: border }}
                />
                <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Month Summary */}
          {data && (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: VITANA_COLORS.border,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text, marginBottom: 12 }}>
                Month Summary
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {[
                  { label: 'Present', value: data.presentDays, color: '#16a34a' },
                  { label: 'Absent', value: data.absentDays, color: '#ef4444' },
                  { label: 'Late', value: data.lateDays, color: '#d97706' },
                  { label: 'Working', value: data.totalWorkingDays, color: VITANA_COLORS.textSecondary },
                ].map(({ label, value, color }) => (
                  <View key={label} style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 22, fontWeight: '700', color }}>{value}</Text>
                    <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Shortage Alert */}
          {data && data.attendancePercent < 75 && (
            <View
              style={{
                backgroundColor: '#fff5f5',
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: '#fca5a5',
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <Feather name="alert-triangle" size={16} color="#dc2626" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#dc2626' }}>
                  Attendance Shortage
                </Text>
                <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 2, lineHeight: 18 }}>
                  Attendance is below the required 75%. Please ensure regular attendance to avoid
                  academic penalties.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
