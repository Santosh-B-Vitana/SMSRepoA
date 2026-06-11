import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
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
import { VITANA_COLORS } from '@/theme/tokens';

const ATTENDANCE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Present: { bg: '#dcfce7', text: '#16a34a' },
  Absent: { bg: '#fee2e2', text: '#dc2626' },
  Late: { bg: '#fef3c7', text: '#d97706' },
  HalfDay: { bg: '#e0f2fe', text: '#0369a1' },
};

export default function ParentDashboard() {
  const user = useAuthStore((s) => s.user);
  const { primaryColor, schoolName, logoUrl } = useSchoolTheme();
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

  const todayStatus = data?.todayAttendance?.status;
  const todayColors =
    todayStatus && ATTENDANCE_STATUS_COLORS[todayStatus]
      ? ATTENDANCE_STATUS_COLORS[todayStatus]
      : { bg: '#f3f4f6', text: '#6b7280' };

  const unreadCount = data?.unreadNotificationCount ?? 0;

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={{ width: 30, height: 30, borderRadius: 6 }}
              contentFit="contain"
            />
          ) : null}
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
            {schoolName ?? 'School'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(parent)/notifications/index')}
          style={{ padding: 4 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="bell" size={22} color="#fff" />
          {unreadCount > 0 && (
            <View
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                backgroundColor: '#ef4444',
                borderRadius: 8,
                width: 16,
                height: 16,
                alignItems: 'center',
                justifyContent: 'center',
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
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 12 }}>
          {/* Greeting */}
          <View>
            <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 13 }}>{greeting},</Text>
            <Text style={{ color: VITANA_COLORS.text, fontSize: 20, fontWeight: '700' }}>
              {user?.fullName?.split(' ')[0] ?? 'Parent'}
            </Text>
          </View>

          {/* Child Switcher */}
          {children.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -16 }}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            >
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  onPress={() => setSelectedChildId(child.id)}
                  style={{ alignItems: 'center' }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      overflow: 'hidden',
                      borderWidth: 2.5,
                      borderColor: child.id === activeChildId ? primaryColor : '#e2e8f0',
                      backgroundColor: '#f1f5f9',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {child.photoUrl ? (
                      <Image
                        source={{ uri: child.photoUrl }}
                        style={{ width: 56, height: 56 }}
                        contentFit="cover"
                      />
                    ) : (
                      <Text
                        style={{ fontSize: 20, fontWeight: '700', color: VITANA_COLORS.textSecondary }}
                      >
                        {child.studentName[0]}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      color: VITANA_COLORS.textSecondary,
                      marginTop: 4,
                      width: 64,
                      textAlign: 'center',
                    }}
                    numberOfLines={1}
                  >
                    {child.studentName.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Active Child Info */}
          {isLoading ? (
            <View
              style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 8 }}
            >
              <SkeletonLoader height={18} width="55%" />
              <SkeletonLoader height={14} width="40%" />
            </View>
          ) : activeChild ? (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: VITANA_COLORS.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>
                  {activeChild.studentName}
                </Text>
                <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
                  {activeChild.className} · Roll No. {activeChild.rollNumber}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Today's Attendance Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              activeChildId &&
              router.push({
                pathname: '/(parent)/attendance/[studentId]',
                params: { studentId: activeChildId },
              })
            }
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: VITANA_COLORS.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text
                style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                Today's Attendance
              </Text>
              <View style={{ marginTop: 6 }}>
                {isLoading ? (
                  <SkeletonLoader width={80} height={24} borderRadius={12} />
                ) : (
                  <View
                    style={{
                      backgroundColor: todayColors.bg,
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Text style={{ color: todayColors.text, fontWeight: '600', fontSize: 13 }}>
                      {todayStatus ?? 'Not marked'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={VITANA_COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Fee Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(parent)/fees/index')}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: VITANA_COLORS.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text
                style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                Outstanding Fees
              </Text>
              {isLoading ? (
                <SkeletonLoader width={120} height={28} borderRadius={4} style={{ marginTop: 6 }} />
              ) : (
                <Text
                  style={{ fontSize: 22, fontWeight: '700', color: VITANA_COLORS.text, marginTop: 4 }}
                >
                  {data?.feeSummary ? formatINR(data.feeSummary.outstanding) : '—'}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {(data?.feeSummary?.outstanding ?? 0) > 0 && (
                <View
                  style={{ backgroundColor: primaryColor, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>Pay Now</Text>
                </View>
              )}
              <Feather name="chevron-right" size={18} color={VITANA_COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Latest Result */}
          {(isLoading || data?.latestResult) && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                activeChildId &&
                router.push({
                  pathname: '/(parent)/results/[studentId]',
                  params: { studentId: activeChildId },
                })
              }
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: VITANA_COLORS.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text
                  style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  Latest Result
                </Text>
                {isLoading ? (
                  <View style={{ gap: 6, marginTop: 6 }}>
                    <SkeletonLoader height={16} width="60%" />
                    <SkeletonLoader height={13} width="40%" />
                  </View>
                ) : data?.latestResult ? (
                  <>
                    <Text
                      style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text, marginTop: 4 }}
                      numberOfLines={1}
                    >
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
              onPress={() =>
                data?.latestAnnouncement &&
                router.push({
                  pathname: '/(parent)/announcements/[id]',
                  params: { id: data.latestAnnouncement.id },
                })
              }
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: VITANA_COLORS.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text
                  style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  Latest Announcement
                </Text>
                {isLoading ? (
                  <View style={{ gap: 6, marginTop: 6 }}>
                    <SkeletonLoader height={16} width="70%" />
                    <SkeletonLoader height={11} width="35%" />
                  </View>
                ) : data?.latestAnnouncement ? (
                  <>
                    <Text
                      style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text, marginTop: 4 }}
                      numberOfLines={1}
                    >
                      {data.latestAnnouncement.title}
                    </Text>
                    <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
                      {formatRelativeTime(data.latestAnnouncement.publishedAt)}
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
