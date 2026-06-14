import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { parentApi } from '@/api/endpoints/parent';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { VITANA_COLORS } from '@/theme/tokens';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ParentBehaviourScreen() {
  const { primaryColor } = useSchoolTheme();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data: children = [] } = useQuery({
    queryKey: ['my-children'],
    queryFn: parentApi.getMyChildren,
    staleTime: 5 * 60_000,
  });

  const activeChildId = selectedChildId ?? children[0]?.id ?? null;
  const activeChild = children.find((c) => c.id === activeChildId);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['parent-behaviour', activeChildId],
    queryFn: () => parentApi.getChildBehaviourSummary(activeChildId!),
    enabled: !!activeChildId,
    staleTime: 5 * 60_000,
  });

  const records = data?.records ?? [];
  const subtitle = activeChild
    ? `${activeChild.studentName} · ${activeChild.className ?? ''}`
    : undefined;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <SubScreenHeader title="Behaviour Reports" subtitle={subtitle} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
      >
        <View style={s.body}>
          {/* Child switcher */}
          {children.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
                {children.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.childChip, activeChildId === c.id && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                    onPress={() => setSelectedChildId(c.id)}
                  >
                    <Text style={[s.childChipText, activeChildId === c.id && { color: '#fff' }]}>
                      {c.studentName.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={primaryColor} />
          ) : !activeChildId ? (
            <View style={s.empty}>
              <Feather name="users" size={40} color={VITANA_COLORS.border} />
              <Text style={s.emptyText}>No children found.</Text>
            </View>
          ) : (
            <>
              {/* Summary */}
              <View style={s.summaryCard}>
                <View style={[s.pointsBadge, { backgroundColor: (data?.totalPoints ?? 0) >= 0 ? '#dcfce7' : '#fee2e2' }]}>
                  <Text style={[s.pointsValue, { color: (data?.totalPoints ?? 0) >= 0 ? '#16a34a' : '#dc2626' }]}>
                    {(data?.totalPoints ?? 0) > 0 ? '+' : ''}{data?.totalPoints ?? 0} pts
                  </Text>
                </View>
                <View style={s.statRow}>
                  {[
                    { label: 'Merits', value: data?.meritCount ?? 0, color: '#16a34a' },
                    { label: 'Demerits', value: data?.demeritCount ?? 0, color: '#dc2626' },
                    { label: 'Open', value: data?.openCount ?? 0, color: '#d97706' },
                  ].map(({ label, value, color }) => (
                    <View key={label} style={s.stat}>
                      <Text style={[s.statValue, { color }]}>{value}</Text>
                      <Text style={s.statLabel}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Records */}
              {records.length === 0 ? (
                <View style={s.empty}>
                  <Feather name="check-circle" size={36} color={VITANA_COLORS.border} />
                  <Text style={s.emptyText}>No behaviour records on file.</Text>
                </View>
              ) : (
                records.map((record) => {
                  const isMerit = record.incidentType === 'positive';
                  return (
                    <View key={record.id} style={s.card}>
                      <View style={s.cardHead}>
                        <View style={[s.typeTag, { backgroundColor: isMerit ? '#dcfce7' : '#fee2e2' }]}>
                          <Text style={[s.typeText, { color: isMerit ? '#16a34a' : '#dc2626' }]}>
                            {isMerit ? 'Merit' : 'Demerit'}
                          </Text>
                        </View>
                        <Text style={[s.pts, { color: isMerit ? '#16a34a' : '#dc2626' }]}>
                          {isMerit ? '+' : ''}{record.points} pts
                        </Text>
                      </View>
                      <Text style={s.category}>{record.category}</Text>
                      <Text style={s.desc}>{record.description}</Text>
                      {record.actionTaken ? (
                        <Text style={s.action}>Action: {record.actionTaken}</Text>
                      ) : null}
                      <View style={s.cardFoot}>
                        <Text style={s.date}>{formatDate(record.incidentDate)}</Text>
                        {record.parentNotified && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Feather name="bell" size={11} color="#6b7280" />
                            <Text style={{ fontSize: 11, color: '#6b7280' }}>Notified</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  childChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100,
    borderWidth: 1, borderColor: VITANA_COLORS.border, backgroundColor: '#fff',
  },
  childChipText: { fontSize: 13, fontWeight: '500', color: VITANA_COLORS.text },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    alignItems: 'center', gap: 14, borderWidth: 1, borderColor: VITANA_COLORS.border,
  },
  pointsBadge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 100 },
  pointsValue: { fontSize: 22, fontWeight: '800' },
  statRow: { flexDirection: 'row', gap: 32 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 6,
    borderWidth: 1, borderColor: VITANA_COLORS.border,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  typeText: { fontSize: 12, fontWeight: '600' },
  pts: { fontSize: 14, fontWeight: '700' },
  category: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.text },
  desc: { fontSize: 13, color: VITANA_COLORS.textSecondary, lineHeight: 18 },
  action: { fontSize: 12, color: '#6b7280', fontStyle: 'italic' },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  date: { fontSize: 12, color: VITANA_COLORS.textSecondary },
  empty: { paddingVertical: 50, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, color: VITANA_COLORS.textSecondary, textAlign: 'center' },
});
