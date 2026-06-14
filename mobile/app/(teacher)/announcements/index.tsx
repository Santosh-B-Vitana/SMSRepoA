import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { communicationApi, type AnnouncementDto, type AnnouncementPriority } from '@/api/endpoints/communication';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@vitana/shared-utils';

const PRIORITY_CONFIG: Record<AnnouncementPriority, { color: string; bg: string }> = {
  Low:    { color: '#94a3b8', bg: '#f1f5f9' },
  Normal: { color: '#3b82f6', bg: '#eff6ff' },
  High:   { color: '#f59e0b', bg: '#fffbeb' },
  Urgent: { color: '#ef4444', bg: '#fef2f2' },
};

const AUDIENCE_LABELS: Record<string, string> = {
  All:      'All School',
  Parents:  'Parents',
  Staff:    'Staff',
  Students: 'Students',
};

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubScreenHeader
        title="Announcements"
        rightSlot={
          <TouchableOpacity
            onPress={() => router.push('/(teacher)/announcements/create' as never)}
            activeOpacity={0.8}
            style={[styles.newBtn, { backgroundColor: colors.primary }]}
            accessibilityLabel="Create announcement"
          >
            <Feather name="plus" size={15} color="#fff" />
            <Text style={styles.newBtnText}>New</Text>
          </TouchableOpacity>
        }
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon="volume-2"
          title="No announcements yet"
          subtitle="Tap New to post an announcement for your classes, or check back later for school-wide updates."
        />
      ) : (
        <FlashList
          data={announcements}
          estimatedItemSize={120}
          keyExtractor={(item) => item.id}
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={refetch}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          renderItem={({ item }: { item: AnnouncementDto }) => {
            const conf = PRIORITY_CONFIG[item.priority] ?? { color: '#6b7280', bg: '#f3f4f6' };
            return (
              <View style={[styles.card, { borderLeftColor: conf.color }]}>
                {/* Priority + Audience row */}
                <View style={styles.badgeRow}>
                  <View style={[styles.priorityBadge, { backgroundColor: conf.bg }]}>
                    <Text style={[styles.priorityText, { color: conf.color }]}>
                      {item.priority}
                    </Text>
                  </View>
                  {!!item.targetAudience && (
                    <View style={styles.audienceBadge}>
                      <Feather name="users" size={10} color="#94a3b8" />
                      <Text style={styles.audienceText}>
                        {AUDIENCE_LABELS[item.targetAudience] ?? item.targetAudience}
                      </Text>
                    </View>
                  )}
                  {item.isPinned && (
                    <View style={styles.pinnedBadge}>
                      <Feather name="bookmark" size={10} color="#8b5cf6" />
                      <Text style={styles.pinnedText}>Pinned</Text>
                    </View>
                  )}
                </View>

                {/* Title */}
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>

                {/* Content preview */}
                {!!item.content && (
                  <Text style={styles.cardContent} numberOfLines={2}>
                    {item.content}
                  </Text>
                )}

                {/* Footer meta */}
                <View style={styles.cardMeta}>
                  <Feather name="clock" size={11} color="#94a3b8" />
                  <Text style={styles.metaText}>
                    {formatRelativeTime(item.createdAt)}
                    {item.createdByStaffName ? ` · ${item.createdByStaffName}` : ''}
                  </Text>
                  {item.totalRecipients > 0 && (
                    <>
                      <Text style={styles.metaDot}>·</Text>
                      <Feather name="eye" size={11} color="#94a3b8" />
                      <Text style={styles.metaText}>
                        {item.readCount}/{item.totalRecipients}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* FAB for quick compose */}
      <TouchableOpacity
        onPress={() => router.push('/(teacher)/announcements/create' as never)}
        activeOpacity={0.85}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  newBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 12,
    paddingBottom: 96,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  audienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  audienceText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pinnedText: {
    fontSize: 11,
    color: '#8b5cf6',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 21,
    marginBottom: 3,
  },
  cardContent: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  metaDot: {
    fontSize: 11,
    color: '#94a3b8',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1a6fd8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
