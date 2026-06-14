import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { adminApi, type ClassItem } from '@/api/endpoints/admin';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

function ClassCard({ item }: { item: ClassItem }) {
  const { primaryColor } = useSchoolTheme();
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => router.push({ pathname: '/(admin)/classes/[classId]', params: { classId: item.id, className: item.name, section: item.section ?? '', classTeacher: item.classTeacher ?? '' } })}
    >
      <View style={[styles.cardIconBg, { backgroundColor: `${primaryColor}15` }]}>
        <Feather name="book-open" size={20} color={primaryColor} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardMeta}>
          {item.academicYear}
          {item.classTeacher ? ` · ${item.classTeacher}` : ''}
        </Text>
      </View>
      <View style={styles.cardRight}>
        {item.totalStudents != null && (
          <View style={styles.studentBadge}>
            <Feather name="users" size={11} color={primaryColor} />
            <Text style={[styles.studentCount, { color: primaryColor }]}>{item.totalStudents}</Text>
          </View>
        )}
        <Feather name="chevron-right" size={16} color={VITANA_COLORS.border} />
      </View>
    </TouchableOpacity>
  );
}

export default function ClassManagementScreen() {
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-classes-list'],
    queryFn: adminApi.getClasses,
    staleTime: 5 * 60 * 1000,
  });

  const classes = data?.classes ?? [];
  const total = data?.totalCount ?? classes.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader
        title="Class Management"
        rightSlot={
          <TouchableOpacity
            onPress={() => router.push('/(admin)/classes/create')}
            style={styles.addBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="plus" size={18} color={primaryColor} />
          </TouchableOpacity>
        }
      />

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={[styles.summaryCount, { color: primaryColor }]}>{total}</Text>
        <Text style={styles.summaryLabel}>Active Classes</Text>
      </View>

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ClassCard item={item} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={primaryColor} /></View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
              <Feather name="book-open" size={36} color={VITANA_COLORS.border} />
              <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 15, fontWeight: '600' }}>No classes configured</Text>
              <TouchableOpacity
                style={[styles.createFirstBtn, { backgroundColor: primaryColor }]}
                onPress={() => router.push('/(admin)/classes/create')}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Create First Class</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  addBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: VITANA_COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: VITANA_COLORS.border,
  },
  summary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  summaryCount: { fontSize: 22, fontWeight: '800', fontFamily: 'Poppins' },
  summaryLabel: { fontSize: 13, color: VITANA_COLORS.textSecondary },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  cardIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: VITANA_COLORS.text },
  cardMeta: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  studentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#f0f9ff' },
  studentCount: { fontSize: 13, fontWeight: '700' },
  createFirstBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
});
