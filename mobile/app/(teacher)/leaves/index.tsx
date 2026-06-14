import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi } from '@/api/endpoints/teacher';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonCard } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { formatDate } from '@vitana/shared-utils';
import { VITANA_COLORS, VITANA_SHADOWS } from '@/theme/tokens';
import type { LeaveRequest } from '@/api/endpoints/teacher';

function LeaveCard({
  leave,
  onApprove,
  onReject,
}: {
  leave: LeaveRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
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
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>
            {leave.studentName}
          </Text>
          <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
            {leave.className}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: '#fef3c7',
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text style={{ fontSize: 12, color: '#d97706', fontWeight: '600' }}>Pending</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="calendar" size={13} color={VITANA_COLORS.textSecondary} />
          <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary }}>
            {formatDate(leave.fromDate)}
            {leave.fromDate !== leave.toDate ? ` – ${formatDate(leave.toDate)}` : ''}
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary }}>
          {dayCount} day{dayCount > 1 ? 's' : ''}
        </Text>
      </View>

      <Text
        style={{ fontSize: 13, color: VITANA_COLORS.text, lineHeight: 18 }}
        numberOfLines={3}
      >
        {leave.reason}
      </Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          onPress={() => onApprove(leave.id)}
          style={{
            flex: 1,
            backgroundColor: '#dcfce7',
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Feather name="check" size={15} color="#16a34a" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#16a34a' }}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onReject(leave.id)}
          style={{
            flex: 1,
            backgroundColor: '#fee2e2',
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Feather name="x" size={15} color="#dc2626" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#dc2626' }}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function LeaveRequests() {
  const { primaryColor } = useSchoolTheme();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['pending-leaves'],
    queryFn: () => teacherApi.getPendingLeaves(),
    staleTime: 2 * 60 * 1000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => teacherApi.approveLeave(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pending-leaves'] });
      void qc.invalidateQueries({ queryKey: ['teacher-dashboard'] });
    },
    onError: () => Alert.alert('Error', 'Failed to approve leave request.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      teacherApi.rejectLeave(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pending-leaves'] });
      void qc.invalidateQueries({ queryKey: ['teacher-dashboard'] });
    },
    onError: () => Alert.alert('Error', 'Failed to reject leave request.'),
  });

  function handleApprove(id: string) {
    Alert.alert('Approve Leave', 'Are you sure you want to approve this leave request?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => approveMutation.mutate(id) },
    ]);
  }

  function handleReject(id: string) {
    Alert.prompt(
      'Reject Leave',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: (reason) => {
            if (reason && reason.trim()) {
              rejectMutation.mutate({ id, reason: reason.trim() });
            } else {
              Alert.alert('Reason required', 'Please provide a reason for rejection.');
            }
          },
        },
      ],
      'plain-text',
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: VITANA_COLORS.surface }} edges={['top']}>
      <SubScreenHeader
        title="Leave Requests"
        subtitle={data ? `${data.length} pending` : undefined}
        rightSlot={
          <TouchableOpacity onPress={() => router.push('/(teacher)/leaves/status')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 13, color: primaryColor, fontFamily: 'Inter', fontWeight: '600' }}>My Leaves</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={{ padding: 16, paddingBottom: 32, gap: 10 }}>
          {isLoading ? (
            [1, 2].map((i) => <SkeletonCard key={i} lines={4} />)
          ) : !data || data.length === 0 ? (
            <EmptyState
              icon="check-circle"
              title="No pending leave requests"
              subtitle="All leave requests have been reviewed."
            />
          ) : (
            data.map((leave) => (
              <LeaveCard
                key={leave.id}
                leave={leave}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Apply own leave */}
      <View
        style={{
          padding: 16,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push('/(teacher)/leaves/apply')}
          style={{
            backgroundColor: primaryColor,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>+ Apply for My Leave</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
