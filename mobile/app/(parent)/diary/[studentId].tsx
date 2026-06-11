import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import * as WebBrowser from 'expo-web-browser';
import { Feather } from '@expo/vector-icons';
import { parentApi } from '@/api/endpoints/parent';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonCard } from '@/components/common/SkeletonLoader';
import { formatDate } from '@vitana/shared-utils';
import { VITANA_COLORS } from '@/theme/tokens';
import type { DiaryEntry } from '@/api/endpoints/parent';

function DiaryCard({ entry }: { entry: DiaryEntry }) {
  return (
    <View
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
      {/* Date + Subject Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Feather name="calendar" size={13} color={VITANA_COLORS.textSecondary} />
          <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
            {formatDate(entry.date)}
          </Text>
        </View>
        {entry.subjectName && (
          <View
            style={{
              backgroundColor: '#eff6ff',
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 11, color: '#1d4ed8', fontWeight: '600' }}>
              {entry.subjectName}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <Text style={{ fontSize: 14, color: VITANA_COLORS.text, lineHeight: 20 }}>
        {entry.content}
      </Text>

      {/* Teacher */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}>
        <Feather name="user" size={12} color={VITANA_COLORS.textSecondary} />
        <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>{entry.teacherName}</Text>
      </View>

      {/* Attachment */}
      {entry.attachmentUrl && (
        <TouchableOpacity
          onPress={() => WebBrowser.openBrowserAsync(entry.attachmentUrl!)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}
        >
          <Feather name="paperclip" size={14} color={VITANA_COLORS.primary} />
          <Text style={{ fontSize: 13, color: VITANA_COLORS.primary, fontWeight: '500' }}>
            View Attachment
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ClassDiary() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['diary', studentId],
      queryFn: ({ pageParam = 1 }) =>
        parentApi.getDiaryEntries(studentId!, pageParam as number),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      enabled: !!studentId,
      staleTime: 10 * 60 * 1000,
    });

  const allEntries = data?.pages.flatMap((p) => p.items) ?? [];

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
          Class Diary
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
          data={allEntries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DiaryCard entry={item} />}
          estimatedItemSize={140}
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
              icon="book"
              title="No diary entries"
              subtitle="Class diary entries will appear here when added by teachers."
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
