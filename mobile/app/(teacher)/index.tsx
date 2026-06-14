import { ScrollView, View, Text, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi } from '@/api/endpoints/teacher';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonLoader, SkeletonCard } from '@/components/common/SkeletonLoader';
import { VITANA_COLORS } from '@/theme/tokens';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';

export default function TeacherDashboard() {
  const user = useAuthStore((s) => s.user);
  const { primaryColor, schoolName } = useSchoolTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: teacherApi.getDashboard,
    staleTime: 5 * 60 * 1000,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.fullName?.split(' ')[0] ?? 'Teacher';

  const notifBtn = (
    <TouchableOpacity
      onPress={() => router.push('/(teacher)/notifications')}
      style={styles.headerBtn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Feather name="bell" size={20} color="#ffffff" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={schoolName ?? 'School'}
        primaryColor={primaryColor}
        rightSlot={notifBtn}
        variant="gradient"
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
      >
        <View style={styles.body}>
          {/* Greeting row */}
          <View style={styles.greetingRow}>
            <View style={styles.greetingText}>
              <Text style={styles.greetingSub}>{greeting},</Text>
              <Text style={styles.greetingName}>{firstName} 👋</Text>
            </View>
            <Avatar name={user?.fullName} size="md" />
          </View>

          {/* Stats row */}
          {isLoading ? (
            <SkeletonCard lines={1} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
              <View style={styles.statsRow}>
                <StatCard
                  label="Today's Classes"
                  value={data?.todaySchedule?.length ?? 0}
                  icon="book-open"
                  iconColor={primaryColor}
                />
                <StatCard
                  label="Classes Taught"
                  value={data?.classesStatus?.filter((c) => c.attendanceMarked).length ?? 0}
                  icon="check-circle"
                  iconColor={VITANA_COLORS.success}
                />
                <StatCard
                  label="Pending Leaves"
                  value={data?.pendingLeaveCount ?? 0}
                  icon="calendar"
                  iconColor={VITANA_COLORS.warning}
                />
              </View>
            </ScrollView>
          )}

          {/* Today's Classes */}
          <SectionCard
            title="Today's Schedule"
            icon="clock"
            iconColor={primaryColor}
            onViewAll={() => router.push('/(teacher)/timetable')}
            noPadding
          >
            {isLoading ? (
              <View style={styles.skeletonPad}>
                <SkeletonLoader height={56} borderRadius={8} />
                <SkeletonLoader height={56} borderRadius={8} />
              </View>
            ) : !data?.todaySchedule || data.todaySchedule.length === 0 ? (
              <EmptyState
                icon="sun"
                title="No classes today"
                subtitle="You have no scheduled classes for today"
                iconColor={VITANA_COLORS.textSecondary}
                style={styles.emptyCard}
              />
            ) : (
              data.todaySchedule.slice(0, 5).map((period, idx) => (
                <TouchableOpacity
                  key={period.id}
                  onPress={() =>
                    router.push({
                      pathname: '/(teacher)/attendance/[classId]',
                      params: { classId: period.classId },
                    })
                  }
                  style={[
                    styles.periodRow,
                    idx < Math.min(data.todaySchedule.length, 5) - 1 && styles.periodRowBorder,
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.timeBadge, { backgroundColor: `${primaryColor}15` }]}>
                    <Text style={[styles.timeText, { color: primaryColor }]}>{period.startTime}</Text>
                  </View>
                  <View style={styles.periodInfo}>
                    <Text style={styles.periodSubject}>{period.subjectName}</Text>
                    <Text style={styles.periodMeta}>
                      {period.className}{period.room ? ` · Room ${period.room}` : ''}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={VITANA_COLORS.border} />
                </TouchableOpacity>
              ))
            )}
          </SectionCard>

          {/* Attendance Status */}
          {(data?.classesStatus?.length ?? 0) > 0 ? (
            <SectionCard
              title="Attendance Status"
              icon="check-square"
              iconColor={VITANA_COLORS.success}
              noPadding
            >
              {data!.classesStatus.map((cls, idx) => (
                <TouchableOpacity
                  key={cls.classId}
                  onPress={() =>
                    router.push({
                      pathname: '/(teacher)/attendance/[classId]',
                      params: { classId: cls.classId },
                    })
                  }
                  style={[
                    styles.attendanceRow,
                    idx < data!.classesStatus.length - 1 && styles.periodRowBorder,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.className}>{cls.className}</Text>
                  <Badge
                    label={cls.attendanceMarked ? 'Marked' : 'Pending'}
                    variant={cls.attendanceMarked ? 'success' : 'warning'}
                    dot
                    size="sm"
                  />
                </TouchableOpacity>
              ))}
            </SectionCard>
          ) : null}

          {/* Quick Actions */}
          <SectionCard title="Quick Actions" icon="zap" iconColor={primaryColor} noPadding>
            <View style={styles.quickGrid}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={() => router.push(action.route as never)}
                  style={styles.quickItem}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickIcon, { backgroundColor: `${action.color}15` }]}>
                    <Feather name={action.icon as any} size={22} color={action.color} />
                  </View>
                  <Text style={styles.quickLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const QUICK_ACTIONS = [
  { label: 'Classes', icon: 'users', route: '/(teacher)/classes/index', color: VITANA_COLORS.primary },
  { label: 'Marks', icon: 'award', route: '/(teacher)/marks', color: '#7c3aed' },
  { label: 'Assignments', icon: 'book', route: '/(teacher)/assignments', color: '#059669' },
  { label: 'Leaves', icon: 'clipboard', route: '/(teacher)/leaves', color: VITANA_COLORS.warning },
  { label: 'Messages', icon: 'message-square', route: '/(teacher)/messages', color: '#0891b2' },
  { label: 'Announcements', icon: 'volume-2', route: '/(teacher)/announcements', color: '#db2777' },
];

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: VITANA_COLORS.surface,
  },
  scroll: {
    flex: 1,
  },
  body: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  greetingText: {
    flex: 1,
  },
  greetingSub: {
    fontSize: 13,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
  },
  greetingName: {
    fontSize: 22,
    fontWeight: '700',
    color: VITANA_COLORS.text,
    fontFamily: 'Poppins',
    marginTop: 2,
  },
  statsScroll: {
    marginHorizontal: -16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  skeletonPad: {
    padding: 16,
    gap: 8,
  },
  emptyCard: {
    paddingVertical: 28,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  periodRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
  },
  timeBadge: {
    width: 52,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  periodInfo: {
    flex: 1,
  },
  periodSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: VITANA_COLORS.text,
    fontFamily: 'Inter',
  },
  periodMeta: {
    fontSize: 12,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    marginTop: 2,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  className: {
    fontSize: 14,
    fontWeight: '500',
    color: VITANA_COLORS.text,
    fontFamily: 'Inter',
    flex: 1,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 10,
  },
  quickItem: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
    borderRadius: 12,
    backgroundColor: VITANA_COLORS.surface,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: VITANA_COLORS.text,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
});
