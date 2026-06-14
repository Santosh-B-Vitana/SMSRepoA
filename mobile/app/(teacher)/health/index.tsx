import { useState } from 'react';
import {
  View, Text, TextInput, ActivityIndicator, FlatList,
  RefreshControl, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

interface HealthRecord {
  id: string;
  studentId: string;
  studentName: string;
  className?: string | null;
  bloodGroup?: string | null;
  height?: number | null;
  weight?: number | null;
  visionLeft?: string | null;
  visionRight?: string | null;
  allergies?: string | null;
  medicalConditions?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  lastUpdated?: string | null;
}

function HealthCard({ record }: { record: HealthRecord }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity style={styles.card} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{record.studentName}</Text>
          {record.className && <Text style={styles.cardClass}>{record.className}</Text>}
        </View>
        <View style={styles.badgeRow}>
          {record.bloodGroup && (
            <View style={styles.bloodBadge}>
              <Text style={styles.bloodText}>{record.bloodGroup}</Text>
            </View>
          )}
          <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={VITANA_COLORS.textSecondary} />
        </View>
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        {record.height != null && (
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{record.height} cm</Text>
            <Text style={styles.metricLabel}>Height</Text>
          </View>
        )}
        {record.weight != null && (
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{record.weight} kg</Text>
            <Text style={styles.metricLabel}>Weight</Text>
          </View>
        )}
        {(record.visionLeft || record.visionRight) && (
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{record.visionLeft ?? '—'} / {record.visionRight ?? '—'}</Text>
            <Text style={styles.metricLabel}>Vision L/R</Text>
          </View>
        )}
      </View>

      {/* Expanded details */}
      {expanded && (
        <View style={styles.details}>
          <View style={styles.divider} />
          {record.allergies ? (
            <View style={styles.detailRow}>
              <Feather name="alert-triangle" size={13} color="#f59e0b" />
              <Text style={styles.detailLabel}>Allergies:</Text>
              <Text style={[styles.detailValue, { color: '#b45309' }]}>{record.allergies}</Text>
            </View>
          ) : null}
          {record.medicalConditions ? (
            <View style={styles.detailRow}>
              <Feather name="activity" size={13} color="#ef4444" />
              <Text style={styles.detailLabel}>Conditions:</Text>
              <Text style={[styles.detailValue, { color: '#991b1b' }]}>{record.medicalConditions}</Text>
            </View>
          ) : null}
          {record.emergencyContact ? (
            <View style={styles.detailRow}>
              <Feather name="phone" size={13} color={VITANA_COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Emergency:</Text>
              <Text style={styles.detailValue}>{record.emergencyContact}{record.emergencyPhone ? ` · ${record.emergencyPhone}` : ''}</Text>
            </View>
          ) : null}
          {record.lastUpdated && (
            <Text style={styles.lastUpdated}>Updated: {new Date(record.lastUpdated).toLocaleDateString('en-IN')}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function HealthRecordsScreen() {
  const { primaryColor } = useSchoolTheme();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['health-records', debounced],
    queryFn: () =>
      (apiClient.get('/health/records', {
        params: { search: debounced || undefined, pageSize: 50 },
      }) as Promise<{ items: HealthRecord[] }>).then((r) => r?.items ?? []),
    staleTime: 5 * 60 * 1000,
  });

  const handleSearch = (text: string) => {
    setSearch(text);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => setDebounced(text.trim()), 400);
  };

  const records = data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Health Records" />

      {/* Search bar */}
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
          <TouchableOpacity onPress={() => { setSearch(''); setDebounced(''); }}>
            <Feather name="x" size={14} color={VITANA_COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HealthCard record={item} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator color={primaryColor} />
            </View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
              <Feather name="heart" size={36} color={VITANA_COLORS.border} />
              <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 15 }}>No health records found</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, marginBottom: 4,
    borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: VITANA_COLORS.text, padding: 0 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 8,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardName: { fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text },
  cardClass: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bloodBadge: {
    backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  bloodText: { fontSize: 12, fontWeight: '700', color: '#991b1b' },
  summaryRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metric: { alignItems: 'center', minWidth: 60 },
  metricValue: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text },
  metricLabel: { fontSize: 10, color: VITANA_COLORS.textSecondary, marginTop: 1 },
  divider: { height: 1, backgroundColor: '#f1f5f9' },
  details: { gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' },
  detailLabel: { fontSize: 12, fontWeight: '600', color: VITANA_COLORS.text },
  detailValue: { fontSize: 12, color: VITANA_COLORS.textSecondary, flex: 1 },
  lastUpdated: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
});
