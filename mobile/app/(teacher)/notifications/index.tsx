import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { Feather } from '@expo/vector-icons';
import { teacherApi } from '@/api/endpoints/teacher';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonCard } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/common/EmptyState';
import { formatRelativeTime } from '@vitana/shared-utils';
import { VITANA_COLORS } from '@/theme/tokens';
import type { AppNotification } from '@vitana/shared-types';

const NOTIFICATION_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  leave_request_received: 'inbox',
  submission_received: 'upload',
  timetable_change: 'calendar',
  new_message: 'message-square',
  new_announcement: 'bell',
  general: 'info',
};

function NotificationRow({
  item,
  onRead,
}: {
  item: AppNotification;
  onRead: (id: string) => void;
}) {
  const icon = NOTIFICATION_ICONS[item.type] ?? 'bell';

  return (
    <TouchableOpacity
      onPress={() => {
        if (!item.isRead) onRead(item.id);
      }}
      activeOpacity={0.7}
      style={{
        backgroundColor: item.isRead ? '#fff' : '#eff6ff',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: VITANA_COLORS.border,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
        minHeight: 72,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: item.isRead ? '#f3f4f6' : '#dbeafe',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Feather name={icon} size={18} color={item.isRead ? VITANA_COLORS.textSecondary : '#2563eb'} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 14, fontWeight: item.isRead ? '400' : '600', color: VITANA_COLORS.text }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2, lineHeight: 18 }}
          numberOfLines={2}
        >
          {item.body}
        </Text>
        <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 6 }}>
          {formatRelativeTime(item.createdAt)}
        </Text>
      </View>

      {!item.isRead && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#2563eb',
            marginTop: 6,
            flexShrink: 0,
          }}
        />
      )}
    </TouchableOpacity>
  );
}

export default function TeacherNotificationCenter() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['teacher-notifications'],
      queryFn: ({ pageParam = 1 }) => teacherApi.getNotifications(pageParam as number),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      staleTime: 2 * 60 * 1000,
    });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => teacherApi.markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teacher-notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: teacherApi.markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teacher-notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] });
    },
  });

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];
  const hasUnread = allItems.some((n) => !n.isRead);

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
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}>
          Notifications
        </Text>
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
            onPress={() => router.push('/(teacher)/notifications/settings')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="settings" size={20} color={VITANA_COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: 16, gap: 10 }}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
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
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                void fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <EmptyState
                icon="bell"
                title="No notifications"
                subtitle="You're all caught up! Notifications will appear here."
              />
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
