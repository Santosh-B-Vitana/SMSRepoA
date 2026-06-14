import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput,
  ActivityIndicator, RefreshControl, Image, StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

interface StaffMember {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
  email: string;
  status: string;
  profilePhoto: string | null;
  subjects?: string[];
  role?: string;
}

const ROLE_COLORS: Record<string, string> = {
  Teacher: '#1a6fd8',
  Principal: '#7c3aed',
  Admin: '#059669',
  Staff: '#6b7280',
  HRManager: '#db2777',
  Librarian: '#0891b2',
  Receptionist: '#f59e0b',
};

function StaffRow({ item }: { item: StaffMember }) {
  const roleColor = ROLE_COLORS[item.designation] ?? VITANA_COLORS.textSecondary;
  const initials = `${item.firstName?.[0] ?? ''}${item.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push({ pathname: '/(admin)/staff/[id]', params: { id: item.id, name: `${item.firstName} ${item.lastName}` } })}
      activeOpacity={0.7}
    >
      {item.profilePhoto ? (
        <Image source={{ uri: item.profilePhoto }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: `${roleColor}20` }]}>
          <Text style={[styles.initials, { color: roleColor }]}>{initials}</Text>
        </View>
      )}
      <View style={styles.rowInfo}>
        <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
        <Text style={styles.meta}>{item.designation} · {item.department}</Text>
        <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
      </View>
      <View style={styles.rowRight}>
        <View style={[styles.badge, { backgroundColor: `${roleColor}15` }]}>
          <Text style={[styles.badgeText, { color: roleColor }]}>{item.designation}</Text>
        </View>
        <Feather name="chevron-right" size={16} color={VITANA_COLORS.border} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );
}

export default function StaffDirectoryScreen() {
  const { primaryColor } = useSchoolTheme();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string | null>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['admin-staff', debouncedSearch, filterRole],
      queryFn: ({ pageParam = 1 }) =>
        apiClient.get('/staff', {
          // Backend expects `designation` not `role` for filtering by teacher/librarian/etc.
          params: { page: pageParam, pageSize: 20, search: debouncedSearch || undefined, designation: filterRole || undefined },
        }) as Promise<{ staff: StaffMember[]; total: number; page: number; pageSize: number }>,
      initialPageParam: 1,
      getNextPageParam: (lastPage, pages) =>
        lastPage.staff?.length === 20 ? pages.length + 1 : undefined,
      staleTime: 2 * 60 * 1000,
    });

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    clearTimeout((handleSearch as any)._timer);
    (handleSearch as any)._timer = setTimeout(() => setDebouncedSearch(text), 400);
  }, []);

  const allStaff = data?.pages.flatMap((p) => p.staff ?? []) ?? [];
  const roles = ['Teacher', 'Principal', 'Admin', 'HRManager', 'Librarian', 'Receptionist', 'Staff'];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Staff Directory" />

      {/* Search */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color={VITANA_COLORS.textSecondary} style={{ marginLeft: 12 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, department..."
          placeholderTextColor={VITANA_COLORS.textSecondary}
          value={search}
          onChangeText={handleSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }} style={{ padding: 8 }}>
            <Feather name="x" size={14} color={VITANA_COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Role filters */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filterRole === null && { backgroundColor: primaryColor }]}
          onPress={() => setFilterRole(null)}
        >
          <Text style={[styles.filterText, filterRole === null && { color: '#fff' }]}>All</Text>
        </TouchableOpacity>
        {roles.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.filterChip, filterRole === r && { backgroundColor: primaryColor }]}
            onPress={() => setFilterRole(filterRole === r ? null : r)}
          >
            <Text style={[styles.filterText, filterRole === r && { color: '#fff' }]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={allStaff}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StaffRow item={item} />}
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
                {debouncedSearch ? 'No staff found' : 'No staff members'}
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
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, paddingBottom: 8, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  filterText: { fontSize: 12, fontWeight: '500', color: VITANA_COLORS.textSecondary },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  separator: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 76 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 16, fontWeight: '700' },
  rowInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text },
  meta: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  email: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
