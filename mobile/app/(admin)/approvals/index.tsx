import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { adminApi, type AdminLeaveRequest } from '@/api/endpoints/admin';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS } from '@/theme/tokens';
import { EmptyState } from '@/components/common/EmptyState';
import { queryClient } from '@/api/queryClient';
import { formatDate } from '@vitana/shared-utils';

type Tab = 'staff' | 'student';

// Android-compatible prompt (Alert.prompt is iOS-only)
function useRejectModal() {
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState('');
  const [onConfirm, setOnConfirm] = useState<((r: string) => void) | null>(null);

  function prompt(callback: (r: string) => void) {
    setReason('');
    setOnConfirm(() => callback);
    setVisible(true);
  }

  function confirm() {
    if (!reason.trim()) {
      Alert.alert('Required', 'Please enter a reason for rejection.');
      return;
    }
    setVisible(false);
    onConfirm?.(reason.trim());
  }

  function cancel() {
    setVisible(false);
  }

  return { visible, reason, setReason, prompt, confirm, cancel };
}

function useRemarkModal() {
  const [visible, setVisible] = useState(false);
  const [remark, setRemark] = useState('');
  const [onConfirm, setOnConfirm] = useState<((r?: string) => void) | null>(null);

  function prompt(callback: (r?: string) => void) {
    setRemark('');
    setOnConfirm(() => callback);
    setVisible(true);
  }

  function confirm() {
    setVisible(false);
    onConfirm?.(remark.trim() || undefined);
  }

  function cancel() {
    setVisible(false);
  }

  return { visible, remark, setRemark, prompt, confirm, cancel };
}

function invalidateLeaveQueries(tab: Tab) {
  queryClient.invalidateQueries({ queryKey: ['pending-leaves', tab] });
  queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
}

export default function LeaveApprovals() {
  const [activeTab, setActiveTab] = useState<Tab>('staff');
  const { colors } = useAppTheme();
  const rejectModal = useRejectModal();
  const remarkModal = useRemarkModal();

  const { data: leaves, isLoading, refetch } = useQuery<AdminLeaveRequest[]>({
    queryKey: ['pending-leaves', activeTab],
    queryFn: () => adminApi.getPendingLeaves(activeTab),
    staleTime: 2 * 60 * 1000,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, remark }: { id: string; remark?: string }) =>
      adminApi.approveLeave(id, remark),
    onSuccess: () => invalidateLeaveQueries(activeTab),
    onError: () => Alert.alert('Error', 'Failed to approve leave. Please try again.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectLeave(id, reason),
    onSuccess: () => invalidateLeaveQueries(activeTab),
    onError: () => Alert.alert('Error', 'Failed to reject leave. Please try again.'),
  });

  function handleApprove(item: AdminLeaveRequest) {
    const name = item.staffName ?? item.studentName ?? 'this person';
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Approve Leave',
        `Approve leave for ${name}? Add a remark (optional):`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Approve',
            onPress: (remark) =>
              approveMutation.mutate({ id: item.id, remark: remark?.trim() || undefined }),
          },
        ],
        'plain-text',
      );
    } else {
      remarkModal.prompt((remark) => approveMutation.mutate({ id: item.id, remark }));
    }
  }

  function handleReject(item: AdminLeaveRequest) {
    const name = item.staffName ?? item.studentName ?? 'this person';
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Reject Leave',
        `Reason for rejecting ${name}'s leave (required):`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: (reason) => {
              if (!reason?.trim()) {
                Alert.alert('Required', 'A reason is required to reject a leave request.');
                return;
              }
              rejectMutation.mutate({ id: item.id, reason: reason.trim() });
            },
          },
        ],
        'plain-text',
      );
    } else {
      rejectModal.prompt((reason) => rejectMutation.mutate({ id: item.id, reason }));
    }
  }

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xl font-bold text-gray-900 mb-3">Leave Approvals</Text>
        <View className="flex-row bg-gray-100 rounded-xl p-1">
          {(['staff', 'student'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className="flex-1 py-2.5 rounded-lg items-center"
              style={{ backgroundColor: activeTab === tab ? colors.primary : 'transparent' }}
            >
              <Text
                className="font-medium capitalize"
                style={{ color: activeTab === tab ? 'white' : VITANA_COLORS.textSecondary }}
              >
                {tab === 'staff' ? 'Staff Leave' : 'Student Leave'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : !leaves || leaves.length === 0 ? (
        <EmptyState
          icon="check-circle"
          title="No pending requests"
          subtitle="All caught up! No pending leave requests."
        />
      ) : (
        <FlashList
          data={leaves}
          estimatedItemSize={150}
          keyExtractor={(item) => item.id}
          refreshing={false}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <View className="bg-white border-b border-gray-100 px-4 py-4">
              <View className="flex-row items-start justify-between mb-1">
                <View className="flex-1 mr-2">
                  <Text className="font-semibold text-gray-900 text-base">
                    {item.staffName ?? item.studentName ?? 'Unknown'}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    {item.leaveTypeName} · {formatDate(item.fromDate)} – {formatDate(item.toDate)}
                  </Text>
                  <Text className="text-gray-400 text-xs mt-0.5">
                    {item.days} day{item.days !== 1 ? 's' : ''} · Balance: {item.remainingBalance}
                  </Text>
                </View>
              </View>

              {!!item.reason && (
                <Text className="text-gray-500 text-sm italic mb-3" numberOfLines={3}>
                  "{item.reason}"
                </Text>
              )}

              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity
                  onPress={() => handleReject(item)}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl border border-red-300 items-center bg-red-50"
                >
                  <Text className="text-red-600 font-medium text-sm">Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleApprove(item)}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl items-center"
                  style={{ backgroundColor: colors.primary }}
                >
                  {approveMutation.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-medium text-sm">Approve</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Android: Remark modal (approve) */}
      <Modal visible={remarkModal.visible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-center items-center bg-black/50 px-6"
        >
          <View className="bg-white rounded-2xl p-5 w-full">
            <Text className="font-semibold text-gray-900 text-base mb-1">Approve Leave</Text>
            <Text className="text-gray-500 text-sm mb-3">Add a remark (optional):</Text>
            <TextInput
              value={remarkModal.remark}
              onChangeText={remarkModal.setRemark}
              placeholder="e.g. Approved. Please ensure coverage."
              placeholderTextColor={VITANA_COLORS.textSecondary}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 bg-gray-50 mb-4"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={remarkModal.cancel}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 items-center"
              >
                <Text className="text-gray-600 font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={remarkModal.confirm}
                className="flex-1 py-2.5 rounded-xl items-center"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="text-white font-medium">Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Android: Reason modal (reject) */}
      <Modal visible={rejectModal.visible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-center items-center bg-black/50 px-6"
        >
          <View className="bg-white rounded-2xl p-5 w-full">
            <Text className="font-semibold text-gray-900 text-base mb-1">Reject Leave</Text>
            <Text className="text-gray-500 text-sm mb-3">
              Reason for rejection (required):
            </Text>
            <TextInput
              value={rejectModal.reason}
              onChangeText={rejectModal.setReason}
              placeholder="Enter rejection reason..."
              placeholderTextColor={VITANA_COLORS.textSecondary}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 bg-gray-50 mb-4"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={rejectModal.cancel}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 items-center"
              >
                <Text className="text-gray-600 font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={rejectModal.confirm}
                className="flex-1 py-2.5 rounded-xl border border-red-300 bg-red-50 items-center"
              >
                <Text className="text-red-600 font-medium">Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
