import { View, Text, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { Feather } from '@expo/vector-icons';
import { parentApi } from '@/api/endpoints/parent';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonCard } from '@/components/common/SkeletonLoader';
import { formatRelativeTime } from '@vitana/shared-utils';
import { VITANA_COLORS } from '@/theme/tokens';
import type { Announcement } from '@vitana/shared-types';

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: '#dc2626',
  High: '#d97706',
  Normal: VITANA_COLORS.primary,
  Low: VITANA_COLORS.textSecondary,
};

function AnnouncementCard({ item }: { item: Announcement }) {
  const dotColor = PRIORITY_COLORS[item.priority] ?? VITANA_COLORS.textSecondary;

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/(parent)/announcements/[id]', params: { id: item.id } })}
      activeOpacity={0.7}
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: VITANA_COLORS.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: dotColor,
            marginTop: 6,
            flexShrink: 0,
          }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text, lineHeight: 20 }}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text
            style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 4, lineHeight: 18 }}
            numberOfLines={2}
          >
            {item.content}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
            <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary }}>
              {formatRelativeTime(item.publishedAt)}
            </Text>
            <Text style={{ fontSize: 11, color: dotColor, fontWeight: '500' }}>
              {item.priority}
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={16} color={VITANA_COLORS.border} style={{ marginTop: 2 }} />
      </View>
    </TouchableOpacity>
  );
}

export default function AnnouncementsFeed() {
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['announcements'],
      queryFn: ({ pageParam = 1 }) => parentApi.getAnnouncements(pageParam as number),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      staleTime: 5 * 60 * 1000,
    });

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];

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
          Announcements
        </Text>
      </View>

      {isLoading ? (
        <View style={{ padding: 16, gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </View>
      ) : (
        <FlashList
          data={allItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AnnouncementCard item={item} />}
          estimatedItemSize={120}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              void fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <EmptyState
              icon="bell-off"
              title="No announcements"
              subtitle="School announcements will appear here."
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
      )}
    </SafeAreaView>
  );
}
