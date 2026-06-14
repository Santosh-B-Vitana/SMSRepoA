import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { studentApi } from '@/api/endpoints/student';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonCard } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending: { bg: '#fef3c7', text: '#d97706' },
  Approved: { bg: '#dcfce7', text: '#16a34a' },
  Rejected: { bg: '#fee2e2', text: '#dc2626' },
};

export default function LeaveStatusScreen() {
  const { primaryColor } = useSchoolTheme();

  const { data: leaves, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['student-leaves'],
    queryFn: studentApi.getLeaveRequests,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: VITANA_COLORS.surface }} edges={['top']}>
      <SubScreenHeader
        title="Leave Applications"
        rightSlot={
          <TouchableOpacity
            onPress={() => router.push('/(student)/leaves/apply')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="plus" size={18} color={primaryColor} />
            <Text style={{ fontSize: 14, color: primaryColor, fontWeight: '500' }}>Apply</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={{ padding: 16, gap: 10 }}>
          {isLoading ? (
            [1, 2, 3].map((i) => <SkeletonCard key={i} lines={3} />)
          ) : (leaves?.length ?? 0) === 0 ? (
            <EmptyState
              icon="calendar"
              title="No leave applications"
              subtitle="Your leave applications will appear here."
            />
          ) : (
            leaves!.map((leave) => {
              const colors = STATUS_COLORS[leave.status] ?? { bg: '#f3f4f6', text: '#6b7280' };
              const from = leave.fromDate.split('T')[0];
              const to = leave.toDate.split('T')[0];
              const days = Math.ceil(
                (new Date(leave.toDate).getTime() - new Date(leave.fromDate).getTime()) / (1000 * 60 * 60 * 24),
              ) + 1;
              return (
                <View
                  key={leave.id}
                  style={{
                    backgroundColor: '#fff', borderRadius: 12, padding: 14,
                    borderWidth: 1, borderColor: VITANA_COLORS.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text }}>
                        {from === to ? from : `${from} – ${to}`}
                        <Text style={{ fontSize: 13, fontWeight: '400', color: VITANA_COLORS.textSecondary }}>
                          {' '}({days} day{days > 1 ? 's' : ''})
                        </Text>
                      </Text>
                    </View>
                    <View style={{ backgroundColor: colors.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }}>{leave.status}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, lineHeight: 18 }}>
                    {leave.reason}
                  </Text>
                  {leave.remarks && (
                    <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: VITANA_COLORS.border }}>
                      <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
                        Remarks: {leave.remarks}
                      </Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 6 }}>
                    Applied: {leave.appliedAt.split('T')[0]}
                    {leave.reviewedAt ? ` · Reviewed: ${leave.reviewedAt.split('T')[0]}` : ''}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
