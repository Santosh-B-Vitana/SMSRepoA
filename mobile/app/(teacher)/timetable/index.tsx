import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi, type TeacherScheduleEntry } from '@/api/endpoints/teacher';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonCard } from '@/components/common/SkeletonLoader';
import { VITANA_COLORS, VITANA_SHADOWS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
type DayKey = (typeof DAYS)[number];

function getTodayName(): DayKey {
  const name = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  return (DAYS as readonly string[]).includes(name) ? (name as DayKey) : 'Monday';
}

function formatTime(t: string): string {
  // Handles HH:MM:SS or HH:MM
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function PeriodCard({ period, primaryColor }: { period: TeacherScheduleEntry; primaryColor: string }) {
  return (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: '/(teacher)/attendance/[classId]',
          params: { classId: period.classId },
        })
      }
      activeOpacity={0.7}
      style={[styles.card, VITANA_SHADOWS.sm]}
    >
      <View style={[styles.badge, { backgroundColor: `${primaryColor}15` }]}>
        <Text style={[styles.badgePeriod, { color: primaryColor }]}>P{period.periodNumber}</Text>
        <Text style={[styles.badgeTime, { color: primaryColor }]}>{formatTime(period.startTime)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.subject}>{period.subjectName ?? 'Free Period'}</Text>
        <Text style={styles.meta}>
          {period.className ?? ''}
          {period.sectionName ? ` · ${period.sectionName}` : ''}
          {period.room ? ` · Room ${period.room}` : ''}
        </Text>
        <Text style={styles.time}>
          {formatTime(period.startTime)} – {formatTime(period.endTime)}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={VITANA_COLORS.textSecondary} />
    </TouchableOpacity>
  );
}

export default function Timetable() {
  const { primaryColor } = useSchoolTheme();
  const todayName = getTodayName();
  const [selectedDay, setSelectedDay] = useState<DayKey>(todayName);

  const { data: scheduleData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['timetable-full'],
    queryFn: teacherApi.getFullSchedule,
    staleTime: 30 * 60 * 1000,
  });

  const schedule = scheduleData?.schedule ?? [];
  const dayPeriods = schedule
    .filter((p) => p.dayOfWeek === selectedDay)
    .sort((a, b) => a.periodNumber - b.periodNumber);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: VITANA_COLORS.surface }} edges={['top']}>
      <SubScreenHeader
        title="My Schedule"
        subtitle={scheduleData ? `${scheduleData.totalPeriods} periods this week` : 'Weekly timetable'}
      />

      {/* Day selector */}
      <View style={styles.dayBar}>
        {DAYS.map((day, i) => {
          const isToday = day === todayName;
          const isSelected = day === selectedDay;
          const dayPeriodCount = schedule.filter((p) => p.dayOfWeek === day).length;
          return (
            <TouchableOpacity
              key={day}
              onPress={() => setSelectedDay(day)}
              style={[
                styles.dayBtn,
                isSelected && { backgroundColor: primaryColor },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayLabel,
                  isSelected
                    ? { color: '#fff', fontWeight: '700' }
                    : { color: isToday ? primaryColor : VITANA_COLORS.textSecondary },
                ]}
              >
                {SHORT_DAYS[i]}
              </Text>
              {dayPeriodCount > 0 && !isSelected && (
                <View
                  style={[
                    styles.periodDot,
                    { backgroundColor: isToday ? primaryColor : VITANA_COLORS.textSecondary },
                  ]}
                />
              )}
              {isToday && isSelected && (
                <Text style={[styles.todayPill, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                  Today
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={{ padding: 16, paddingBottom: 32, gap: 10 }}>
          {isLoading ? (
            [1, 2, 3, 4].map((i) => <SkeletonCard key={i} lines={2} />)
          ) : dayPeriods.length === 0 ? (
            <EmptyState
              icon="calendar"
              title={`No classes on ${selectedDay}`}
              subtitle={
                selectedDay === todayName
                  ? 'You have no periods scheduled today.'
                  : 'No classes scheduled for this day.'
              }
            />
          ) : (
            dayPeriods.map((period) => (
              <PeriodCard key={period.periodId} period={period} primaryColor={primaryColor} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  dayBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
    gap: 4,
  },
  dayBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 3,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  periodDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.6,
  },
  todayPill: {
    fontSize: 9,
    color: '#fff',
    fontFamily: 'Inter',
    fontWeight: '600',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgePeriod: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter' },
  badgeTime: { fontSize: 10, fontFamily: 'Inter', marginTop: 1 },
  subject: {
    fontSize: 15,
    fontWeight: '600',
    color: VITANA_COLORS.text,
    fontFamily: 'Inter',
  },
  meta: {
    fontSize: 12,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    marginTop: 2,
  },
  time: {
    fontSize: 11,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    marginTop: 2,
  },
});
