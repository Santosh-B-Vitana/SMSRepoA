import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, SectionList, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'national' | 'regional' | 'school' | 'optional';
  description?: string;
  isRecurring?: boolean;
}

const TYPE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  national:  { color: '#dc2626', bg: '#fef2f2', label: 'National' },
  regional:  { color: '#d97706', bg: '#fffbeb', label: 'Regional' },
  school:    { color: '#2563eb', bg: '#eff6ff', label: 'School' },
  optional:  { color: '#7c3aed', bg: '#f5f3ff', label: 'Optional' },
};

function HolidayCard({ item }: { item: Holiday }) {
  const conf = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.school;
  const date = new Date(item.date);
  const monthStr = date.toLocaleDateString('en-IN', { month: 'short' });
  const dayStr = date.toLocaleDateString('en-IN', { day: 'numeric' });
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'long' });

  return (
    <View style={styles.card}>
      <View style={[styles.dateBox, { backgroundColor: conf.bg }]}>
        <Text style={[styles.dateDay, { color: conf.color }]}>{dayStr}</Text>
        <Text style={[styles.dateMonth, { color: conf.color }]}>{monthStr}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardWeekday}>{weekday}</Text>
        {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
      </View>
      <View style={[styles.typeBadge, { backgroundColor: conf.bg }]}>
        <Text style={[styles.typeText, { color: conf.color }]}>{conf.label}</Text>
      </View>
    </View>
  );
}

export default function AcademicCalendarScreen() {
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery<{ items?: Holiday[]; data?: Holiday[] } | Holiday[]>({
    queryKey: ['admin-holidays'],
    queryFn: () => apiClient.get('/holidays') as Promise<any>,
    staleTime: 10 * 60 * 1000,
  });

  const holidays: Holiday[] = Array.isArray(data)
    ? data
    : ((data as any)?.items ?? (data as any)?.data ?? []);

  const upcoming = holidays
    .filter(h => new Date(h.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const past = holidays
    .filter(h => new Date(h.date) < new Date())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const sections = [
    ...(upcoming.length > 0 ? [{ title: 'Upcoming Holidays', data: upcoming }] : []),
    ...(past.length > 0 ? [{ title: 'Past Holidays', data: past }] : []),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Academic Calendar" />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : sections.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
          <Feather name="calendar" size={40} color={VITANA_COLORS.border} />
          <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 15, fontWeight: '600' }}>No holidays configured</Text>
          <Text style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
            Add holidays and events from the CRM portal to see them here.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => <HolidayCard item={item} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 12 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  sectionHeader: {
    backgroundColor: '#f5f7fa', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  dateBox: { width: 50, height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 20, fontWeight: '800', fontFamily: 'Poppins' },
  dateMonth: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  cardWeekday: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  cardDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  typeText: { fontSize: 11, fontWeight: '700' },
});
