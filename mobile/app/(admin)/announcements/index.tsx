import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { adminApi, type Announcement } from '@/api/endpoints/admin';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS } from '@/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { queryClient } from '@/api/queryClient';
import { formatRelativeTime } from '@vitana/shared-utils';

const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
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

  function handleEdit(item: Announcement) {
    router.push({
      pathname: '/(admin)/announcements/create',
      params: {
        editId: item.id,
        editTitle: item.title,
        editContent: item.content,
        editPriority: item.priority,
        editAudience: item.targetAudience,
      },
    });
  }

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];
  const priorityConf = (p: string) => PRIORITY_CONFIG[p] ?? { color: '#6b7280', bg: '#f3f4f6' };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="volume-2" size={20} color={colors.primary} />
          <Text style={styles.headerTitle}>Announcements</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(admin)/announcements/create')}
          activeOpacity={0.8}
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={15} color="#fff" />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
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
          estimatedItemSize={120}
          keyExtractor={(item) => item.id}
          refreshing={isRefetching}
          onRefresh={refetch}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const conf = priorityConf(item.priority);
            return (
              <View style={[styles.card, { borderLeftColor: conf.color }]}>
                {/* Priority + Audience row */}
                <View style={styles.badgeRow}>
                  <View style={[styles.priorityBadge, { backgroundColor: conf.bg }]}>
                    <Text style={[styles.priorityBadgeText, { color: conf.color }]}>
                      {item.priority}
                    </Text>
                  </View>
                  <View style={styles.audienceBadge}>
                    <Feather name="users" size={10} color="#94a3b8" />
                    <Text style={styles.audienceText}>
                      {AUDIENCE_LABELS[item.targetAudience] ?? item.targetAudience}
                    </Text>
                  </View>
                  {item.isPinned && (
                    <View style={styles.pinnedBadge}>
                      <Feather name="bookmark" size={10} color="#8b5cf6" />
                      <Text style={styles.pinnedText}>Pinned</Text>
                    </View>
                  )}
                </View>

                {/* Title + delete button */}
                <View style={styles.cardBody}>
                  <View style={styles.cardMain}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {!!item.content && (
                      <Text style={styles.cardContent} numberOfLines={2}>
                        {item.content}
                      </Text>
                    )}
                    <View style={styles.cardMeta}>
                      <Feather name="clock" size={11} color="#94a3b8" />
                      <Text style={styles.cardMetaText}>
                        {formatRelativeTime(item.createdAt)}
                        {item.createdByStaffName ? ` · ${item.createdByStaffName}` : ''}
                      </Text>
                      {item.totalRecipients > 0 && (
                        <>
                          <Text style={styles.cardMetaDot}>·</Text>
                          <Feather name="eye" size={11} color="#94a3b8" />
                          <Text style={styles.cardMetaText}>
                            {item.readCount}/{item.totalRecipients}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => handleEdit(item)}
                      style={styles.editBtn}
                      activeOpacity={0.7}
                    >
                      <Feather name="edit-2" size={15} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      disabled={deleteMutation.isPending}
                      style={styles.deleteBtn}
                      activeOpacity={0.7}
                    >
                      <Feather name="trash-2" size={15} color={VITANA_COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/(admin)/announcements/create')}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
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
    paddingBottom: 88,
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
    shadowOpacity: 0.05,
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
  priorityBadgeText: {
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
  cardBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardMain: {
    flex: 1,
    marginRight: 10,
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
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  cardMetaDot: {
    fontSize: 11,
    color: '#94a3b8',
  },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
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
