import { View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { communicationApi, type ConversationDto } from '@/api/endpoints/communication';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS } from '@/theme/tokens';
import { EmptyState } from '@/components/common/EmptyState';

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ParentConversationsList() {
  const { colors } = useAppTheme();

  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['conversations'],
      queryFn: ({ pageParam = 1 }) => communicationApi.getConversations(pageParam as number),
      getNextPageParam: (last) =>
        last.page < last.totalPages ? last.page + 1 : undefined,
      initialPageParam: 1,
      staleTime: 30_000,
      refetchInterval: 30_000,
    });

  const conversations = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Messages</Text>
        <Text className="text-xs mt-0.5" style={{ color: VITANA_COLORS.textSecondary }}>
          Messages from your child's teachers
        </Text>
      </View>

      {conversations.length === 0 && !isLoading ? (
        <EmptyState
          icon="message-square"
          title="No messages yet"
          subtitle="Your child's teachers will send you messages here"
        />
      ) : (
        <FlashList
          data={conversations}
          estimatedItemSize={76}
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
          renderItem={({ item }: { item: ConversationDto }) => {
            const hasUnread = item.unreadCount > 0;
            return (
              <TouchableOpacity
                className="flex-row items-center px-4 py-4 border-b border-gray-100"
                style={{ backgroundColor: hasUnread ? colors.primary + '0D' : 'white' }}
                onPress={() => router.push(`/(parent)/messages/${item.id}` as never)}
                activeOpacity={0.7}
              >
                <View
                  className="w-11 h-11 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: VITANA_COLORS.surface }}
                >
                  <Text
                    className="text-lg font-bold"
                    style={{ color: VITANA_COLORS.textSecondary }}
                  >
                    {item.participantName.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-gray-900 flex-1 mr-2"
                      style={{ fontWeight: hasUnread ? '700' : '500' }}
                      numberOfLines={1}
                    >
                      {item.participantName}
                    </Text>
                    <Text className="text-xs" style={{ color: VITANA_COLORS.textSecondary }}>
                      {formatRelativeTime(item.lastMessageTime)}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between mt-0.5">
                    <Text
                      className="text-sm flex-1 mr-2"
                      style={{
                        color: hasUnread ? VITANA_COLORS.text : VITANA_COLORS.textSecondary,
                        fontWeight: hasUnread ? '500' : '400',
                      }}
                      numberOfLines={1}
                    >
                      {item.lastMessage ?? 'Start of conversation'}
                    </Text>
                    {hasUnread && (
                      <View
                        className="min-w-5 h-5 rounded-full items-center justify-center px-1"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <Text className="text-white text-xs font-bold">
                          {item.unreadCount > 99 ? '99+' : item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
