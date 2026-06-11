import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi } from '@/api/endpoints/teacher';
import { SkeletonCard } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDate } from '@vitana/shared-utils';
import { VITANA_COLORS } from '@/theme/tokens';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import type { OwnLeaveApplication } from '@/api/endpoints/teacher';

type TeacherLeaveStatus = 'Pending' | 'Approved' | 'Rejected';

const STATUS_CONFIG: Record<TeacherLeaveStatus, { bg: string; text: string; icon: keyof typeof Feather.glyphMap }> = {
  Pending: { bg: '#fef3c7', text: '#d97706', icon: 'clock' },
  Approved: { bg: '#dcfce7', text: '#16a34a', icon: 'check-circle' },
  Rejected: { bg: '#fee2e2', text: '#dc2626', icon: 'x-circle' },
};

function OwnLeaveCard({ leave }: { leave: OwnLeaveApplication }) {
  const status = leave.status as TeacherLeaveStatus;
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.Pending;
  const dayCount =
    Math.ceil(
      (new Date(leave.toDate).getTime() - new Date(leave.fromDate).getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1;

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: VITANA_COLORS.border,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text }}>
            {leave.leaveType}
          </Text>
          <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
            {formatDate(leave.fromDate)}
            {leave.fromDate !== leave.toDate ? ` – ${formatDate(leave.toDate)}` : ''} · {dayCount} day{dayCount > 1 ? 's' : ''}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: config.bg,
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Feather name={config.icon} size={12} color={config.text} />
          <Text style={{ fontSize: 12, color: config.text, fontWeight: '600' }}>{leave.status}</Text>
        </View>
      </View>

      <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, lineHeight: 18 }} numberOfLines={2}>
        {leave.reason}
      </Text>
      <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary }}>
        Applied {formatDate(leave.appliedAt)}
      </Text>
    </View>
  );
}

export default function LeaveStatus() {
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['own-leaves'],
    queryFn: teacherApi.getOwnLeaves,
    staleTime: 5 * 60 * 1000,
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
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text
          style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}
        >
          My Leave Applications
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(teacher)/leaves/apply')}
          style={{
            backgroundColor: primaryColor,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>+ Apply</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={{ padding: 16, paddingBottom: 32, gap: 10 }}>
          {isLoading ? (
            [1, 2].map((i) => <SkeletonCard key={i} lines={3} />)
          ) : !data || data.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No leave applications"
              subtitle="Tap '+ Apply' to submit your first leave request."
            />
          ) : (
            data.map((leave) => <OwnLeaveCard key={leave.id} leave={leave} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
