import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { db } from '@/offline/db';
import { offlineQueue, diaryEntryQueue } from '@/offline/schema';
import { eq, and } from 'drizzle-orm';
import { OfflineQueueProcessor } from '@/offline/queue';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { isBundleFresh } from '@/offline/bundleLoader';

interface SyncItem {
  id: string;
  operationType: string;
  createdAt: number;
  errorMessage: string | null;
  status: string | null;
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function labelForOperation(op: string): string {
  return op.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SyncStatusScreen() {
  const { primaryColor } = useSchoolTheme();
  const user = useAuthStore((s) => s.user);
  const [pending, setPending] = useState<SyncItem[]>([]);
  const [failed, setFailed] = useState<SyncItem[]>([]);
  const [syncedCount, setSyncedCount] = useState(0);
  const [diaryPending, setDiaryPending] = useState(0);
  const [bundleFresh, setBundleFresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!user) return;
    const all = await db
      .select()
      .from(offlineQueue)
      .where(and(eq(offlineQueue.userId, user.id), eq(offlineQueue.schoolId, user.schoolId)));

    setPending(all.filter((i) => i.status === 'pending' || i.status === 'processing') as SyncItem[]);
    setFailed(all.filter((i) => i.status === 'failed') as SyncItem[]);
    setSyncedCount(all.filter((i) => i.status === 'synced').length);

    const diary = await db
      .select()
      .from(diaryEntryQueue)
      .where(and(eq(diaryEntryQueue.userId, user.id), eq(diaryEntryQueue.status, 'pending')));
    setDiaryPending(diary.length);

    const fresh = await isBundleFresh();
    setBundleFresh(fresh);
  }, [user]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadStatus();
    setRefreshing(false);
  }

  async function handleRetryAll() {
    if (!user || retrying) return;
    setRetrying(true);
    try {
      await db
        .update(offlineQueue)
        .set({ status: 'pending', retryCount: 0, errorMessage: null })
        .where(and(eq(offlineQueue.userId, user.id), eq(offlineQueue.status, 'failed')));
      await OfflineQueueProcessor.processQueue(user.id, user.schoolId);
      await loadStatus();
    } finally {
      setRetrying(false);
    }
  }

