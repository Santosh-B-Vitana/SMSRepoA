import { ScrollView, View, Text, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { adminApi, type AdminDashboardResponse } from '@/api/endpoints/admin';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS, VITANA_SHADOWS } from '@/theme/tokens';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { formatINR } from '@vitana/shared-utils';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { StatCard } from '@/components/ui/StatCard';
import { SectionCard } from '@/components/ui/SectionCard';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';

function totalPendingCount(data: AdminDashboardResponse): number {
  return (
    (data.pendingApprovals?.leaveRequests ?? 0) +
    (data.pendingApprovals?.admissionApplications ?? 0) +
    (data.pendingApprovals?.documentVerifications ?? 0)
  );
}

function AttendanceBar({ rate, primaryColor }: { rate: number; primaryColor: string }) {
  const barColor =
    rate >= 85 ? VITANA_COLORS.success : rate >= 75 ? VITANA_COLORS.warning : VITANA_COLORS.error;
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.min(rate, 100)}%`, backgroundColor: barColor }]} />
    </View>
  );
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const { colors, schoolName } = useAppTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery<AdminDashboardResponse>({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboard,
    staleTime: 3 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata',
  });

  const pendingTotal = data ? totalPendingCount(data) : 0;
  const attendanceRate = data?.attendanceRate ?? 0;
  const attendanceVariant = attendanceRate >= 85 ? 'success' : attendanceRate >= 75 ? 'warning' : 'error';

  const firstName = user?.fullName?.split(' ')[0] ?? 'Admin';

  const notifBtn = (
    <TouchableOpacity
      onPress={() => router.push('/(admin)/notifications')}
      style={styles.headerBtn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Feather name="bell" size={20} color="#ffffff" />
      {(data?.unreadCount ?? 0) > 0 ? <View style={styles.notifDot} /> : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={schoolName ?? 'Admin Portal'}
        subtitle={today}
        primaryColor={colors.primary}
        rightSlot={notifBtn}
        variant="gradient"
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={styles.body}>
          {/* Greeting */}
          <View style={styles.greetingRow}>
            <View>
              <Text style={styles.greetingName}>Welcome back, {firstName} 👋</Text>
              <Text style={styles.greetingSub}>Here's your school overview</Text>
            </View>
            <Avatar name={user?.fullName} size="md" />
          </View>

          {/* Billing Alert */}
          {data?.billingAlert?.alertMessage ? (
            <TouchableOpacity
              onPress={() => router.push('/(admin)/more')}
              style={styles.billingAlert}
              activeOpacity={0.8}
            >
              <Feather name="alert-triangle" size={16} color={VITANA_COLORS.error} />
              <Text style={styles.billingText}>{data.billingAlert.alertMessage}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Stats Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
            <View style={styles.statsRow}>
              <StatCard
                label="Students"
                value={isLoading ? '–' : (data?.activeStudents ?? 0)}
                icon="users"
                iconColor={colors.primary}
                onPress={() => router.push('/(admin)/students')}
              />
              <StatCard
                label="Staff"
                value={isLoading ? '–' : (data?.activeStaff ?? 0)}
                icon="briefcase"
                iconColor="#7c3aed"
                onPress={() => router.push('/(admin)/staff')}
              />
              <StatCard
                label="Classes"
                value={isLoading ? '–' : (data?.totalClasses ?? 0)}
                icon="book-open"
                iconColor="#059669"
                onPress={() => router.push('/(admin)/classes')}
              />
              <StatCard
                label="Attendance Today"
                value={isLoading ? '–' : `${attendanceRate.toFixed(1)}%`}
                icon="user-check"
                iconColor={attendanceRate >= 75 ? VITANA_COLORS.success : VITANA_COLORS.error}
                onPress={() => router.push('/(admin)/attendance')}
              />
              <StatCard
                label="Pending Approvals"
                value={isLoading ? '–' : pendingTotal}
                icon="check-circle"
                iconColor={pendingTotal > 0 ? VITANA_COLORS.warning : VITANA_COLORS.success}
                onPress={() => router.push('/(admin)/approvals')}
              />
              <StatCard
                label="Fee Today"
                value={isLoading ? '–' : formatINR(data?.feeCollection?.collectedToday ?? 0)}
                icon="credit-card"
                iconColor={VITANA_COLORS.primary}
                onPress={() => router.push('/(admin)/fees')}
              />
            </View>
          </ScrollView>

          {/* Attendance Card */}
          <TouchableOpacity
            onPress={() => router.push('/(admin)/reports')}
            style={[styles.attendanceCard, VITANA_SHADOWS.sm]}
            activeOpacity={0.8}
          >
            <View style={styles.attendanceHeader}>
              <View style={styles.attendanceTitleRow}>
                <View style={[styles.attendanceIconBg, { backgroundColor: `${VITANA_COLORS.success}15` }]}>
                  <Feather name="users" size={16} color={VITANA_COLORS.success} />
                </View>
                <Text style={styles.attendanceTitle}>School-Wide Attendance</Text>
              </View>
              <Badge
                label={`${attendanceRate.toFixed(1)}%`}
                variant={attendanceVariant}
                dot
              />
            </View>
            <AttendanceBar rate={attendanceRate} primaryColor={colors.primary} />
            <Text style={styles.attendanceSub}>Today's attendance across all classes</Text>
          </TouchableOpacity>

          {/* Pending Approvals */}
          {pendingTotal > 0 ? (
            <TouchableOpacity
              onPress={() => router.push('/(admin)/approvals')}
              style={[styles.approvalsCard, VITANA_SHADOWS.sm]}
              activeOpacity={0.8}
            >
              <View style={[styles.approvalIconBg, { backgroundColor: `${VITANA_COLORS.warning}15` }]}>
                <Feather name="clock" size={20} color={VITANA_COLORS.warning} />
              </View>
              <View style={styles.approvalsInfo}>
                <Text style={styles.approvalsTitle}>Pending Approvals</Text>
                <Text style={styles.approvalsMeta}>
                  {data?.pendingApprovals?.leaveRequests ?? 0} leaves · {' '}
                  {data?.pendingApprovals?.admissionApplications ?? 0} admissions · {' '}
                  {data?.pendingApprovals?.documentVerifications ?? 0} docs
                </Text>
              </View>
              <View style={styles.approvalsBadge}>
                <Text style={styles.approvalsBadgeText}>{pendingTotal}</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Fee Collection */}
          <SectionCard
            title="Fee Collection"
            icon="credit-card"
            iconColor={VITANA_COLORS.primary}
            onViewAll={() => router.push('/(admin)/reports')}
          >
            {isLoading ? (
              <View style={{ gap: 8 }}>
                <SkeletonLoader height={16} width="40%" />
                <SkeletonLoader height={13} width="60%" />
              </View>
            ) : (
              <View style={styles.feeRow}>
                <View style={styles.feeStat}>
                  <Text style={styles.feeLabel}>Today</Text>
                  <Text style={styles.feeValue}>{formatINR(data?.feeCollection?.collectedToday ?? 0)}</Text>
                </View>
                <View style={styles.feeDivider} />
                <View style={styles.feeStat}>
                  <Text style={styles.feeLabel}>This Month</Text>
                  <Text style={styles.feeValue}>{formatINR(data?.feeCollection?.collectedThisMonth ?? 0)}</Text>
                </View>
              </View>
            )}
          </SectionCard>

          {/* Recent Announcements */}
          {(data?.recentAnnouncements?.length ?? 0) > 0 ? (
            <SectionCard
              title="Recent Announcements"
              icon="volume-2"
              iconColor="#db2777"
              onViewAll={() => router.push('/(admin)/announcements')}
              noPadding
            >
              {data!.recentAnnouncements.slice(0, 3).map((ann, idx) => (
                <View
                  key={ann.id}
                  style={[
                    styles.annRow,
                    idx < Math.min(data!.recentAnnouncements.length, 3) - 1 && styles.rowBorder,
                  ]}
                >
                  <Text style={styles.annTitle} numberOfLines={1}>{ann.title}</Text>
                  <Text style={styles.annSummary} numberOfLines={1}>{ann.summary}</Text>
                </View>
              ))}
            </SectionCard>
          ) : null}

          {/* Quick Actions */}
          <SectionCard title="Quick Actions" icon="zap" iconColor={colors.primary} noPadding>
            <View style={styles.quickGrid}>
              {ADMIN_ACTIONS(colors.primary, pendingTotal).map((action) => (
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
                  {action.badge ? (
                    <View style={styles.quickBadge}>
                      <Text style={styles.quickBadgeText}>{action.badge}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ADMIN_ACTIONS = (primary: string, pending: number) => [
  { label: 'Announce', icon: 'volume-2', route: '/(admin)/announcements/create', color: '#db2777', badge: 0 },
  { label: 'Approvals', icon: 'check-circle', route: '/(admin)/approvals', color: VITANA_COLORS.warning, badge: pending },
  { label: 'Reports', icon: 'bar-chart-2', route: '/(admin)/reports', color: primary, badge: 0 },
  { label: 'Notifications', icon: 'bell', route: '/(admin)/notifications', color: VITANA_COLORS.info, badge: 0 },
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
  },
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  greetingName: { fontSize: 20, fontWeight: '700', color: VITANA_COLORS.text, fontFamily: 'Poppins' },
  greetingSub: { fontSize: 13, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', marginTop: 2 },
  billingAlert: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: VITANA_COLORS.errorLight,
    borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 12, padding: 14,
  },
  billingText: { flex: 1, fontSize: 13, color: VITANA_COLORS.error, fontFamily: 'Inter', fontWeight: '500' },
  statsScroll: { marginHorizontal: -16 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  attendanceCard: {
    backgroundColor: VITANA_COLORS.background,
    borderRadius: 14, borderWidth: 1, borderColor: VITANA_COLORS.border,
    padding: 16,
  },
  attendanceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  attendanceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attendanceIconBg: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  attendanceTitle: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text, fontFamily: 'Inter' },
  barTrack: { height: 8, backgroundColor: VITANA_COLORS.surface, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  attendanceSub: { fontSize: 11, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', marginTop: 8 },
  approvalsCard: {
    backgroundColor: VITANA_COLORS.background,
    borderRadius: 14, borderWidth: 1, borderColor: VITANA_COLORS.border,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  approvalIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  approvalsInfo: { flex: 1 },
  approvalsTitle: { fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text, fontFamily: 'Inter' },
  approvalsMeta: { fontSize: 12, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', marginTop: 2 },
  approvalsBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: VITANA_COLORS.warningLight,
    alignItems: 'center', justifyContent: 'center',
  },
  approvalsBadgeText: { fontSize: 16, fontWeight: '700', color: '#b45309', fontFamily: 'Poppins' },
  feeRow: { flexDirection: 'row', alignItems: 'center' },
  feeStat: { flex: 1 },
  feeLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: 0.4 },
  feeValue: { fontSize: 18, fontWeight: '700', color: VITANA_COLORS.text, fontFamily: 'Poppins', marginTop: 4 },
  feeDivider: { width: 1, height: 40, backgroundColor: VITANA_COLORS.border, marginHorizontal: 16 },
  annRow: { paddingHorizontal: 16, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border },
  annTitle: { fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text, fontFamily: 'Inter' },
  annSummary: { fontSize: 12, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', marginTop: 2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  quickItem: { width: '22%', flexGrow: 1, alignItems: 'center', paddingVertical: 14, gap: 6, borderRadius: 12, backgroundColor: VITANA_COLORS.surface },
  quickIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 11, fontWeight: '500', color: VITANA_COLORS.text, fontFamily: 'Inter', textAlign: 'center' },
  quickBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: VITANA_COLORS.error, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  quickBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },
});
