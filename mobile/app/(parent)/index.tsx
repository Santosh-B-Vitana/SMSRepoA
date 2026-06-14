import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { parentApi } from '@/api/endpoints/parent';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { formatINR, formatRelativeTime } from '@vitana/shared-utils';
import { VITANA_COLORS, VITANA_SHADOWS } from '@/theme/tokens';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';

const ATTENDANCE_VARIANTS: Record<string, 'success' | 'error' | 'warning' | 'info' | 'neutral'> = {
  Present: 'success',
  Absent: 'error',
  Late: 'warning',
  HalfDay: 'info',
};

export default function ParentDashboard() {
  const user = useAuthStore((s) => s.user);
  const { primaryColor, schoolName } = useSchoolTheme();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['parent-dashboard'],
    queryFn: parentApi.getDashboard,
    staleTime: 5 * 60 * 1000,
  });

  const children = data?.children ?? [];
  const activeChildId = selectedChildId ?? data?.selectedChildId ?? children[0]?.id ?? null;
  const activeChild = children.find((c) => c.id === activeChildId);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.fullName?.split(' ')[0] ?? 'Parent';

  const unreadCount = data?.unreadNotificationCount ?? 0;
  const todayStatus = data?.todayAttendance?.status;
  const attendanceVariant = todayStatus ? (ATTENDANCE_VARIANTS[todayStatus] ?? 'neutral') : 'neutral';

  const notifBtn = (
    <TouchableOpacity
      onPress={() => router.push('/(parent)/notifications')}
      style={styles.headerBtn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Feather name="bell" size={20} color="#ffffff" />
      {unreadCount > 0 ? <View style={styles.notifDot} /> : null}
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
            <View>
              <Text style={styles.greetingSub}>{greeting},</Text>
              <Text style={styles.greetingName}>{firstName} 👋</Text>
            </View>
            <Avatar name={user?.fullName} size="md" />
          </View>

          {/* Child switcher */}
          {children.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.childScroll}
              contentContainerStyle={styles.childScrollContent}
            >
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  onPress={() => setSelectedChildId(child.id)}
                  style={styles.childItem}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.childAvatar,
                      {
                        borderColor: child.id === activeChildId ? primaryColor : VITANA_COLORS.border,
                        borderWidth: child.id === activeChildId ? 2.5 : 1.5,
                      },
                    ]}
                  >
                    {child.photoUrl ? (
                      <Image source={{ uri: child.photoUrl }} style={styles.childAvatarImg} contentFit="cover" />
                    ) : (
                      <Text style={[styles.childInitial, { color: primaryColor }]}>
                        {child.studentName[0]}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.childName,
                      child.id === activeChildId && { color: primaryColor, fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {child.studentName.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          {/* Active child card */}
          {isLoading ? (
            <SkeletonLoader height={72} borderRadius={14} />
          ) : activeChild ? (
            <View style={[styles.childCard, VITANA_SHADOWS.sm]}>
              <Avatar name={activeChild.studentName} size="md" />
              <View style={styles.childCardInfo}>
                <Text style={styles.childCardName}>{activeChild.studentName}</Text>
                <Text style={styles.childCardMeta}>{activeChild.className} · Roll No. {activeChild.rollNumber}</Text>
              </View>
              <Badge
                label={todayStatus ?? 'No data'}
                variant={attendanceVariant}
                dot
                size="sm"
              />
            </View>
          ) : null}

          {/* Key Stats */}
          <View style={styles.statsRow}>
            {/* Attendance */}
            <TouchableOpacity
              onPress={() => activeChildId && router.push({ pathname: '/(parent)/attendance/[studentId]', params: { studentId: activeChildId } })}
              style={[styles.statTile, VITANA_SHADOWS.sm]}
              activeOpacity={0.7}
            >
              <Feather name="user-check" size={20} color={VITANA_COLORS.success} />
              <Text style={styles.statLabel}>Today</Text>
              <Text style={[styles.statValue, { color: todayStatus === 'Absent' ? VITANA_COLORS.error : VITANA_COLORS.success }]}>
                {isLoading ? '–' : todayStatus ?? 'N/A'}
              </Text>
            </TouchableOpacity>

            {/* Fees */}
            <TouchableOpacity
              onPress={() => router.push('/(parent)/fees')}
              style={[styles.statTile, VITANA_SHADOWS.sm, { flex: 2 }]}
              activeOpacity={0.7}
            >
              <Feather name="credit-card" size={20} color={primaryColor} />
              <Text style={styles.statLabel}>Outstanding Fees</Text>
              {isLoading ? (
                <SkeletonLoader height={24} width="70%" />
              ) : (
                <View style={styles.feeRow}>
                  <Text style={styles.feeAmount}>
                    {data?.feeSummary ? formatINR(data.feeSummary.outstanding) : '—'}
                  </Text>
                  {(data?.feeSummary?.outstanding ?? 0) > 0 ? (
                    <View style={[styles.payBtn, { backgroundColor: primaryColor }]}>
                      <Text style={styles.payBtnText}>Pay</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Latest Result */}
          {(data?.latestResult || isLoading) ? (
            <SectionCard
              title="Latest Result"
              icon="award"
              iconColor="#7c3aed"
              onViewAll={() => activeChildId && router.push({ pathname: '/(parent)/results/[studentId]', params: { studentId: activeChildId } })}
            >
              {isLoading ? (
                <View style={{ gap: 6 }}>
                  <SkeletonLoader height={16} width="60%" />
                  <SkeletonLoader height={13} width="40%" />
                </View>
              ) : data?.latestResult ? (
                <View style={styles.resultRow}>
                  <View style={styles.gradeCircle}>
                    <Text style={styles.gradeText}>{data.latestResult.grade}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName} numberOfLines={1}>{data.latestResult.examName}</Text>
                    <Text style={styles.resultMeta}>{data.latestResult.percentage.toFixed(1)}% · {data.latestResult.grade}</Text>
                  </View>
                </View>
              ) : null}
            </SectionCard>
          ) : null}

          {/* Latest Announcement */}
          {data?.latestAnnouncement ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => data.latestAnnouncement && router.push({
                pathname: '/(parent)/announcements/[id]',
                params: { id: data.latestAnnouncement.id },
              })}
              style={styles.announcementCard}
            >
              <View style={[styles.announcementIcon, { backgroundColor: `${primaryColor}12` }]}>
                <Feather name="volume-2" size={18} color={primaryColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.announcementLabel}>Announcement</Text>
                <Text style={styles.announcementTitle} numberOfLines={1}>{data.latestAnnouncement.title}</Text>
                <Text style={styles.announcementTime}>{formatRelativeTime(data.latestAnnouncement.publishedAt)}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  greetingSub: { fontSize: 13, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter' },
  greetingName: { fontSize: 22, fontWeight: '700', color: VITANA_COLORS.text, fontFamily: 'Poppins', marginTop: 2 },
  childScroll: { marginHorizontal: -16 },
  childScrollContent: { paddingHorizontal: 16, gap: 16 },
  childItem: { alignItems: 'center', gap: 6 },
  childAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: VITANA_COLORS.surface,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  childAvatarImg: { width: 56, height: 56 },
  childInitial: { fontSize: 22, fontWeight: '700' },
  childName: { fontSize: 11, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', width: 60, textAlign: 'center' },
  childCard: {
    backgroundColor: VITANA_COLORS.background,
    borderRadius: 14, borderWidth: 1, borderColor: VITANA_COLORS.border,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  childCardInfo: { flex: 1 },
  childCardName: { fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text, fontFamily: 'Poppins' },
  childCardMeta: { fontSize: 12, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statTile: {
    flex: 1, backgroundColor: VITANA_COLORS.background,
    borderRadius: 14, borderWidth: 1, borderColor: VITANA_COLORS.border,
    padding: 14, gap: 6,
  },
  statLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 18, fontWeight: '700', fontFamily: 'Poppins' },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  feeAmount: { fontSize: 20, fontWeight: '700', color: VITANA_COLORS.text, fontFamily: 'Poppins', flex: 1 },
  payBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  payBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: 'Inter' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gradeCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center',
  },
  gradeText: { fontSize: 18, fontWeight: '700', color: '#7c3aed', fontFamily: 'Poppins' },
  resultName: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text, fontFamily: 'Inter' },
  resultMeta: { fontSize: 12, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', marginTop: 2 },
  announcementCard: {
    backgroundColor: VITANA_COLORS.background,
    borderRadius: 14, borderWidth: 1, borderColor: VITANA_COLORS.border,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    ...VITANA_SHADOWS.sm,
  },
  announcementIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  announcementLabel: { fontSize: 10, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: 0.5 },
  announcementTitle: { fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text, fontFamily: 'Inter', marginTop: 2 },
  announcementTime: { fontSize: 11, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', marginTop: 2 },
});
