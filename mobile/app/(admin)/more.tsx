import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  Alert, StyleSheet, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { adminApi, type StudentSearchResult, type StaffSearchResult } from '@/api/endpoints/admin';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS } from '@/theme/tokens';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';

type SearchTab = 'students' | 'staff';
const DEBOUNCE_MS = 300;

// ─── Quick navigation sections ────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: string;
  color: string;
  route: string;
  badge?: string;
}

const PEOPLE_SECTION: NavItem[] = [
  { label: 'Students', icon: 'users', color: '#2563eb', route: '/(admin)/students' },
  { label: 'Add Student', icon: 'user-plus', color: '#7c3aed', route: '/(admin)/students/add' },
  { label: 'Promote', icon: 'chevrons-up', color: '#dc2626', route: '/(admin)/students/promote' },
  { label: 'Staff Directory', icon: 'briefcase', color: '#059669', route: '/(admin)/staff' },
  { label: 'Add Staff', icon: 'user-check', color: '#0891b2', route: '/(admin)/staff/add' },
  { label: 'Admissions', icon: 'clipboard', color: '#f59e0b', route: '/(admin)/admissions' },
];

const ACADEMICS_SECTION: NavItem[] = [
  { label: 'Classes', icon: 'book-open', color: '#1a6fd8', route: '/(admin)/classes' },
  { label: 'Assign Classes', icon: 'users', color: '#7c3aed', route: '/(admin)/staff' },
  { label: 'Exams', icon: 'award', color: '#059669', route: '/(admin)/exams' },
  { label: 'Assignments', icon: 'clipboard', color: '#0891b2', route: '/(admin)/assignments' },
  { label: 'Calendar', icon: 'calendar', color: '#f59e0b', route: '/(admin)/calendar' },
  { label: 'Library', icon: 'book', color: '#7c3aed', route: '/(admin)/library' },
  { label: 'Attendance', icon: 'user-check', color: '#059669', route: '/(admin)/attendance' },
  { label: 'Fee Collection', icon: 'credit-card', color: '#f59e0b', route: '/(admin)/fees' },
  { label: 'Fee Structures', icon: 'layers', color: '#0891b2', route: '/(admin)/fees/setup' },
  { label: 'Fee Concessions', icon: 'tag', color: '#7c3aed', route: '/(admin)/fees/concessions' },
];

const SETTINGS_SECTION: NavItem[] = [
  { label: 'Notifications', icon: 'bell', color: '#6366f1', route: '/(admin)/notifications' },
  { label: 'Send Notif.', icon: 'send', color: '#dc2626', route: '/(admin)/notifications/compose' },
  { label: 'WhatsApp', icon: 'message-circle', color: '#25d366', route: '/(admin)/communication' },
  { label: 'Send to Parents', icon: 'send', color: '#25d366', route: '/(admin)/communication/broadcast', badge: 'AI' },
  { label: 'Notif. Settings', icon: 'settings', color: '#64748b', route: '/(admin)/notifications/settings' },
];

