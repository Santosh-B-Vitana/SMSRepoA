import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { parentApi } from '@/api/endpoints/parent';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonCard } from '@/components/common/SkeletonLoader';
import { formatDate } from '@vitana/shared-utils';
import { VITANA_COLORS } from '@/theme/tokens';
import type { LeaveRequest } from '@/api/endpoints/parent';

type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

const STATUS_CONFIG: Record<LeaveStatus, { bg: string; text: string; icon: string }> = {
  Pending: { bg: '#fef3c7', text: '#d97706', icon: 'clock' },
  Approved: { bg: '#dcfce7', text: '#16a34a', icon: 'check-circle' },
  Rejected: { bg: '#fee2e2', text: '#dc2626', icon: 'x-circle' },
};

function LeaveCard({ leave }: { leave: LeaveRequest }) {
  const config = STATUS_CONFIG[leave.status] ?? STATUS_CONFIG.Pending;
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
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text }}>
            {formatDate(leave.fromDate)}
            {leave.fromDate !== leave.toDate ? ` – ${formatDate(leave.toDate)}` : ''}
          </Text>
          <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
            {dayCount} day{dayCount > 1 ? 's' : ''}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: config.bg,
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Feather name={config.icon as keyof typeof Feather.glyphMap} size={12} color={config.text} />
          <Text style={{ fontSize: 12, color: config.text, fontWeight: '600' }}>{leave.status}</Text>
        </View>
      </View>

      <Text
        style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 10, lineHeight: 18 }}
        numberOfLines={3}
      >
        {leave.reason}
      </Text>

      {leave.remarks && (
        <View
          style={{
            marginTop: 10,
            padding: 10,
            backgroundColor: '#f8fafc',
            borderRadius: 8,
            borderLeftWidth: 3,
            borderLeftColor:
              leave.status === 'Approved'
                ? '#16a34a'
                : leave.status === 'Rejected'
                  ? '#dc2626'
                  : '#f59e0b',
          }}
        >
          <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
            Remarks: {leave.remarks}
          </Text>
        </View>
      )}

      <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 10 }}>
        Applied on {formatDate(leave.appliedAt)}
      </Text>
    </View>
  );
}

export default function LeaveHistory() {
  const { primaryColor } = useSchoolTheme();

  const { data: children } = useQuery({
    queryKey: ['my-children'],
    queryFn: parentApi.getMyChildren,
  });
  const studentId = children?.[0]?.id;

  const {
    data: leaves,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['leaves', studentId],
    queryFn: () => parentApi.getLeaveRequests(studentId!),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      {/* Header */}
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
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}>
          Leave Applications
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(parent)/leaves/apply')}
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
            <>
              <SkeletonCard lines={3} />
              <SkeletonCard lines={3} />
            </>
          ) : !leaves || leaves.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No leave applications"
              subtitle="Tap '+ Apply' to submit a new leave request."
            />
          ) : (
            leaves.map((leave) => <LeaveCard key={leave.id} leave={leave} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
