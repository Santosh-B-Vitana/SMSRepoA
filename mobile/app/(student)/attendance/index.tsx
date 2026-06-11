import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { studentApi } from '@/api/endpoints/student';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { VITANA_COLORS } from '@/theme/tokens';

const STATUS_COLORS: Record<string, string> = {
  Present: '#16a34a',
  Absent: '#dc2626',
  Late: '#d97706',
  Leave: '#7c3aed',
  Holiday: '#9ca3af',
  HalfDay: '#0369a1',
};

const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export default function AttendanceScreen() {
  const { primaryColor } = useSchoolTheme();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['student-attendance', month, year],
    queryFn: () => studentApi.getAttendance(month, year),
    staleTime: 10 * 60 * 1000,
  });

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    const isCurrentOrFuture = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
    if (isCurrentOrFuture) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const isFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const attendanceMap: Record<string, string> = {};
  (data?.records ?? []).forEach((r) => {
    const day = new Date(r.date).getDate();
    attendanceMap[day] = r.status;
  });

  const percent = data && data.totalWorkingDays > 0
    ? ((data.presentDays / data.totalWorkingDays) * 100).toFixed(1)
    : '0.0';
  const isBelowThreshold = parseFloat(percent) < 75;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}>
          Attendance
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={{ padding: 16, gap: 14 }}>
          {/* Shortage alert */}
          {isBelowThreshold && !isLoading && (
            <View
              style={{
                backgroundColor: '#fee2e2', borderRadius: 12, padding: 14,
                borderWidth: 1, borderColor: '#fca5a5', flexDirection: 'row', gap: 10, alignItems: 'flex-start',
              }}
            >
              <Feather name="alert-triangle" size={18} color="#dc2626" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#dc2626' }}>
                  Attendance Shortage
                </Text>
                <Text style={{ fontSize: 13, color: '#b91c1c', marginTop: 2 }}>
                  Your attendance is {percent}% — below the 75% minimum requirement.
                </Text>
              </View>
            </View>
          )}

          {/* Summary card */}
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: VITANA_COLORS.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>This Month</Text>
              {isLoading ? (
                <SkeletonLoader height={28} width={70} borderRadius={999} />
              ) : (
                <View
                  style={{
                    backgroundColor: isBelowThreshold ? '#fee2e2' : '#dcfce7',
                    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16, fontWeight: '700',
                      color: isBelowThreshold ? '#dc2626' : '#16a34a',
                    }}
                  >
                    {percent}%
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                { label: 'Present', value: data?.presentDays ?? 0, color: '#16a34a' },
                { label: 'Absent', value: data?.absentDays ?? 0, color: '#dc2626' },
                { label: 'Late', value: data?.lateDays ?? 0, color: '#d97706' },
                { label: 'Leave', value: data?.leaveDays ?? 0, color: '#7c3aed' },
              ].map(({ label, value, color }) => (
                <View key={label} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color }}>{isLoading ? '—' : value}</Text>
                  <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Calendar */}
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: VITANA_COLORS.border }}>
            {/* Month nav */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="chevron-left" size={22} color={VITANA_COLORS.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>{monthName}</Text>
              <TouchableOpacity
                onPress={nextMonth}
                disabled={isFutureMonth}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="chevron-right" size={22} color={isFutureMonth ? VITANA_COLORS.border : VITANA_COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {DAYS_SHORT.map((d, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, fontWeight: '600' }}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            {isLoading ? (
              <SkeletonLoader height={180} borderRadius={8} />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {Array.from({ length: firstDay }).map((_, i) => (
                  <View key={`empty-${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const status = attendanceMap[day];
                  const color = status ? STATUS_COLORS[status] : undefined;
                  const isFuture = isCurrentMonth && day > now.getDate();
                  const isToday = isCurrentMonth && day === now.getDate();
                  return (
                    <View
                      key={day}
                      style={{
                        width: `${100 / 7}%`, aspectRatio: 1,
                        alignItems: 'center', justifyContent: 'center', padding: 2,
                      }}
                    >
                      <View
                        style={{
                          width: 32, height: 32, borderRadius: 16,
                          alignItems: 'center', justifyContent: 'center',
                          backgroundColor: color ? color + '25' : isToday ? primaryColor + '20' : 'transparent',
                          borderWidth: isToday ? 1.5 : 0,
                          borderColor: isToday ? primaryColor : 'transparent',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13, fontWeight: isToday ? '700' : '400',
                            color: isFuture ? VITANA_COLORS.border : color ?? VITANA_COLORS.text,
                          }}
                        >
                          {day}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Legend */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: VITANA_COLORS.border }}>
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <View key={status} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                  <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary }}>{status}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