function NavGrid({ items, onPress }: { items: NavItem[]; onPress: (route: string) => void }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.label}
          style={styles.gridItem}
          onPress={() => onPress(item.route)}
          activeOpacity={0.7}
        >
          <View style={[styles.gridIcon, { backgroundColor: `${item.color}18` }]}>
            <Feather name={item.icon as any} size={22} color={item.color} />
          </View>
          <Text style={styles.gridLabel} numberOfLines={2}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

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
    debounceRef.current = setTimeout(() => setDebouncedQuery(value.trim()), DEBOUNCE_MS);
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
        text: 'Sign Out', style: 'destructive',
        onPress: () => { clearAuth(); router.replace('/(auth)/login'); },
      },
    ]);
  }

  function navigate(route: string) {
    router.push(route as never);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Avatar name={user?.fullName} size="sm" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.adminName}>{user?.fullName ?? 'Administrator'}</Text>
            <Text style={styles.adminRole}>{user?.role ?? 'Admin'}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="log-out" size={18} color={VITANA_COLORS.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* People section */}
          <Text style={styles.sectionLabel}>People</Text>
          <Card shadow="sm" padding={12}>
            <NavGrid items={PEOPLE_SECTION} onPress={navigate} />
          </Card>

          {/* Academics & Operations */}
          <Text style={styles.sectionLabel}>Academics &amp; Operations</Text>
          <Card shadow="sm" padding={12}>
            <NavGrid items={ACADEMICS_SECTION} onPress={navigate} />
          </Card>

          {/* Settings */}
          <Text style={styles.sectionLabel}>Settings</Text>
          <Card shadow="sm" padding={12}>
            <NavGrid items={SETTINGS_SECTION} onPress={navigate} />
          </Card>

          {/* Directory search */}
          <Text style={styles.sectionLabel}>Directory Search</Text>
          <Card shadow="sm" padding={0}>
            {/* Tab toggle */}
            <View style={styles.tabRow}>
              {(['students', 'staff'] as SearchTab[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => { setActiveTab(tab); setRawQuery(''); setDebouncedQuery(''); }}
                  style={[styles.tabBtn, activeTab === tab && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.tabText, activeTab === tab && { color: '#fff' }]}>
                    {tab === 'students' ? 'Students' : 'Staff'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
              {rawQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleQueryChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={14} color={VITANA_COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {debouncedQuery.length >= 2 ? (
              activeQuery.isLoading ? (
                <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
              ) : results.length === 0 ? (
                <View style={styles.centered}>
                  <Text style={styles.emptyText}>No results for "{debouncedQuery}"</Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.resultsCount}>{activeQuery.data?.totalCount ?? results.length} results</Text>
                  {activeTab === 'students'
                    ? (results as StudentSearchResult[]).map((item, i) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.resultRow, i > 0 && styles.rowBorder]}
                          onPress={() => router.push({ pathname: '/(admin)/students/[id]', params: { id: item.id } })}
                          activeOpacity={0.7}
                        >
                          <Avatar name={item.fullName} size="sm" />
                          <View style={styles.resultInfo}>
                            <Text style={styles.resultName}>{item.fullName}</Text>
                            <Text style={styles.resultSub}>{item.className} · {item.sectionName} · Roll {item.rollNumber}</Text>
                          </View>
                          <Feather name="chevron-right" size={14} color={VITANA_COLORS.border} />
                        </TouchableOpacity>
                      ))
                    : (results as StaffSearchResult[]).map((item, i) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.resultRow, i > 0 && styles.rowBorder]}
                          onPress={() => router.push({ pathname: '/(admin)/staff/[id]', params: { id: item.id, name: item.fullName } })}
                          activeOpacity={0.7}
                        >
                          <Avatar name={item.fullName} size="sm" />
                          <View style={styles.resultInfo}>
                            <Text style={styles.resultName}>{item.fullName}</Text>
                            <Text style={styles.resultSub}>{item.designation} · {item.email}</Text>
                          </View>
                          <Feather name="chevron-right" size={14} color={VITANA_COLORS.border} />
                        </TouchableOpacity>
                      ))}
                </View>
              )
            ) : debouncedQuery.length > 0 ? (
              <Text style={[styles.emptyText, { padding: 12 }]}>Type at least 2 characters to search</Text>
            ) : null}
          </Card>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: VITANA_COLORS.surface },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: VITANA_COLORS.background,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
  },
  adminName: { fontSize: 15, fontWeight: '700', color: VITANA_COLORS.text },
  adminRole: { fontSize: 12, color: VITANA_COLORS.textSecondary },
  logoutBtn: { padding: 4 },
  body: { padding: 16, gap: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: VITANA_COLORS.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 6 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '22%', flexGrow: 1, alignItems: 'center', paddingVertical: 12, gap: 6, borderRadius: 12, backgroundColor: VITANA_COLORS.surface },
  gridIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  gridLabel: { fontSize: 11, fontWeight: '500', color: VITANA_COLORS.text, textAlign: 'center' },

  tabRow: { flexDirection: 'row', backgroundColor: VITANA_COLORS.surface, margin: 12, borderRadius: 10, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.textSecondary },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: VITANA_COLORS.surface, borderRadius: 10,
    borderWidth: 1, borderColor: VITANA_COLORS.border,
    marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: VITANA_COLORS.text, padding: 0 },

  centered: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 13, color: VITANA_COLORS.textSecondary, textAlign: 'center' },
  resultsCount: {
    fontSize: 11, color: VITANA_COLORS.textSecondary,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: VITANA_COLORS.surface,
    borderTopWidth: 1, borderTopColor: VITANA_COLORS.border,
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: VITANA_COLORS.border },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text },
  resultSub: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 1 },
});