  const totalPending = pending.length + diaryPending;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sync Status</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary cards */}
        <View style={styles.cardRow}>
          <View style={[styles.summaryCard, { borderTopColor: VITANA_COLORS.warning }]}>
            <Text style={[styles.summaryCount, { color: VITANA_COLORS.warning }]}>{totalPending}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={[styles.summaryCard, { borderTopColor: VITANA_COLORS.error }]}>
            <Text style={[styles.summaryCount, { color: VITANA_COLORS.error }]}>{failed.length}</Text>
            <Text style={styles.summaryLabel}>Failed</Text>
          </View>
          <View style={[styles.summaryCard, { borderTopColor: VITANA_COLORS.success }]}>
            <Text style={[styles.summaryCount, { color: VITANA_COLORS.success }]}>{syncedCount}</Text>
            <Text style={styles.summaryLabel}>Synced</Text>
          </View>
        </View>

        {/* Bundle status */}
        <View style={[styles.bundleCard, bundleFresh ? styles.bundleCardFresh : styles.bundleCardStale]}>
          <Feather
            name={bundleFresh ? 'package' : 'package'}
            size={16}
            color={bundleFresh ? VITANA_COLORS.success : VITANA_COLORS.textSecondary}
          />
          <Text style={[styles.bundleText, { color: bundleFresh ? VITANA_COLORS.success : VITANA_COLORS.textSecondary }]}>
            {bundleFresh ? 'Morning bundle loaded' : 'Morning bundle not loaded (opens at 5 AM on WiFi)'}
          </Text>
        </View>

        {/* Pending items */}
        {pending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending ({pending.length})</Text>
            {pending.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={[styles.itemDot, { backgroundColor: VITANA_COLORS.warning }]} />
                <View style={styles.itemBody}>
                  <Text style={styles.itemLabel}>{labelForOperation(item.operationType)}</Text>
                  <Text style={styles.itemMeta}>{formatRelative(item.createdAt)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {diaryPending > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diary Entries ({diaryPending} pending)</Text>
            <View style={styles.itemCard}>
              <View style={[styles.itemDot, { backgroundColor: VITANA_COLORS.info }]} />
              <View style={styles.itemBody}>
                <Text style={styles.itemLabel}>Diary posts queued offline</Text>
                <Text style={styles.itemMeta}>Will sync on next connection</Text>
              </View>
            </View>
          </View>
        )}

        {/* Failed items */}
        {failed.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: VITANA_COLORS.error }]}>
                Failed ({failed.length})
              </Text>
              <TouchableOpacity
                onPress={() => void handleRetryAll()}
                disabled={retrying}
                style={[styles.retryBtn, { borderColor: primaryColor }]}
                activeOpacity={0.7}
              >
                <Feather name="refresh-cw" size={13} color={primaryColor} />
                <Text style={[styles.retryBtnLabel, { color: primaryColor }]}>
                  {retrying ? 'Retrying…' : 'Retry All'}
                </Text>
              </TouchableOpacity>
            </View>
            {failed.map((item) => {
              let errorLabel = item.errorMessage ?? 'Unknown error';
              try {
                const parsed = JSON.parse(item.errorMessage ?? '{}') as { type?: string };
                if (parsed.type === 'conflict') errorLabel = 'Conflict — data already submitted by another user';
              } catch {
                // keep original
              }
              return (
                <View key={item.id} style={[styles.itemCard, styles.itemCardFailed]}>
                  <View style={[styles.itemDot, { backgroundColor: VITANA_COLORS.error }]} />
                  <View style={styles.itemBody}>
                    <Text style={styles.itemLabel}>{labelForOperation(item.operationType)}</Text>
                    <Text style={[styles.itemMeta, { color: VITANA_COLORS.error }]} numberOfLines={2}>
                      {errorLabel}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Synced summary */}
        {syncedCount > 0 && (
          <View style={styles.syncedCard}>
            <Feather name="check-circle" size={16} color={VITANA_COLORS.success} />
            <Text style={[styles.syncedText, { color: VITANA_COLORS.success }]}>
              {syncedCount} item{syncedCount !== 1 ? 's' : ''} synced today
            </Text>
          </View>
        )}

        {/* Empty state */}
        {totalPending === 0 && failed.length === 0 && syncedCount === 0 && (
          <View style={styles.emptyState}>
            <Feather name="check-circle" size={48} color={VITANA_COLORS.success} />
            <Text style={styles.emptyTitle}>All synced</Text>
            <Text style={styles.emptySubtitle}>No pending or failed items</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VITANA_COLORS.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: VITANA_COLORS.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
  },
  summaryCount: {
    fontSize: 26,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 12,
    color: VITANA_COLORS.textSecondary,
    marginTop: 2,
  },
  bundleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  bundleCardFresh: {
    backgroundColor: VITANA_COLORS.successLight,
    borderColor: VITANA_COLORS.success,
  },
  bundleCardStale: {
    backgroundColor: VITANA_COLORS.surface,
    borderColor: VITANA_COLORS.border,
  },
  bundleText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  section: {
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: VITANA_COLORS.text,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  retryBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  itemCardFailed: {
    borderColor: VITANA_COLORS.error,
    backgroundColor: VITANA_COLORS.errorLight,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  itemBody: {
    flex: 1,
    gap: 3,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: VITANA_COLORS.text,
  },
  itemMeta: {
    fontSize: 12,
    color: VITANA_COLORS.textSecondary,
  },
  syncedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: VITANA_COLORS.successLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: VITANA_COLORS.success,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  syncedText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: VITANA_COLORS.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: VITANA_COLORS.textSecondary,
  },
});
