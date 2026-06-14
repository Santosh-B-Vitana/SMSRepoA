import { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ActivityIndicator,
  Alert, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { adminApi } from '@/api/endpoints/admin';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

/**
 * Allows admin to bulk-promote all students from one class to the next.
 * Uses POST /students/bulk-promote.
 */
export default function StudentPromoteScreen() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();
  const [selectedFromClass, setSelectedFromClass] = useState<string | null>(null);
  const [selectedToClass, setSelectedToClass] = useState<string | null>(null);

  const { data: classesData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-classes-list'],
    queryFn: adminApi.getClasses,
    staleTime: 5 * 60 * 1000,
  });

  // Deduplicate by name — API returns one entry per class-section combination
  const seen = new Set<string>();
  const classes = (classesData?.classes ?? []).filter((c) => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });

  const promoteMutation = useMutation({
    mutationFn: ({ fromClassId, toClassId }: { fromClassId: string; toClassId: string }) =>
      apiClient.post('/students/bulk-promote', {
        fromClassId,
        toClassId,
        academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      }),
    onSuccess: (res: any) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      const count = res?.promotedCount ?? res?.count ?? 'Students';
      Alert.alert('Promotion Complete', `${count} students promoted successfully.`);
      setSelectedFromClass(null);
      setSelectedToClass(null);
    },
    onError: (err: any) => Alert.alert('Error', err?.message ?? 'Failed to promote students'),
  });

  function handlePromote() {
    if (!selectedFromClass || !selectedToClass) {
      Alert.alert('Select Classes', 'Please select both source and target classes.');
      return;
    }
    if (selectedFromClass === selectedToClass) {
      Alert.alert('Invalid Selection', 'Source and target classes must be different.');
      return;
    }
    const from = classes.find(c => c.id === selectedFromClass)?.name;
    const to = classes.find(c => c.id === selectedToClass)?.name;
    Alert.alert(
      'Confirm Promotion',
      `Promote all active students from ${from} to ${to}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Promote', style: 'destructive', onPress: () => promoteMutation.mutate({ fromClassId: selectedFromClass, toClassId: selectedToClass }) },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Student Promotion" />

      <View style={styles.infoCard}>
        <Feather name="info" size={14} color="#2563eb" />
        <Text style={styles.infoText}>
          Bulk-promote all active students from one class to another. This is typically done at the end of the academic year.
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={primaryColor} /></View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.selectionArea}>
            {/* From Class */}
            <View style={styles.classSelector}>
              <Text style={styles.selectorLabel}>From Class</Text>
              <FlatList
                data={classes}
                keyExtractor={(c) => `from-${c.id}`}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.classChip, selectedFromClass === item.id && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                    onPress={() => setSelectedFromClass(item.id)}
                  >
                    <Text style={[styles.classChipText, selectedFromClass === item.id && { color: '#fff' }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
                contentContainerStyle={{ padding: 8 }}
              />
            </View>

            <View style={styles.arrowCol}>
              <Feather name="arrow-right" size={24} color={primaryColor} />
            </View>

            {/* To Class */}
            <View style={styles.classSelector}>
              <Text style={styles.selectorLabel}>To Class</Text>
              <FlatList
                data={classes}
                keyExtractor={(c) => `to-${c.id}`}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.classChip, selectedToClass === item.id && { backgroundColor: '#059669', borderColor: '#059669' }]}
                    onPress={() => setSelectedToClass(item.id)}
                  >
                    <Text style={[styles.classChipText, selectedToClass === item.id && { color: '#fff' }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
                contentContainerStyle={{ padding: 8 }}
              />
            </View>
          </View>

          {/* Summary */}
          {selectedFromClass && selectedToClass && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>
                All active students in{' '}
                <Text style={{ fontWeight: '700', color: primaryColor }}>{classes.find(c => c.id === selectedFromClass)?.name}</Text>
                {' '}→{' '}
                <Text style={{ fontWeight: '700', color: '#059669' }}>{classes.find(c => c.id === selectedToClass)?.name}</Text>
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.promoteBtn, { backgroundColor: '#dc2626' }, promoteMutation.isPending && { opacity: 0.6 }]}
              onPress={handlePromote}
              disabled={promoteMutation.isPending || !selectedFromClass || !selectedToClass}
            >
              {promoteMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="chevrons-up" size={18} color="#fff" />
                  <Text style={styles.promoteBtnText}>Bulk Promote Students</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe',
    margin: 12, borderRadius: 12, padding: 12,
  },
  infoText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 19 },
  selectionArea: { flex: 1, flexDirection: 'row', paddingHorizontal: 8 },
  classSelector: { flex: 1 },
  selectorLabel: { fontSize: 12, fontWeight: '700', color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 8, paddingTop: 4, paddingBottom: 4 },
  classChip: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  classChipText: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.text },
  arrowCol: { width: 40, alignItems: 'center', justifyContent: 'center', paddingTop: 28 },
  summaryCard: {
    backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center',
  },
  summaryText: { fontSize: 14, color: VITANA_COLORS.text, textAlign: 'center' },
  footer: { padding: 16 },
  promoteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 15 },
  promoteBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
