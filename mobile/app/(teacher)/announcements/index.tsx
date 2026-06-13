import { View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { communicationApi, type AnnouncementDto, type AnnouncementPriority } from '@/api/endpoints/communication';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS } from '@/theme/tokens';
import { EmptyState } from '@/components/common/EmptyState';

const PRIORITY_COLORS: Record<AnnouncementPriority, string> = {
  Low: '#94a3b8',
  Normal: '#6b7280',
  High: '#f59e0b',
  Urgent: '#ef4444',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function TeacherAnnouncementsList() {
  const { colors } = useAppTheme();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['teacher-announcements'],
    queryFn: ({ pageParam = 1 }) =>
      communicationApi.getTeacherAnnouncements(pageParam as number),
    getNextPageParam: (last) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const announcements = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-3 flex-row items-center justify-between border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Announcements</Text>
        <TouchableOpacity
          onPress={() => router.push('/(teacher)/announcements/create' as never)}
          className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl"
          style={{ backgroundColor: colors.primary }}
          accessibilityLabel="Create announcement"
        >
          <Feather name="plus" size={15} color="white" />
          <Text className="text-white text-sm font-semibold">New</Text>
        </TouchableOpacity>
      </View>

      {announcements.length === 0 && !isLoading ? (
        <EmptyState
          icon="bell"
          title="No announcements yet"
          subtitle="Tap New to post an announcement to your class"
        />
      ) : (
        <FlashList
          data={announcements}
          estimatedItemSize={96}
          keyExtractor={(item) => item.id}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }: { item: AnnouncementDto }) => (
            <AnnouncementCard item={item} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function AnnouncementCard({ item }: { item: AnnouncementDto }) {
  const priorityColor = PRIORITY_COLORS[item.priority];
  const isUrgent = item.priority === 'Urgent';

  return (
    <View
      className="mx-4 my-2 rounded-xl bg-white border border-gray-100 p-4"
      style={isUrgent ? { borderLeftWidth: 3, borderLeftColor: priorityColor } : undefined}
    >
      <View className="flex-row items-start justify-between gap-2">
        <Text className="font-bold text-gray-900 flex-1 text-base" numberOfLines={2}>
          {item.title}
        </Text>
        <View
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: priorityColor + '20' }}
        >
          <Text className="text-xs font-semibold" style={{ color: priorityColor }}>
            {item.priority}
          </Text>
        </View>
      </View>

      <Text className="text-gray-600 text-sm mt-1.5 leading-5" numberOfLines={3}>
        {item.body}
      </Text>

      <View className="flex-row items-center justify-between mt-3">
        <View className="flex-row items-center gap-1">
          <Feather name="users" size={12} color={VITANA_COLORS.textSecondary} />
          <Text className="text-xs" style={{ color: VITANA_COLORS.textSecondary }}>
            {item.recipientCount} recipient{item.recipientCount !== 1 ? 's' : ''}
            {item.className ? ` · ${item.className}` : ''}
          </Text>
        </View>
        <Text className="text-xs" style={{ color: VITANA_COLORS.textSecondary }}>
          {formatDate(item.createdAt)}
        </Text>
      </View>
    </View>
  );
}
