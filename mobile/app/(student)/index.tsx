import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
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

function AttendanceBadge({ percent }: { percent: number }) {
  const color = percent >= 75 ? '#16a34a' : '#dc2626';
  const bg = percent >= 75 ? '#dcfce7' : '#fee2e2';
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color, fontWeight: '700', fontSize: 13 }}>{percent.toFixed(1)}%</Text>
    </View>
  );
}

function PeriodCard({ subject, teacher, time, isCurrent, primaryColor }: {
  subject: string; teacher: string; time: string; isCurrent: boolean; primaryColor: string;
}) {
  return (
    <View
      style={{
        backgroundColor: isCurrent ? primaryColor + '15' : '#f8fafc',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: isCurrent ? 3 : 0,
        borderLeftColor: primaryColor,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text }}>{subject}</Text>
          <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>{teacher}</Text>
        </View>
        <Text style={{ fontSize: 12, color: isCurrent ? primaryColor : VITANA_COLORS.textSecondary, fontWeight: isCurrent ? '600' : '400' }}>
          {time}
        </Text>
      </View>
    </View>
  );
}

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
  const unreadCount = data?.unreadCount ?? 0;
  const attendancePercent = data?.attendanceThisMonth
    ? data.attendanceThisMonth.totalWorkingDaysThisMonth > 0
      ? (data.attendanceThisMonth.presentDaysThisMonth / data.attendanceThisMonth.totalWorkingDaysThisMonth) * 100
      : 0
    : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: primaryColor,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
          {schoolName ?? 'School'}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(student)/notifications')}
          style={{ padding: 4 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="bell" size={22} color="#fff" />
          {unreadCount > 0 && (
            <View
              style={{
                position: 'absolute', top: -2, right: -2,
                backgroundColor: '#ef4444', borderRadius: 8,
                width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                {unreadCount > 9 ? '9+' : String(unreadCount)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 14 }}>
          {/* Greeting */}
          <View>
            <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 13 }}>{greeting},</Text>
            <Text style={{ color: VITANA_COLORS.text, fontSize: 20, fontWeight: '700' }}>
              {user?.fullName?.split(' ')[0] ?? 'Student'}
            </Text>
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* Attendance */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(student)/attendance')}
              style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: VITANA_COLORS.border }}
            >
              <Feather name="user-check" size={18} color={primaryColor} style={{ marginBottom: 6 }} />
              <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
                Attendance
              </Text>
              {isLoading ? (
                <SkeletonLoader height={18} width="60%" />
              ) : data?.attendanceThisMonth ? (
                <AttendanceBadge percent={attendancePercent} />
              ) : (
                <Text style={{ fontSize: 14, color: VITANA_COLORS.textSecondary }}>—</Text>
              )}
            </TouchableOpacity>

            {/* Due assignments */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(student)/assignments/index')}
              style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: VITANA_COLORS.border }}
            >
              <Feather name="book-open" size={18} color={primaryColor} style={{ marginBottom: 6 }} />
              <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
                Pending
              </Text>
              {isLoading ? (
                <SkeletonLoader height={22} width="40%" />
              ) : (
                <Text style={{ fontSize: 22, fontWeight: '700', color: VITANA_COLORS.text }}>
                  {data?.dueSoonAssignments?.length ?? 0}
                </Text>
              )}
            </TouchableOpacity>

            {/* Latest result */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(student)/results/index')}
              style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: VITANA_COLORS.border }}
            >
              <Feather name="award" size={18} color={primaryColor} style={{ marginBottom: 6 }} />
              <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
                Grade
              </Text>
              {isLoading ? (
                <SkeletonLoader height={22} width="40%" />
              ) : (
                <Text style={{ fontSize: 22, fontWeight: '700', color: VITANA_COLORS.text }}>
                  {data?.latestResult?.grade ?? '—'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Today's Schedule */}
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: VITANA_COLORS.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>Today's Schedule</Text>
              <TouchableOpacity onPress={() => router.push('/(student)/timetable/index')}>
                <Text style={{ fontSize: 13, color: primaryColor }}>Full →</Text>
              </TouchableOpacity>
            </View>
            {isLoading ? (
              <View style={{ gap: 8 }}>
                {[1, 2, 3].map((i) => <SkeletonLoader key={i} height={60} borderRadius={10} />)}
              </View>
            ) : (data?.todaySchedule ?? []).length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Feather name="coffee" size={28} color={VITANA_COLORS.textSecondary} />
                <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 14, marginTop: 8 }}>No classes scheduled today</Text>
              </View>
            ) : (
              (data?.todaySchedule ?? []).map((p, i) => (
                <PeriodCard
                  key={i}
                  subject={p.subjectName}
                  teacher={p.teacherName}
                  time={`${p.startTime} – ${p.endTime}`}
                  isCurrent={p.isCurrentPeriod}
                  primaryColor={primaryColor}
                />
              ))
            )}
          </View>

          {/* Due Soon Assignments */}
          {((data?.dueSoonAssignments?.length ?? 0) > 0 || isLoading) && (
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: VITANA_COLORS.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>Due Soon</Text>
                <TouchableOpacity onPress={() => router.push('/(student)/assignments/index')}>
                  <Text style={{ fontSize: 13, color: primaryColor }}>All →</Text>
                </TouchableOpacity>
              </View>
              {isLoading ? (
                <View style={{ gap: 8 }}>
                  {[1, 2].map((i) => <SkeletonLoader key={i} height={50} borderRadius={10} />)}
                </View>
              ) : (
                (data?.dueSoonAssignments ?? []).slice(0, 3).map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => router.push({ pathname: '/(student)/assignments/[id]', params: { id: a.id } })}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: VITANA_COLORS.border,
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={{
                        width: 8, height: 8, borderRadius: 4,
                        backgroundColor: a.isOverdue ? '#dc2626' : primaryColor,
                        marginRight: 10,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '500', color: VITANA_COLORS.text }} numberOfLines={1}>
                        {a.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
                        {a.subjectName} · Due {a.dueDate.split('T')[0]}
                      </Text>
                    </View>
                    {a.isOverdue && (
                      <View style={{ backgroundColor: '#fee2e2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: '#dc2626', fontSize: 11, fontWeight: '600' }}>Overdue</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Latest Result */}
          {(isLoading || data?.latestResult) && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(student)/results/index')}
              style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: VITANA_COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Latest Result
                </Text>
                {isLoading ? (
                  <View style={{ gap: 6, marginTop: 6 }}>
                    <SkeletonLoader height={15} width="55%" />
                    <SkeletonLoader height={13} width="35%" />
                  </View>
                ) : data?.latestResult ? (
                  <>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text, marginTop: 4 }} numberOfLines={1}>
                      {data.latestResult.examName}
                    </Text>
                    <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary }}>
                      {data.latestResult.percentage.toFixed(1)}% · Grade {data.latestResult.grade}
                    </Text>
                  </>
                ) : null}
              </View>
              <Feather name="chevron-right" size={18} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Latest Announcement */}
          {(isLoading || data?.latestAnnouncement) && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(student)/announcements')}
              style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: VITANA_COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Announcement
                </Text>
                {isLoading ? (
                  <View style={{ gap: 6, marginTop: 6 }}>
                    <SkeletonLoader height={15} width="65%" />
                    <SkeletonLoader height={11} width="30%" />
                  </View>
                ) : data?.latestAnnouncement ? (
                  <>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text, marginTop: 4 }} numberOfLines={1}>
                      {data.latestAnnouncement.title}
                    </Text>
                    <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
                      {formatRelativeTime(data.latestAnnouncement.createdAt)}
                    </Text>
                  </>
                ) : null}
              </View>
              <Feather name="chevron-right" size={18} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
