import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { useAuthStore } from '@/stores/authStore';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AllowanceBreakdown {
  hRA: number; dA: number; tA: number; mA: number;
  specialAllowance: number; overtimePay: number; bonus: number; other: number;
}

interface DeductionBreakdown {
  pF: number; eSI: number; professionalTax: number; incomeTax: number;
  tDS: number; loanRecovery: number; advance: number; leaveDeduction: number; other: number;
}

interface PayslipFull {
  id: string;
  staffName: string;
  employeeId: string;
  designation: string;
  department: string;
  month: string;
  year: number;
  basicSalary: number;
  allowances: AllowanceBreakdown;
  deductions: DeductionBreakdown;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  paymentDate?: string | null;
  paymentMethod?: string | null;
  status: string;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(v: number): string {
  if (!v || v === 0) return '—';
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function monthLabel(m: string, y: number): string {
  const n = parseInt(m, 10);
  return isNaN(n) ? `${m} ${y}` : `${MONTH_NAMES[n - 1]} ${y}`;
}

// ─── Row components ───────────────────────────────────────────────────────────

function PayslipRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.row, highlight && styles.rowHighlight]}>
      <Text style={[styles.rowLabel, highlight && { fontWeight: '700', color: VITANA_COLORS.text }]}>{label}</Text>
      <Text style={[styles.rowValue, highlight && { fontWeight: '700', color: VITANA_COLORS.text }]}>{value}</Text>
    </View>
  );
}

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PayslipDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { primaryColor } = useSchoolTheme();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, error } = useQuery<PayslipFull>({
    queryKey: ['my-payslip', id],
    queryFn: () => apiClient.get(`/payroll/my-salary/${id!}`),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });

  async function handleShare() {
    if (!data) return;
    const month = monthLabel(data.month, data.year);
    const lines = [
      `SALARY SLIP — ${month}`,
      `Name: ${data.staffName}`,
      `ID: ${data.employeeId}`,
      `Designation: ${data.designation}`,
      ``,
      `Basic Salary:     ${fmt(data.basicSalary)}`,
      `Total Allowances: ${fmt(data.grossSalary - data.basicSalary)}`,
      `Gross Salary:     ${fmt(data.grossSalary)}`,
      `Total Deductions: ${fmt(data.totalDeductions)}`,
      `NET SALARY:       ${fmt(data.netSalary)}`,
      ``,
      `Status: ${data.status.toUpperCase()}`,
      data.paymentDate
        ? `Paid: ${new Date(data.paymentDate).toLocaleDateString('en-IN')}`
        : '',
    ].filter(Boolean).join('\n');

    try {
      await Share.share({ message: lines, title: `Salary Slip ${month}` });
    } catch {
      Alert.alert('Share failed', 'Unable to share payslip.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader
        title="Salary Slip"
        rightSlot={
          data ? (
            <TouchableOpacity onPress={handleShare} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="share-2" size={20} color={VITANA_COLORS.text} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={primaryColor} size="large" /></View>
      ) : error || !data ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={36} color={VITANA_COLORS.border} />
          <Text style={styles.errorText}>Unable to load payslip.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header card */}
          <View style={[styles.headerCard, { backgroundColor: primaryColor }]}>
            <Text style={styles.headerMonth}>{monthLabel(data.month, data.year)}</Text>
            <Text style={styles.headerName}>{data.staffName}</Text>
            <Text style={styles.headerDesig}>{data.designation}</Text>
            {data.employeeId && <Text style={styles.headerEmpId}>ID: {data.employeeId}</Text>}
            <View style={styles.netPayBox}>
              <Text style={styles.netPayLabel}>Net Pay</Text>
              <Text style={styles.netPayValue}>{fmt(data.netSalary)}</Text>
            </View>
            {data.paymentDate && (
              <Text style={styles.paidDate}>
                Paid on {new Date(data.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                {data.paymentMethod ? ` · ${data.paymentMethod}` : ''}
              </Text>
            )}
          </View>

          <View style={styles.content}>
            {/* Earnings */}
            <View style={styles.section}>
              <SectionHeader title="Earnings" color="#15803d" />
              <PayslipRow label="Basic Salary" value={fmt(data.basicSalary)} />
              {data.allowances.hRA > 0 && <PayslipRow label="HRA" value={fmt(data.allowances.hRA)} />}
              {data.allowances.dA > 0 && <PayslipRow label="Dearness Allowance" value={fmt(data.allowances.dA)} />}
              {data.allowances.tA > 0 && <PayslipRow label="Travel Allowance" value={fmt(data.allowances.tA)} />}
              {data.allowances.mA > 0 && <PayslipRow label="Medical Allowance" value={fmt(data.allowances.mA)} />}
              {data.allowances.specialAllowance > 0 && <PayslipRow label="Special Allowance" value={fmt(data.allowances.specialAllowance)} />}
              {data.allowances.overtimePay > 0 && <PayslipRow label="Overtime Pay" value={fmt(data.allowances.overtimePay)} />}
              {data.allowances.bonus > 0 && <PayslipRow label="Bonus" value={fmt(data.allowances.bonus)} />}
              {data.allowances.other > 0 && <PayslipRow label="Other Allowances" value={fmt(data.allowances.other)} />}
              <PayslipRow label="Gross Salary" value={fmt(data.grossSalary)} highlight />
            </View>

            {/* Deductions */}
            <View style={styles.section}>
              <SectionHeader title="Deductions" color="#dc2626" />
              {data.deductions.pF > 0 && <PayslipRow label="Provident Fund (PF)" value={`– ${fmt(data.deductions.pF)}`} />}
              {data.deductions.eSI > 0 && <PayslipRow label="ESI" value={`– ${fmt(data.deductions.eSI)}`} />}
              {data.deductions.professionalTax > 0 && <PayslipRow label="Professional Tax" value={`– ${fmt(data.deductions.professionalTax)}`} />}
              {data.deductions.incomeTax > 0 && <PayslipRow label="Income Tax" value={`– ${fmt(data.deductions.incomeTax)}`} />}
              {data.deductions.tDS > 0 && <PayslipRow label="TDS" value={`– ${fmt(data.deductions.tDS)}`} />}
              {data.deductions.loanRecovery > 0 && <PayslipRow label="Loan Recovery" value={`– ${fmt(data.deductions.loanRecovery)}`} />}
              {data.deductions.advance > 0 && <PayslipRow label="Advance Deduction" value={`– ${fmt(data.deductions.advance)}`} />}
              {data.deductions.leaveDeduction > 0 && <PayslipRow label="Leave Deduction" value={`– ${fmt(data.deductions.leaveDeduction)}`} />}
              {data.deductions.other > 0 && <PayslipRow label="Other Deductions" value={`– ${fmt(data.deductions.other)}`} />}
              <PayslipRow label="Total Deductions" value={`– ${fmt(data.totalDeductions)}`} highlight />
            </View>

            {/* Net Pay summary */}
            <View style={[styles.netSummaryBox, { borderColor: `${primaryColor}40` }]}>
              <View style={styles.netSummaryRow}>
                <Text style={styles.netSummaryLabel}>Gross Salary</Text>
                <Text style={styles.netSummaryValue}>{fmt(data.grossSalary)}</Text>
              </View>
              <View style={styles.netSummaryRow}>
                <Text style={styles.netSummaryLabel}>Total Deductions</Text>
                <Text style={[styles.netSummaryValue, { color: '#dc2626' }]}>– {fmt(data.totalDeductions)}</Text>
              </View>
              <View style={[styles.netSummaryRow, { borderTopWidth: 1, borderTopColor: `${primaryColor}30`, paddingTop: 10, marginTop: 4 }]}>
                <Text style={[styles.netSummaryLabel, { fontWeight: '800', fontSize: 15, color: VITANA_COLORS.text }]}>Net Salary</Text>
                <Text style={[styles.netSummaryValue, { fontWeight: '800', fontSize: 17, color: '#15803d' }]}>{fmt(data.netSalary)}</Text>
              </View>
            </View>

            <Text style={styles.disclaimer}>
              This is a digital salary slip generated from school records.{'\n'}
              Contact HR for any discrepancies.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: VITANA_COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  errorText: { fontSize: 14, color: VITANA_COLORS.textSecondary },

  headerCard: {
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24,
    alignItems: 'center', gap: 4,
  },
  headerMonth: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  headerName: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginTop: 2 },
  headerDesig: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  headerEmpId: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  netPayBox: { marginTop: 16, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center' },
  netPayLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  netPayValue: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 4 },
  paidDate: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 8 },

  content: { padding: 16, gap: 16, paddingBottom: 40 },
  section: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: VITANA_COLORS.border },
  sectionHeader: { paddingHorizontal: 14, paddingVertical: 10, borderLeftWidth: 3, backgroundColor: '#f8fafc' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: VITANA_COLORS.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  rowHighlight: { backgroundColor: '#f8fafc' },
  rowLabel: { fontSize: 13, color: VITANA_COLORS.textSecondary },
  rowValue: { fontSize: 13, color: VITANA_COLORS.text, fontWeight: '500' },

  netSummaryBox: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, gap: 8 },
  netSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netSummaryLabel: { fontSize: 13, color: VITANA_COLORS.textSecondary },
  netSummaryValue: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },

  disclaimer: { fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 16, marginTop: 4 },
});
