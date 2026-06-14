import { View, Text, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { Feather } from '@expo/vector-icons';
import { studentApi } from '@/api/endpoints/student';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonCard } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@vitana/shared-utils';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import type { Announcement } from '@vitana/shared-types';

export default function AnnouncementsScreen() {
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['student-announcements'],
      queryFn: ({ pageParam = 1 }) => studentApi.getAnnouncements(pageParam as number),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      staleTime: 5 * 60 * 1000,
    });

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: VITANA_COLORS.surface }} edges={['top']}>
      <SubScreenHeader title="Announcements" />

      {isLoading ? (
        <View style={{ padding: 16, gap: 10 }}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} lines={3} />)}
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <FlashList
            data={allItems}
            keyExtractor={(item) => item.id}
            estimatedItemSize={100}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <EmptyState icon="bell" title="No announcements" subtitle="School announcements will appear here." />
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <ActivityIndicator color={primaryColor} />
                </View>
              ) : null
            }
            renderItem={({ item }: { item: Announcement }) => (
              <TouchableOpacity
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View
                    style={{
                      backgroundColor: primaryColor + '15', borderRadius: 10, padding: 8,
                    }}
                  >
                    <Feather name="bell" size={16} color={primaryColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text }} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.content && (
                      <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 3, lineHeight: 18 }} numberOfLines={2}>
                        {item.content}
                      </Text>
                    )}
                    <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 6 }}>
                      {formatRelativeTime(item.publishedAt)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
