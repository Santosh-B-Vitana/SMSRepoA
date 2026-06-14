import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { formatINR } from '@vitana/shared-utils';

interface FeeStructure {
  id: string;
  name: string;
  class?: string;
  academicYear: string;
  totalAmount: number;
  tuitionFee: number;
  admissionFee: number;
  examFee: number;
  isActive?: boolean;
  installmentCount?: number;
}

function StructureCard({ item }: { item: FeeStructure }) {
  const { primaryColor } = useSchoolTheme();
  const components = [
    { label: 'Tuition', amount: item.tuitionFee },
    { label: 'Admission', amount: item.admissionFee },
    { label: 'Exam', amount: item.examFee },
  ].filter(c => c.amount > 0);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardMeta}>
            {item.class ? `${item.class} · ` : ''}{item.academicYear}
          </Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={[styles.totalAmount, { color: primaryColor }]}>{formatINR(item.totalAmount)}</Text>
          <Text style={styles.totalLabel}>Total</Text>
        </View>
      </View>

      {components.length > 0 && (
        <View style={styles.components}>
          {components.map((c, i) => (
            <View key={c.label} style={[styles.componentRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#f9fafb' }]}>
              <Text style={styles.componentLabel}>{c.label}</Text>
              <Text style={styles.componentAmount}>{formatINR(c.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardFooter}>
        <View style={[styles.activeBadge, { backgroundColor: item.isActive !== false ? '#dcfce7' : '#fee2e2' }]}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: item.isActive !== false ? '#166534' : '#991b1b' }}>
            {item.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
        {(item.installmentCount ?? 1) > 1 && (
          <Text style={styles.installmentText}>{item.installmentCount} installments</Text>
        )}
      </View>
    </View>
  );
}

export default function FeeSetupScreen() {
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery<{ items?: FeeStructure[]; data?: FeeStructure[] } | FeeStructure[]>({
    queryKey: ['admin-fee-structures'],
    queryFn: () => apiClient.get('/fees/structures') as Promise<any>,
    staleTime: 5 * 60 * 1000,
  });

  const structures: FeeStructure[] = Array.isArray(data)
    ? data
    : ((data as any)?.items ?? (data as any)?.data ?? []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Fee Structures" />

      <View style={styles.infoBar}>
        <Feather name="info" size={13} color={primaryColor} />
        <Text style={[styles.infoText, { color: primaryColor }]}>
          View-only — manage fee structures in the CRM portal for full editing.
        </Text>
      </View>

      <FlatList
        data={structures}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StructureCard item={item} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={primaryColor} /></View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center', gap: 8 }}>
              <Feather name="layers" size={32} color={VITANA_COLORS.border} />
              <Text style={{ color: VITANA_COLORS.textSecondary }}>No fee structures configured</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  infoBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#eff6ff', paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#dbeafe',
  },
  infoText: { flex: 1, fontSize: 12, fontWeight: '500' },
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  cardName: { fontSize: 15, fontWeight: '700', color: VITANA_COLORS.text },
  cardMeta: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  totalBadge: { alignItems: 'flex-end' },
  totalAmount: { fontSize: 18, fontWeight: '800', fontFamily: 'Poppins' },
  totalLabel: { fontSize: 10, color: VITANA_COLORS.textSecondary },
  components: { borderTopWidth: 1, borderTopColor: '#f9fafb' },
  componentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 },
  componentLabel: { fontSize: 13, color: VITANA_COLORS.textSecondary },
  componentAmount: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.text },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: '#f9fafb' },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  installmentText: { fontSize: 11, color: VITANA_COLORS.textSecondary },
});
