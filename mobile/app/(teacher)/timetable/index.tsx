import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi } from '@/api/endpoints/teacher';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonCard } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/common/EmptyState';
import { VITANA_COLORS } from '@/theme/tokens';
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
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: VITANA_COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Period number */}
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: `${primaryColor}18`,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '700', color: primaryColor }}>P{period.periodNumber}</Text>
        <Text style={{ fontSize: 10, color: primaryColor }}>{period.startTime}</Text>
      </View>

      {/* Subject + class */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>
          {period.subjectName}
        </Text>
        <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
          {period.className}
          {period.room ? ` · Room ${period.room}` : ''}
        </Text>
        <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
          {period.startTime} – {period.endTime}
        </Text>
      </View>

      <Feather name="chevron-right" size={16} color={VITANA_COLORS.border} />
    </TouchableOpacity>
  );
}

export default function Timetable() {
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['timetable'],
    queryFn: teacherApi.getTodaySchedule,
    staleTime: 30 * 60 * 1000,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
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
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text }}>
          Today's Schedule
        </Text>
        <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
        </Text>
      </View>

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
