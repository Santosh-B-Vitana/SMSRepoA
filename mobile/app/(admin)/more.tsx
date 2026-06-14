import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import {
  adminApi,
  type StudentSearchResult,
  type StaffSearchResult,
} from '@/api/endpoints/admin';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS, VITANA_SHADOWS } from '@/theme/tokens';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';

type SearchTab = 'students' | 'staff';
const DEBOUNCE_MS = 300;

export default function AdminMore() {
  const { colors } = useAppTheme();
  const { clearAuth, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SearchTab>('students');
  const [rawQuery, setRawQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((value: string) => {
    setRawQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim());
    }, DEBOUNCE_MS);
  }, []);

  const studentsQuery = useQuery({
    queryKey: ['search-students', debouncedQuery],
    queryFn: () => adminApi.searchStudents(debouncedQuery),
    enabled: activeTab === 'students' && debouncedQuery.length >= 2,
    staleTime: 60 * 1000,
  });

  const staffQuery = useQuery({
    queryKey: ['search-staff', debouncedQuery],
    queryFn: () => adminApi.searchStaff(debouncedQuery),
    enabled: activeTab === 'staff' && debouncedQuery.length >= 2,
    staleTime: 60 * 1000,
  });

  const activeQuery = activeTab === 'students' ? studentsQuery : staffQuery;
  const results =
    activeTab === 'students'
      ? (studentsQuery.data?.items ?? [])
      : (staffQuery.data?.items ?? []);

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          clearAuth();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* Sticky search header */}
        <View style={styles.searchSection}>
          <View style={styles.headerRow}>
            <View style={styles.userRow}>
              <Avatar name={user?.fullName} size="sm" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.adminName}>{user?.fullName ?? 'Administrator'}</Text>
                <Text style={styles.adminRole}>{user?.role ?? 'Admin'}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Directory Search</Text>

          {/* Tab toggle */}
          <View style={styles.tabRow}>
            {(['students', 'staff'] as SearchTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => {
                  setActiveTab(tab);
                  setRawQuery('');
                  setDebouncedQuery('');
                }}
                style={[
                  styles.tabBtn,
                  activeTab === tab && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab ? styles.tabTextActive : null,
                  ]}
                >
                  {tab === 'students' ? 'Students' : 'Staff'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search input */}
          <View style={styles.searchBar}>
            <Feather name="search" size={16} color={VITANA_COLORS.textSecondary} />
            <TextInput
              value={rawQuery}
              onChangeText={handleQueryChange}
              placeholder={`Search ${activeTab}...`}
              placeholderTextColor={VITANA_COLORS.textSecondary}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {rawQuery.length > 0 ? (
              <TouchableOpacity onPress={() => handleQueryChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={14} color={VITANA_COLORS.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Results */}
        <View style={styles.body}>
          {debouncedQuery.length >= 2 ? (
            activeQuery.isLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : results.length === 0 ? (
              <View style={styles.centered}>
                <Feather name="search" size={32} color={VITANA_COLORS.textSecondary} />
                <Text style={styles.emptyText}>No results for "{debouncedQuery}"</Text>
              </View>
            ) : (
              <Card shadow="sm" padding={0} style={styles.resultsCard}>
                <Text style={styles.resultsCount}>
                  {activeQuery.data?.totalCount ?? results.length} results
                </Text>
                {activeTab === 'students'
                  ? (results as StudentSearchResult[]).map((item, i) => (
                      <View key={item.id}>
                        {i > 0 ? <View style={styles.rowDivider} /> : null}
                        <View style={styles.resultRow}>
                          <Avatar name={item.fullName} size="sm" />
                          <View style={styles.resultInfo}>
                            <Text style={styles.resultName}>{item.fullName}</Text>
                            <Text style={styles.resultSub}>
                              {item.className} · {item.sectionName} · Roll {item.rollNumber}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))
                  : (results as StaffSearchResult[]).map((item, i) => (
                      <View key={item.id}>
                        {i > 0 ? <View style={styles.rowDivider} /> : null}
                        <View style={styles.resultRow}>
                          <Avatar name={item.fullName} size="sm" />
                          <View style={styles.resultInfo}>
                            <Text style={styles.resultName}>{item.fullName}</Text>
                            <Text style={styles.resultSub}>
                              {item.designation} · {item.email}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
              </Card>
            )
          ) : debouncedQuery.length > 0 ? (
            <Text style={styles.hintText}>Type at least 2 characters to search</Text>
          ) : null}

          {/* Settings */}
          <Text style={styles.sectionTitle}>Settings</Text>
          <Card shadow="sm" padding={0} style={styles.settingsCard}>
            <ListRow
              title="Notification Settings"
              icon="bell"
              iconColor={colors.primary}
              onPress={() => router.push('/(admin)/notifications/settings')}
              showChevron
            />
            <View style={styles.rowDivider} />
            <ListRow
              title="Notification Center"
              icon="inbox"
              iconColor={colors.primary}
              onPress={() => router.push('/(admin)/notifications')}
              showChevron
            />
            <View style={styles.rowDivider} />
            <ListRow
              title="Sign Out"
              icon="log-out"
              iconColor={VITANA_COLORS.error}
              iconBg={VITANA_COLORS.errorLight}
              onPress={handleLogout}
              showChevron={false}
              destructive
            />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: VITANA_COLORS.surface,
  },
  scroll: {
    flex: 1,
  },
  searchSection: {
    backgroundColor: VITANA_COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
    ...VITANA_SHADOWS.sm,
  },
  headerRow: {
    marginBottom: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminName: {
    fontSize: 16,
    fontWeight: '700',
    color: VITANA_COLORS.text,
    fontFamily: 'Poppins',
  },
  adminRole: {
    fontSize: 12,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: VITANA_COLORS.text,
    fontFamily: 'Poppins',
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: VITANA_COLORS.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: VITANA_COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VITANA_COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: VITANA_COLORS.text,
    fontFamily: 'Inter',
    padding: 0,
  },
  body: {
    padding: 16,
    gap: 12,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
  },
  resultsCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  resultsCount: {
    fontSize: 11,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: VITANA_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '500',
    color: VITANA_COLORS.text,
    fontFamily: 'Inter',
  },
  resultSub: {
    fontSize: 12,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    marginTop: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: VITANA_COLORS.border,
    marginLeft: 66,
  },
  settingsCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  hintText: {
    textAlign: 'center',
    fontSize: 13,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    paddingVertical: 12,
  },
});
