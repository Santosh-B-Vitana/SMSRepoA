import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi } from '@/api/endpoints/teacher';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonCard } from '@/components/common/SkeletonLoader';
import { VITANA_COLORS, VITANA_SHADOWS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import type { TimetableEntry } from '@/api/endpoints/teacher';

function PeriodCard({ period, primaryColor }: { period: TimetableEntry; primaryColor: string }) {
  return (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: '/(teacher)/attendance/[classId]',
          params: { classId: period.classId },
        })
      }
      activeOpacity={0.7}
      style={[periodStyles.card, VITANA_SHADOWS.sm]}
    >
      <View style={[periodStyles.badge, { backgroundColor: `${primaryColor}15` }]}>
        <Text style={[periodStyles.badgePeriod, { color: primaryColor }]}>P{period.periodNumber}</Text>
        <Text style={[periodStyles.badgeTime, { color: primaryColor }]}>{period.startTime}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={periodStyles.subject}>{period.subjectName}</Text>
        <Text style={periodStyles.meta}>
          {period.className}{period.room ? ` · Room ${period.room}` : ''}
        </Text>
        <Text style={periodStyles.time}>{period.startTime} – {period.endTime}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={VITANA_COLORS.textSecondary} />
    </TouchableOpacity>
  );
}

const periodStyles = StyleSheet.create({
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
    width: 52, height: 52, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  badgePeriod: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter' },
  badgeTime: { fontSize: 10, fontFamily: 'Inter', marginTop: 1 },
  subject: { fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text, fontFamily: 'Inter' },
  meta: { fontSize: 12, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', marginTop: 2 },
  time: { fontSize: 11, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', marginTop: 2 },
});

export default function Timetable() {
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['timetable'],
    queryFn: teacherApi.getTodaySchedule,
    staleTime: 30 * 60 * 1000,
  });

  const todayDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: VITANA_COLORS.surface }} edges={['top']}>
      <SubScreenHeader title="Today's Schedule" subtitle={todayDate} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={{ padding: 16, paddingBottom: 32, gap: 10 }}>
          {isLoading ? (
            [1, 2, 3, 4].map((i) => <SkeletonCard key={i} lines={2} />)
          ) : !data || data.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No classes today"
              subtitle="You have no periods scheduled for today."
            />
          ) : (
            data.map((period) => (
              <PeriodCard key={period.id} period={period} primaryColor={primaryColor} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
