import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PayslipBasic {
  id: string;
  month: string;
  year: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  status: string;
  paymentDate?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:           { label: 'Pending',    color: '#d97706', bg: '#fef9c3' },
  pending_approval:  { label: 'Review',     color: '#7c3aed', bg: '#ede9fe' },
  approved:          { label: 'Approved',   color: '#0891b2', bg: '#e0f2fe' },
  paid:              { label: 'Paid',       color: '#15803d', bg: '#dcfce7' },
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function monthLabel(monthStr: string, year: number): string {
  const num = parseInt(monthStr, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) return `${MONTH_NAMES[num - 1]} ${year}`;
  return `${monthStr} ${year}`;
}

function fmt(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Payslip card ─────────────────────────────────────────────────────────────

function PayslipCard({ item, primaryColor }: { item: PayslipBasic; primaryColor: string }) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(teacher)/salary/[id]', params: { id: item.id } })}
      activeOpacity={0.75}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.monthIcon, { backgroundColor: `${primaryColor}15` }]}>
          <Feather name="file-text" size={18} color={primaryColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.monthText}>{monthLabel(item.month, item.year)}</Text>
          {item.paymentDate && (
            <Text style={styles.paidOn}>
              Paid: {new Date(item.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.salaryRow}>
        <View style={styles.salaryItem}>
          <Text style={styles.salaryLabel}>Gross</Text>
          <Text style={styles.salaryValue}>{fmt(item.grossSalary)}</Text>
        </View>
        <View style={[styles.salaryDivider]} />
        <View style={styles.salaryItem}>
          <Text style={styles.salaryLabel}>Deductions</Text>
          <Text style={[styles.salaryValue, { color: '#dc2626' }]}>–{fmt(item.totalDeductions)}</Text>
        </View>
        <View style={styles.salaryDivider} />
        <View style={styles.salaryItem}>
          <Text style={styles.salaryLabel}>Net Pay</Text>
          <Text style={[styles.salaryValue, { color: '#15803d' }]}>{fmt(item.netSalary)}</Text>
        </View>
      </View>

      <View style={styles.viewRow}>
        <Text style={[styles.viewText, { color: primaryColor }]}>View payslip</Text>
        <Feather name="chevron-right" size={14} color={primaryColor} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MySalaryScreen() {
  const { primaryColor } = useSchoolTheme();
  const currentYear = new Date().getFullYear();

  const { data, isLoading, refetch, isFetching } = useQuery<{ items: PayslipBasic[]; totalCount: number }>({
    queryKey: ['my-salary'],
    queryFn: () =>
      (apiClient.get('/payroll/my-salary', { params: { pageSize: 36 } }) as Promise<any>)
        .then((r) => {
          if (r?.items) return r;
          if (Array.isArray(r)) return { items: r, totalCount: r.length };
          return { items: [], totalCount: 0 };
        }),
    staleTime: 5 * 60 * 1000,
  });

  const slips = data?.items ?? [];

  // Yearly totals for latest year
  const latestYearSlips = slips.filter((s) => s.year === currentYear && s.status === 'paid');
  const ytdGross    = latestYearSlips.reduce((sum, s) => sum + s.grossSalary, 0);
  const ytdNet      = latestYearSlips.reduce((sum, s) => sum + s.netSalary, 0);
  const ytdDeduct   = latestYearSlips.reduce((sum, s) => sum + s.totalDeductions, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="My Salary" />

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={primaryColor} size="large" /></View>
      ) : slips.length === 0 ? (
        <EmptyState
          icon="dollar-sign"
          title="No salary records"
          subtitle="Your payslips will appear here once payroll is processed."
        />
      ) : (
        <FlatList
          data={slips}
          keyExtractor={(s) => s.id}
          refreshing={isFetching}
          onRefresh={refetch}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
          ListHeaderComponent={
            ytdNet > 0 ? (
              <View style={[styles.ytdCard, { borderColor: `${primaryColor}30` }]}>
                <Text style={[styles.ytdTitle, { color: primaryColor }]}>{currentYear} Year-to-Date</Text>
                <View style={styles.ytdRow}>
                  <YtdItem label="Total Earned" value={fmt(ytdGross)} color="#15803d" />
                  <YtdItem label="Total Deductions" value={fmt(ytdDeduct)} color="#dc2626" />
                  <YtdItem label="Net Received" value={fmt(ytdNet)} color={primaryColor} bold />
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => <PayslipCard item={item} primaryColor={primaryColor} />}
        />
      )}
    </SafeAreaView>
  );
}

function YtdItem({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <View style={styles.ytdItem}>
      <Text style={styles.ytdLabel}>{label}</Text>
      <Text style={[styles.ytdValue, { color }, bold && { fontSize: 16 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: VITANA_COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 60 },

  ytdCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, marginBottom: 4,
  },
  ytdTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  ytdRow: { flexDirection: 'row', gap: 8 },
  ytdItem: { flex: 1, alignItems: 'center' },
  ytdLabel: { fontSize: 10, color: VITANA_COLORS.textSecondary, textAlign: 'center' },
  ytdValue: { fontSize: 14, fontWeight: '700', marginTop: 2, textAlign: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: VITANA_COLORS.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  monthIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  monthText: { fontSize: 15, fontWeight: '700', color: VITANA_COLORS.text },
  paidOn: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  salaryRow: { flexDirection: 'row', gap: 0, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 10 },
  salaryItem: { flex: 1, alignItems: 'center' },
  salaryLabel: { fontSize: 10, color: VITANA_COLORS.textSecondary },
  salaryValue: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text, marginTop: 2 },
  salaryDivider: { width: 1, backgroundColor: VITANA_COLORS.border },
  viewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  viewText: { fontSize: 13, fontWeight: '600' },
});
