import { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, ActivityIndicator,
  RefreshControl, Modal, ScrollView, KeyboardAvoidingView, Platform,
  Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { formatINR } from '@vitana/shared-utils';
import { AdminAlertBanner } from '@/components/admin/AdminAlertBanner';

interface FeeRecord {
  id: string;
  studentName: string;
  studentClass?: string;
  feeTypeName?: string;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate?: string;
  status: 'Paid' | 'Partial' | 'Overdue' | 'Pending';
}

interface FeeStats {
  collectedToday: number;
  collectedThisMonth: number;
  totalOverdue: number;
  overdueCount: number;
}

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Feather name={icon as any} size={18} color={color} style={{ marginBottom: 6 }} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Paid:     { bg: '#dcfce7', text: '#166534' },
  Partial:  { bg: '#fef3c7', text: '#92400e' },
  Overdue:  { bg: '#fee2e2', text: '#991b1b' },
  Pending:  { bg: '#f3f4f6', text: '#374151' },
};

export default function FeeCollectionScreen() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showPayModal, setShowPayModal] = useState<FeeRecord | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');

  const statsQuery = useQuery<FeeStats>({
    queryKey: ['admin-fee-stats'],
    queryFn: () => apiClient.get('/fees/stats') as Promise<FeeStats>,
    staleTime: 5 * 60 * 1000,
  });

  const recordsQuery = useInfiniteQuery({
    queryKey: ['admin-fee-records', debouncedSearch],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get('/fees/records', {
        params: { page: pageParam, pageSize: 20, search: debouncedSearch || undefined, status: 'Overdue,Pending,Partial' },
      }) as Promise<{ items: FeeRecord[]; totalCount: number }>,
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => lastPage.items?.length === 20 ? pages.length + 1 : undefined,
    staleTime: 2 * 60 * 1000,
  });

  const payMutation = useMutation({
    mutationFn: ({ feeRecordId, amount, paymentMode }: { feeRecordId: string; amount: number; paymentMode: string }) =>
      apiClient.post('/fees/payments', { feeRecordId, amount, paymentMode }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-fee-records'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-fee-stats'] });
      setShowPayModal(null);
      setPayAmount('');
    },
    onError: (err: any) => Alert.alert('Error', err?.message ?? 'Failed to record payment'),
  });

  const handleSearch = (text: string) => {
    setSearch(text);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => setDebouncedSearch(text), 400);
  };

  const stats = statsQuery.data;
  const allRecords = recordsQuery.data?.pages.flatMap((p) => p.items ?? []) ?? [];
  const PAYMENT_MODES = ['Cash', 'Cheque', 'Online', 'DD', 'Other'];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Fee Collection" />
      <AdminAlertBanner context="fees" />

      {/* Stats */}
      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.statsScroll}>
          <StatCard label="Today" value={formatINR(stats.collectedToday ?? 0)} color="#059669" icon="trending-up" />
          <StatCard label="This Month" value={formatINR(stats.collectedThisMonth ?? 0)} color={primaryColor} icon="credit-card" />
          <StatCard label="Overdue Amt" value={formatINR(stats.totalOverdue ?? 0)} color="#dc2626" icon="alert-circle" />
          <StatCard label="Overdue Count" value={String(stats.overdueCount ?? 0)} color="#d97706" icon="users" />
        </ScrollView>
      )}

      {/* Search */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={15} color={VITANA_COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by student name..."
          placeholderTextColor={VITANA_COLORS.textSecondary}
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }}>
            <Feather name="x" size={14} color={VITANA_COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={allRecords}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={recordsQuery.isRefetching} onRefresh={() => void recordsQuery.refetch()} tintColor={primaryColor} />}
        onEndReached={() => { if (recordsQuery.hasNextPage && !recordsQuery.isFetchingNextPage) void recordsQuery.fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => {
          const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.Pending;
          return (
            <View style={styles.record}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recordName}>{item.studentName}</Text>
                {item.studentClass && <Text style={styles.recordClass}>{item.studentClass}</Text>}
                <Text style={styles.recordFeeType}>{item.feeTypeName ?? 'Fee'}</Text>
                <View style={styles.recordAmounts}>
                  <Text style={styles.totalAmt}>Total: {formatINR(item.amount)}</Text>
                  <Text style={styles.pendingAmt}>Pending: {formatINR(item.pendingAmount)}</Text>
                </View>
              </View>
              <View style={styles.recordRight}>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>{item.status}</Text>
                </View>
                {item.status !== 'Paid' && (
                  <TouchableOpacity
                    style={[styles.collectBtn, { backgroundColor: primaryColor }]}
                    onPress={() => { setShowPayModal(item); setPayAmount(String(item.pendingAmount)); }}
                  >
                    <Text style={styles.collectBtnText}>Collect</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListFooterComponent={recordsQuery.isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} color={primaryColor} /> : null}
        ListEmptyComponent={
          recordsQuery.isLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={primaryColor} /></View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center', gap: 8 }}>
              <Feather name="credit-card" size={32} color={VITANA_COLORS.border} />
              <Text style={{ color: VITANA_COLORS.textSecondary }}>No pending fee records</Text>
            </View>
          )
        }
      />

      {/* Record Payment modal */}
      <Modal visible={!!showPayModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowPayModal(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Record Payment</Text>
            <TouchableOpacity onPress={() => setShowPayModal(null)}>
              <Feather name="x" size={20} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          {showPayModal && (
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
                <View style={styles.payInfo}>
                  <Text style={styles.payName}>{showPayModal.studentName}</Text>
                  <Text style={styles.payMeta}>{showPayModal.feeTypeName} · Pending: {formatINR(showPayModal.pendingAmount)}</Text>
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Amount (₹)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={payAmount}
                    onChangeText={setPayAmount}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                    placeholderTextColor={VITANA_COLORS.textSecondary}
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Payment Mode</Text>
                  <View style={styles.pillRow}>
                    {PAYMENT_MODES.map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.pill, payMode === m && { backgroundColor: `${primaryColor}18`, borderColor: primaryColor }]}
                        onPress={() => setPayMode(m)}
                      >
                        <Text style={[styles.pillText, payMode === m && { color: primaryColor }]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: primaryColor }, payMutation.isPending && { opacity: 0.6 }]}
                  onPress={() => {
                    const amt = parseFloat(payAmount);
                    if (!amt || amt <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
                    payMutation.mutate({ feeRecordId: showPayModal.id, amount: amt, paymentMode: payMode });
                  }}
                  disabled={payMutation.isPending}
                >
                  {payMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Record Payment</Text>}
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  statsScroll: { padding: 12, gap: 10, flexDirection: 'row' },
  statCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, minWidth: 110,
    alignItems: 'center', borderTopWidth: 3,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 4, marginTop: 4,
    borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: VITANA_COLORS.text, padding: 0 },
  record: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  recordName: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  recordClass: { fontSize: 12, color: VITANA_COLORS.textSecondary },
  recordFeeType: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  recordAmounts: { flexDirection: 'row', gap: 10, marginTop: 4 },
  totalAmt: { fontSize: 12, color: VITANA_COLORS.textSecondary },
  pendingAmt: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  recordRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  collectBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  collectBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text },
  payInfo: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 14 },
  payName: { fontSize: 16, fontWeight: '700', color: VITANA_COLORS.text },
  payMeta: { fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: VITANA_COLORS.text, marginBottom: 6 },
  fieldInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: VITANA_COLORS.text,
    backgroundColor: '#fafafa',
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  pillText: { fontSize: 12, fontWeight: '500', color: VITANA_COLORS.textSecondary },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
