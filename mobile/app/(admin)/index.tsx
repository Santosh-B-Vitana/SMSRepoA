import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { adminApi, type AdminDashboardResponse } from '@/api/endpoints/admin';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { formatINR } from '@vitana/shared-utils';

function AttendanceBar({ rate }: { rate: number }) {
  const color =
    rate >= 85
      ? VITANA_COLORS.success
      : rate >= 75
        ? VITANA_COLORS.warning
        : VITANA_COLORS.error;
  return (
    <View className="h-3 bg-surface rounded-full overflow-hidden mt-2">
      <View
        className="h-3 rounded-full"
        style={{ width: `${Math.min(rate, 100)}%`, backgroundColor: color }}
      />
    </View>
  );
}

function totalPendingCount(data: AdminDashboardResponse): number {
  return (
    (data.pendingApprovals?.leaveRequests ?? 0) +
    (data.pendingApprovals?.admissionApplications ?? 0) +
    (data.pendingApprovals?.documentVerifications ?? 0)
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
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Kolkata',
  });

  const pendingTotal = data ? totalPendingCount(data) : 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 pt-2 pb-4" style={{ backgroundColor: colors.primary }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-white font-bold text-base" numberOfLines={1}>
              {schoolName ?? 'Admin Portal'}
            </Text>
            <Text className="text-white/70 text-xs mt-0.5">{today}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(admin)/notifications')}
            className="p-1 relative"
          >
            <Feather name="bell" size={22} color="white" />
            {!!data?.unreadCount && data.unreadCount > 0 && (
              <View className="absolute top-0 right-0 bg-red-500 rounded-full w-4 h-4 items-center justify-center">
                <Text className="text-white text-xs font-bold">
                  {data.unreadCount > 9 ? '9+' : data.unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <Text className="text-white/80 text-sm mt-2">
          Welcome back, {user?.fullName?.split(' ')[0] ?? 'Admin'}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="px-4 pt-4 pb-10">
          {/* Billing Alert */}
          {!!data?.billingAlert?.alertMessage && (
            <TouchableOpacity
              className="flex-row items-start bg-red-50 border border-red-200 rounded-xl p-4 mb-4"
              onPress={() => router.push('/(admin)/more')}
              activeOpacity={0.8}
            >
              <Feather name="alert-triangle" size={18} color={VITANA_COLORS.error} />
              <Text className="text-red-700 text-sm ml-2 flex-1 font-medium">
                {data.billingAlert.alertMessage}
              </Text>
            </TouchableOpacity>
          )}

          {/* Attendance Card */}
          <TouchableOpacity
            className="bg-white border border-gray-100 rounded-xl p-4 mb-3 shadow-sm"
            onPress={() => router.push('/(admin)/reports')}
            activeOpacity={0.8}
          >
            <View className="flex-row items-center justify-between mb-1">
              <Text className="font-semibold text-gray-800">Today's Attendance</Text>
              <Feather name="chevron-right" size={16} color={VITANA_COLORS.textSecondary} />
            </View>
            {isLoading ? (
              <SkeletonLoader height={52} borderRadius={8} />
            ) : (
              <>
                <AttendanceBar rate={data?.attendanceRate ?? 0} />
                <View className="flex-row items-center justify-between mt-2">
                  <Text className="text-2xl font-bold text-gray-900">
                    {(data?.attendanceRate ?? 0).toFixed(1)}%
                  </Text>
                  <Text className="text-gray-500 text-sm">school-wide today</Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* Pending Approvals Card */}
          <TouchableOpacity
            className="bg-white border border-gray-100 rounded-xl p-4 mb-3 shadow-sm flex-row items-center justify-between"
            onPress={() => router.push('/(admin)/approvals')}
            activeOpacity={0.8}
          >
            <View>
              <Text className="font-semibold text-gray-800">Pending Approvals</Text>
              {isLoading ? (
                <SkeletonLoader width={80} height={28} borderRadius={4} />
              ) : (
                <Text className="text-2xl font-bold text-gray-900 mt-0.5">{pendingTotal}</Text>
              )}
              <Text className="text-gray-500 text-sm">leave + admission + docs</Text>
            </View>
            <View className="flex-row items-center">
              {pendingTotal > 0 && (
                <View className="px-2 py-1 rounded-full bg-amber-50 border border-amber-200 mr-2">
                  <Text className="text-amber-700 text-xs font-medium">Action needed</Text>
                </View>
              )}
              <Feather name="chevron-right" size={18} color={VITANA_COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Fee Collection Card */}
          <TouchableOpacity
            className="bg-white border border-gray-100 rounded-xl p-4 mb-3 shadow-sm"
            onPress={() => router.push('/(admin)/reports')}
            activeOpacity={0.8}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-semibold text-gray-800">Fee Collection Today</Text>
                {isLoading ? (
                  <SkeletonLoader width={130} height={28} borderRadius={4} />
                ) : (
                  <Text className="text-2xl font-bold text-gray-900 mt-0.5">
                    {formatINR(data?.feeCollection?.collectedToday ?? 0)}
                  </Text>
                )}
                <Text className="text-gray-500 text-sm">
                  This month: {formatINR(data?.feeCollection?.collectedThisMonth ?? 0)}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={VITANA_COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Recent Announcements preview */}
          {!!data?.recentAnnouncements?.length && (
            <View className="bg-white border border-gray-100 rounded-xl p-4 mb-4 shadow-sm">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-semibold text-gray-800">Recent Announcements</Text>
                <TouchableOpacity onPress={() => router.push('/(admin)/announcements')}>
                  <Text className="text-sm font-medium" style={{ color: colors.primary }}>
                    See all
                  </Text>
                </TouchableOpacity>
              </View>
              {data.recentAnnouncements.slice(0, 2).map((ann) => (
                <View key={ann.id} className="py-2 border-b border-gray-50 last:border-b-0">
                  <Text className="text-gray-800 text-sm font-medium" numberOfLines={1}>
                    {ann.title}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-0.5" numberOfLines={1}>
                    {ann.summary}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <Text className="font-semibold text-gray-800 mb-3 mt-1">Quick Actions</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-white border border-gray-100 rounded-xl p-4 items-center shadow-sm"
              onPress={() => router.push('/(admin)/announcements/create')}
              activeOpacity={0.8}
            >
              <Feather name="volume-2" size={24} color={colors.primary} />
              <Text className="text-gray-700 text-sm font-medium mt-2 text-center">
                Post Announcement
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-white border border-gray-100 rounded-xl p-4 items-center shadow-sm"
              onPress={() => router.push('/(admin)/approvals')}
              activeOpacity={0.8}
            >
              <Feather name="check-circle" size={24} color={colors.primary} />
              <Text className="text-gray-700 text-sm font-medium mt-2 text-center">
                Approve Leaves{pendingTotal > 0 ? ` (${pendingTotal})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
