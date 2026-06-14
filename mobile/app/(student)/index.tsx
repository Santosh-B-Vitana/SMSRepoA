import { ScrollView, View, Text, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { studentApi } from '@/api/endpoints/student';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { formatRelativeTime } from '@vitana/shared-utils';
import { VITANA_COLORS } from '@/theme/tokens';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';

export default function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  const { primaryColor, schoolName } = useSchoolTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: studentApi.getDashboard,
    staleTime: 5 * 60 * 1000,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.fullName?.split(' ')[0] ?? 'Student';
  const unreadCount = data?.unreadCount ?? 0;
  const attendanceTotal = data?.attendanceThisMonth?.totalWorkingDaysThisMonth ?? 0;
  const attendancePresent = data?.attendanceThisMonth?.presentDaysThisMonth ?? 0;
  const attendancePercent = attendanceTotal > 0 ? (attendancePresent / attendanceTotal) * 100 : 0;
  const attendanceVariant = attendancePercent >= 75 ? 'success' : 'error';

  const notifBtn = (
    <TouchableOpacity
      onPress={() => router.push('/(student)/notifications')}
      style={styles.headerBtn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Feather name="bell" size={20} color="#ffffff" />
      {unreadCount > 0 ? (
        <View style={styles.notifDot} />
      ) : null}
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
          {/* Greeting */}
          <View style={styles.greetingRow}>
            <View style={styles.greetingText}>
              <Text style={styles.greetingSub}>{greeting},</Text>
              <Text style={styles.greetingName}>{firstName} 👋</Text>
            </View>
            <Avatar name={user?.fullName} size="md" />
          </View>

          {/* Stats */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
            <View style={styles.statsRow}>
              <StatCard
                label="Attendance"
                value={isLoading ? '–' : `${attendancePercent.toFixed(0)}%`}
                icon="user-check"
                iconColor={attendancePercent >= 75 ? VITANA_COLORS.success : VITANA_COLORS.error}
              />
              <StatCard
                label="Pending Tasks"
                value={isLoading ? '–' : data?.dueSoonAssignments?.length ?? 0}
                icon="book-open"
                iconColor={primaryColor}
              />
              <StatCard
                label="Latest Grade"
                value={isLoading ? '–' : data?.latestResult?.grade ?? '—'}
                icon="award"
                iconColor="#7c3aed"
              />
            </View>
          </ScrollView>

          {/* Today's Schedule */}
          <SectionCard
            title="Today's Schedule"
            icon="clock"
            iconColor={primaryColor}
            onViewAll={() => router.push('/(student)/timetable/index')}
            noPadding
          >
            {isLoading ? (
              <View style={styles.skeletonPad}>
                <SkeletonLoader height={60} borderRadius={10} />
                <SkeletonLoader height={60} borderRadius={10} />
              </View>
            ) : (data?.todaySchedule ?? []).length === 0 ? (
              <EmptyState
                icon="coffee"
                title="No classes today"
                subtitle="Enjoy your free day!"
                iconColor={VITANA_COLORS.textSecondary}
                style={styles.emptyCard}
              />
            ) : (
              (data?.todaySchedule ?? []).map((p, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.periodRow,
                    p.isCurrentPeriod && { backgroundColor: `${primaryColor}08` },
                    idx < (data?.todaySchedule ?? []).length - 1 && styles.rowBorder,
                  ]}
                >
                  {p.isCurrentPeriod ? (
                    <View style={[styles.currentDot, { backgroundColor: primaryColor }]} />
                  ) : null}
                  <View style={[styles.timeBadge, { backgroundColor: `${primaryColor}12` }]}>
                    <Text style={[styles.timeText, { color: primaryColor }]}>{p.startTime}</Text>
                    <Text style={[styles.timeSub, { color: primaryColor }]}>{p.endTime}</Text>
                  </View>
                  <View style={styles.periodInfo}>
                    <Text style={styles.periodSubject}>{p.subjectName}</Text>
                    <Text style={styles.periodMeta}>{p.teacherName}</Text>
                  </View>
                  {p.isCurrentPeriod ? (
                    <Badge label="Now" variant="primary" size="sm" />
                  ) : null}
                </View>
              ))
            )}
          </SectionCard>

          {/* Due Assignments */}
          {(data?.dueSoonAssignments?.length ?? 0) > 0 || isLoading ? (
            <SectionCard
              title="Due Soon"
              icon="alert-circle"
              iconColor={VITANA_COLORS.warning}
              onViewAll={() => router.push('/(student)/assignments/index')}
              noPadding
            >
              {isLoading ? (
                <View style={styles.skeletonPad}>
                  <SkeletonLoader height={50} borderRadius={8} />
                  <SkeletonLoader height={50} borderRadius={8} />
                </View>
              ) : (
                (data?.dueSoonAssignments ?? []).slice(0, 3).map((a, idx) => (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => router.push({ pathname: '/(student)/assignments/[id]', params: { id: a.id } })}
                    style={[styles.assignmentRow, idx < Math.min((data?.dueSoonAssignments ?? []).length, 3) - 1 && styles.rowBorder]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.assignmentDot, { backgroundColor: a.isOverdue ? VITANA_COLORS.error : primaryColor }]} />
                    <View style={styles.assignmentInfo}>
                      <Text style={styles.assignmentTitle} numberOfLines={1}>{a.title}</Text>
                      <Text style={styles.assignmentMeta}>{a.subjectName} · Due {a.dueDate.split('T')[0]}</Text>
                    </View>
                    {a.isOverdue ? <Badge label="Overdue" variant="error" size="sm" /> : null}
                  </TouchableOpacity>
                ))
              )}
            </SectionCard>
          ) : null}

          {/* Latest Announcement */}
          {data?.latestAnnouncement ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push('/(student)/announcements')}
              style={styles.announcementCard}
            >
              <View style={[styles.announcementIcon, { backgroundColor: `${primaryColor}12` }]}>
                <Feather name="volume-2" size={18} color={primaryColor} />
              </View>
              <View style={styles.announcementInfo}>
                <Text style={styles.announcementLabel}>Latest Announcement</Text>
                <Text style={styles.announcementTitle} numberOfLines={1}>{data.latestAnnouncement.title}</Text>
                <Text style={styles.announcementTime}>{formatRelativeTime(data.latestAnnouncement.createdAt)}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}

          {/* Quick Actions */}
          <SectionCard title="Quick Access" icon="grid" iconColor={primaryColor} noPadding>
            <View style={styles.quickGrid}>
              {STUDENT_ACTIONS.map((action) => (
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

const STUDENT_ACTIONS = [
  { label: 'Results', icon: 'award', route: '/(student)/results/index', color: '#7c3aed' },
  { label: 'Attendance', icon: 'user-check', route: '/(student)/attendance/index', color: VITANA_COLORS.success },
  { label: 'Assignments', icon: 'book-open', route: '/(student)/assignments/index', color: VITANA_COLORS.primary },
  { label: 'Fees', icon: 'credit-card', route: '/(student)/fees/index', color: '#059669' },
  { label: 'Leaves', icon: 'calendar', route: '/(student)/leaves/index', color: VITANA_COLORS.warning },
  { label: 'Library', icon: 'book', route: '/(student)/library/index', color: '#0891b2' },
];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: VITANA_COLORS.surface },
  scroll: { flex: 1 },
  body: { padding: 16, paddingBottom: 32, gap: 14 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: VITANA_COLORS.error,
    borderWidth: 1.5, borderColor: VITANA_COLORS.primary,
  },
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  greetingText: { flex: 1 },
  greetingSub: { fontSize: 13, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter' },
  greetingName: { fontSize: 22, fontWeight: '700', color: VITANA_COLORS.text, fontFamily: 'Poppins', marginTop: 2 },
  statsScroll: { marginHorizontal: -16 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  skeletonPad: { padding: 16, gap: 8 },
  emptyCard: { paddingVertical: 28 },
  periodRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  currentDot: {
    position: 'absolute', left: 6,
    width: 4, height: 40, borderRadius: 2,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border },
  timeBadge: {
    width: 52, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  timeText: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter' },
  timeSub: { fontSize: 9, fontFamily: 'Inter', marginTop: 1, opacity: 0.7 },
  periodInfo: { flex: 1 },
  periodSubject: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text, fontFamily: 'Inter' },
  periodMeta: { fontSize: 12, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', marginTop: 2 },
  assignmentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13, gap: 12,
  },
  assignmentDot: { width: 8, height: 8, borderRadius: 4 },
  assignmentInfo: { flex: 1 },
  assignmentTitle: { fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text, fontFamily: 'Inter' },
  assignmentMeta: { fontSize: 12, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', marginTop: 2 },
  announcementCard: {
    backgroundColor: VITANA_COLORS.background,
    borderRadius: 14, borderWidth: 1, borderColor: VITANA_COLORS.border,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  announcementIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  announcementInfo: { flex: 1 },
  announcementLabel: { fontSize: 10, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: 0.5 },
  announcementTitle: { fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text, fontFamily: 'Inter', marginTop: 2 },
  announcementTime: { fontSize: 11, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', marginTop: 2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  quickItem: { width: '30%', flexGrow: 1, alignItems: 'center', paddingVertical: 14, gap: 8, borderRadius: 12, backgroundColor: VITANA_COLORS.surface },
  quickIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '500', color: VITANA_COLORS.text, fontFamily: 'Inter', textAlign: 'center' },
});
