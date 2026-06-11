import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { adminApi, type Announcement } from '@/api/endpoints/admin';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS } from '@/theme/tokens';
import { EmptyState } from '@/components/common/EmptyState';
import { queryClient } from '@/api/queryClient';
import { formatRelativeTime } from '@vitana/shared-utils';

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#94a3b8',
  Normal: '#6b7280',
  High: '#f59e0b',
  Urgent: '#ef4444',
};

export default function AnnouncementsList() {
  const { colors } = useAppTheme();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['my-announcements'],
    queryFn: ({ pageParam = 1 }) => adminApi.getAnnouncements(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
    staleTime: 2 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-announcements'] });
    },
    onError: () => Alert.alert('Error', 'Failed to delete announcement.'),
  });

  function handleDelete(item: Announcement) {
    Alert.alert(
      'Delete Announcement',
      `Delete "${item.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(item.id),
        },
      ],
    );
  }

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
        <Text className="text-xl font-bold text-gray-900">Announcements</Text>
        <TouchableOpacity
          onPress={() => router.push('/(admin)/announcements/create')}
          className="flex-row items-center px-3 py-2 rounded-xl"
          style={{ backgroundColor: colors.primary }}
        >
          <Feather name="plus" size={16} color="white" />
          <Text className="text-white font-medium text-sm ml-1">New</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : allItems.length === 0 ? (
        <EmptyState
          icon="volume-2"
          title="No announcements yet"
          subtitle="Post your first announcement to notify staff, parents, or students."
        />
      ) : (
        <FlashList
          data={allItems}
          estimatedItemSize={100}
          keyExtractor={(item) => item.id}
          refreshing={isRefetching}
          onRefresh={refetch}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View
              className="bg-white border-b border-gray-100 mx-4 mb-2 rounded-xl overflow-hidden shadow-sm"
              style={{ borderLeftWidth: 4, borderLeftColor: PRIORITY_COLORS[item.priority] ?? VITANA_COLORS.textSecondary }}
            >
              <View className="px-4 py-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <View className="flex-row items-center gap-2 mb-1">
                      <View
                        className="px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: (PRIORITY_COLORS[item.priority] ?? VITANA_COLORS.textSecondary) + '20' }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{ color: PRIORITY_COLORS[item.priority] ?? VITANA_COLORS.textSecondary }}
                        >
                          {item.priority}
                        </Text>
                      </View>
                      <Text className="text-gray-400 text-xs">{item.audience}</Text>
                    </View>
                    <Text className="font-semibold text-gray-900 text-base" numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1" numberOfLines={2}>
                      {item.body}
                    </Text>
                    <Text className="text-gray-400 text-xs mt-2">
                      {formatRelativeTime(item.createdAt)} · {item.createdByName}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    disabled={deleteMutation.isPending}
                    className="p-2"
                  >
                    <Feather name="trash-2" size={18} color={VITANA_COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/(admin)/announcements/create')}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        style={{ backgroundColor: colors.primary }}
      >
        <Feather name="plus" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
