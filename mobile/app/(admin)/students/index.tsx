import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput,
  ActivityIndicator, RefreshControl, Image, StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { adminApi } from '@/api/endpoints/admin';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

interface Student {
  id: string; admissionNumber: string; name: string;
  class: string; section: string; rollNumber: string;
  status: string; photoUrl: string | null;
  gender?: string; attendancePercentage?: number;
}

function StudentRow({ item }: { item: Student }) {
  const initials = item.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';
  const attColor = (item.attendancePercentage ?? 100) >= 75 ? '#059669' : VITANA_COLORS.warning;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push({ pathname: '/(admin)/students/[id]', params: { id: item.id, name: item.name } })}
      activeOpacity={0.7}
    >
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
      )}
      <View style={styles.rowInfo}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>{item.class} {item.section} · Roll: {item.rollNumber}</Text>
        <Text style={styles.admNo}>Adm# {item.admissionNumber}</Text>
      </View>
      <View style={styles.rowRight}>
        {item.attendancePercentage !== undefined && (
          <Text style={[styles.attPct, { color: attColor }]}>{item.attendancePercentage.toFixed(0)}%</Text>
        )}
        <View style={[styles.statusDot, { backgroundColor: item.status === 'active' ? '#059669' : '#ef4444' }]} />
        <Feather name="chevron-right" size={16} color={VITANA_COLORS.border} />
      </View>
    </TouchableOpacity>
  );
}

export default function StudentDirectoryScreen() {
  const { primaryColor } = useSchoolTheme();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string | null>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['admin-students', debouncedSearch, classFilter],
      queryFn: ({ pageParam = 1 }) =>
        apiClient.get('/students', {
          params: { page: pageParam, pageSize: 20, search: debouncedSearch || undefined, class: classFilter || undefined },
        }) as Promise<{ students: Student[]; totalCount: number }>,
      initialPageParam: 1,
      getNextPageParam: (lastPage, pages) =>
        lastPage.students?.length === 20 ? pages.length + 1 : undefined,
      staleTime: 2 * 60 * 1000,
    });

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    clearTimeout((handleSearch as any)._timer);
    (handleSearch as any)._timer = setTimeout(() => setDebouncedSearch(text), 400);
  }, []);

  const allStudents = data?.pages.flatMap((p) => p.students ?? []) ?? [];

  // Fetch class list dynamically from API — deduplicate by name since API returns one entry per section
  const { data: classesData } = useQuery({
    queryKey: ['admin-classes-list'],
    queryFn: adminApi.getClasses,
    staleTime: 10 * 60 * 1000,
  });
  // Deduplicate: API returns one record per class-section combination; we only want unique names for the filter
  const classes: string[] = Array.from(new Set(classesData?.classes?.map((c) => c.name) ?? []));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Student Directory" />

      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color={VITANA_COLORS.textSecondary} style={{ marginLeft: 12 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, admission number..."
          placeholderTextColor={VITANA_COLORS.textSecondary}
          value={search}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }} style={{ padding: 8 }}>
            <Feather name="x" size={14} color={VITANA_COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Class filter chips — horizontal scroll row */}
      <View style={styles.chipsRow}>
        <FlatList
          horizontal
          data={[null, ...classes]}
          keyExtractor={(item, index) => `chip-${index}-${item ?? 'all'}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, classFilter === item && { backgroundColor: primaryColor, borderColor: primaryColor }]}
              onPress={() => setClassFilter(classFilter === item ? null : item)}
            >
              <Text style={[styles.filterText, classFilter === item && { color: '#fff', fontWeight: '700' }]}>
                {item === null ? 'All' : item.replace('Class ', 'Cls ')}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
          bounces={false}
        />
      </View>

      <FlatList
        data={allStudents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StudentRow item={item} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator color={primaryColor} />
            </View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center', gap: 8 }}>
              <Feather name="users" size={32} color={VITANA_COLORS.border} />
              <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 14 }}>
                {debouncedSearch ? 'No students found' : 'No students enrolled'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} color={primaryColor} /> : null}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    margin: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
  },
  searchInput: { flex: 1, paddingVertical: 11, paddingHorizontal: 10, fontSize: 14, color: VITANA_COLORS.text },
  chipsRow: {
    height: 50,
    flexShrink: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: { fontSize: 12, fontWeight: '500', color: VITANA_COLORS.textSecondary },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  separator: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 76 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 16, fontWeight: '700', color: '#4f46e5' },
  rowInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text },
  meta: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  admNo: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  attPct: { fontSize: 13, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
