import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { adminApi } from '@/api/endpoints/admin';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@vitana/shared-utils';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import type { AppNotification } from '@vitana/shared-types';

interface PaginatedResponse<T> {
  items: T[]; totalCount: number; page: number; pageSize: number; totalPages: number;
}

const NOTIFICATION_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  billing_expiry_warning: 'alert-triangle',
  billing_expired:        'alert-octagon',
  new_announcement:       'bell',
  leave_request_received: 'inbox',
  general:                'info',
};

// ─── Pending approvals banner ─────────────────────────────────────────────────

function PendingApprovalsBanner({
  leaveCount, admissionCount, docsCount,
}: {
  leaveCount: number; admissionCount: number; docsCount: number;
}) {
  const { primaryColor } = useSchoolTheme();
  const total = leaveCount + admissionCount + docsCount;
  if (total === 0) return null;

  const lines: { label: string; count: number; color: string; icon: string }[] = [
    ...(leaveCount    > 0 ? [{ label: 'leave request', count: leaveCount,    color: '#d97706', icon: 'calendar' }] : []),
    ...(admissionCount > 0 ? [{ label: 'admission',     count: admissionCount, color: '#2563eb', icon: 'user-plus' }] : []),
    ...(docsCount     > 0 ? [{ label: 'document',       count: docsCount,     color: '#7c3aed', icon: 'file-text' }] : []),
  ];

  return (
    <TouchableOpacity
      style={styles.approvalBanner}
      onPress={() => router.push('/(admin)/approvals')}
      activeOpacity={0.8}
    >
      <View style={styles.approvalBannerLeft}>
        <View style={styles.approvalBannerIconWrap}>
          <Feather name="clock" size={18} color="#d97706" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.approvalBannerTitle}>
            {total} item{total !== 1 ? 's' : ''} need your approval
          </Text>
          <Text style={styles.approvalBannerSub}>
            {lines.map((l) => `${l.count} ${l.label}${l.count !== 1 ? 's' : ''}`).join(' · ')}
          </Text>
        </View>
      </View>
      <View style={styles.approvalBannerArrow}>
        <Text style={[styles.approvalBannerReview, { color: primaryColor }]}>Review</Text>
        <Feather name="chevron-right" size={14} color={primaryColor} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Notification row ─────────────────────────────────────────────────────────

function NotificationRow({ item, onRead }: { item: AppNotification; onRead: (id: string) => void }) {
  const icon = NOTIFICATION_ICONS[item.type] ?? 'bell';
  return (
    <TouchableOpacity
      onPress={() => { if (!item.isRead) onRead(item.id); }}
      activeOpacity={0.7}
      style={[styles.notifRow, !item.isRead && styles.notifRowUnread]}
    >
      <View style={[styles.notifIcon, !item.isRead && styles.notifIconUnread]}>
        <Feather name={icon} size={18} color={item.isRead ? VITANA_COLORS.textSecondary : '#2563eb'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.notifTitle, !item.isRead && { fontWeight: '600' }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.notifTime}>{formatRelativeTime(item.createdAt)}</Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminNotificationCenter() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();

  // Fetch in-app notifications
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['admin-notifications'],
      queryFn: async ({ pageParam = 1 }) => {
        const res = await (apiClient.get('/notifications/my', {
          params: { page: pageParam, pageSize: 20 },
        }) as Promise<Record<string, unknown>>);
        return {
          items: (res?.notifications ?? res?.items ?? []) as AppNotification[],
          totalCount: (res?.total ?? res?.totalCount ?? 0) as number,
          page: (res?.page ?? pageParam) as number,
          pageSize: (res?.pageSize ?? 20) as number,
          totalPages: (res?.totalPages ?? 1) as number,
        } satisfies PaginatedResponse<AppNotification>;
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      staleTime: 2 * 60 * 1000,
    });

  // Fetch pending approvals counts to surface in notification center
  const { data: dashData } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboard,
    staleTime: 3 * 60 * 1000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.put(`/notifications/${id}/read`) as Promise<void>,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.put('/notifications/read-all') as Promise<void>,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];
  const hasUnread = allItems.some((n) => !n.isRead);

  const leaveCount     = dashData?.pendingApprovals?.leaveRequests ?? 0;
  const admissionCount = dashData?.pendingApprovals?.admissionApplications ?? 0;
  const docsCount      = dashData?.pendingApprovals?.documentVerifications ?? 0;
  const totalPending   = leaveCount + admissionCount + docsCount;

  function handleRefresh() {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader
        title="Notifications"
        rightSlot={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {hasUnread && (
              <TouchableOpacity
                onPress={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 13, color: primaryColor, fontWeight: '500' }}>
                  {markAllReadMutation.isPending ? 'Marking...' : 'Mark all read'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => router.push('/(admin)/notifications/settings')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="settings" size={20} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Pending approvals banner — always visible when approvals need attention */}
      <PendingApprovalsBanner
        leaveCount={leaveCount}
        admissionCount={admissionCount}
        docsCount={docsCount}
      />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={primaryColor} size="large" />
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <FlashList
            data={allItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationRow item={item} onRead={(id) => markReadMutation.mutate(id)} />
            )}
            estimatedItemSize={88}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={handleRefresh}
                tintColor={primaryColor}
              />
            }
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              totalPending > 0 ? (
                // There are pending approvals but no push notifications yet
                <View style={styles.emptyWithApprovals}>
                  <Feather name="bell" size={40} color={VITANA_COLORS.border} />
                  <Text style={styles.emptyTitle}>No push notifications yet</Text>
                  <Text style={styles.emptySub}>
                    Push notifications will appear here when staff or parents send requests.
                  </Text>
                  <Text style={styles.emptyHint}>
                    The banner above shows <Text style={{ fontWeight: '700' }}>{totalPending} item{totalPending !== 1 ? 's' : ''}</Text> waiting for your approval.
                  </Text>
                  <TouchableOpacity
                    style={[styles.goToApprovalsBtn, { backgroundColor: primaryColor }]}
                    onPress={() => router.push('/(admin)/approvals')}
                  >
                    <Feather name="check-circle" size={16} color="#fff" />
                    <Text style={styles.goToApprovalsBtnText}>Open Approvals</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <EmptyState
                  icon="bell"
                  title="No notifications"
                  subtitle="You're all caught up! Push notifications will appear here."
                />
              )
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <ActivityIndicator color={primaryColor} />
                </View>
              ) : null
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: VITANA_COLORS.surface },

  approvalBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fffbeb', borderBottomWidth: 1, borderBottomColor: '#fde68a',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  approvalBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  approvalBannerIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center',
  },
  approvalBannerTitle: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  approvalBannerSub: { fontSize: 11, color: '#b45309', marginTop: 1 },
  approvalBannerArrow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  approvalBannerReview: { fontSize: 12, fontWeight: '700' },

  notifRow: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
    backgroundColor: '#fff', minHeight: 72,
  },
  notifRowUnread: { backgroundColor: '#eff6ff' },
  notifIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notifIconUnread: { backgroundColor: '#dbeafe' },
  notifTitle: { fontSize: 14, fontWeight: '400', color: VITANA_COLORS.text },
  notifBody: { fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
  notifTime: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb', marginTop: 6, flexShrink: 0 },

  emptyWithApprovals: { padding: 40, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: VITANA_COLORS.text },
  emptySub: { fontSize: 13, color: VITANA_COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },
  emptyHint: {
    fontSize: 13, color: VITANA_COLORS.text, textAlign: 'center', lineHeight: 19,
    backgroundColor: '#fef3c7', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  goToApprovalsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 4,
  },
  goToApprovalsBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
