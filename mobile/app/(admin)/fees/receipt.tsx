import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { formatINR } from '@vitana/shared-utils';

interface ReceiptData {
  id: string;
  receiptNumber: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  amount: number;
  paymentMethod: string;
  date: string;
  feeTypeName?: string;
  academicYear?: string;
  processedBy?: string;
  transactionNumber?: string;
  referenceNumber?: string;
  schoolName?: string;
  schoolAddress?: string;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function FeeReceiptScreen() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, isError } = useQuery<ReceiptData>({
    queryKey: ['fee-receipt', paymentId],
    queryFn: () => apiClient.get(`/fees/payments/${paymentId}/receipt`) as Promise<ReceiptData>,
    enabled: !!paymentId,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Fee Receipt" />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : isError || !data ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
          <Feather name="alert-circle" size={36} color={VITANA_COLORS.border} />
          <Text style={{ color: VITANA_COLORS.textSecondary, textAlign: 'center' }}>
            Receipt not found. The payment may not have a generated receipt yet.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Receipt Card */}
          <View style={styles.receiptCard}>
            {/* Header */}
            <View style={[styles.receiptHeader, { backgroundColor: primaryColor }]}>
              <Feather name="check-circle" size={28} color="#fff" />
              <Text style={styles.receiptTitle}>Payment Receipt</Text>
              <Text style={styles.receiptNumber}>#{data.receiptNumber}</Text>
            </View>

            {/* Amount Hero */}
            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>Amount Paid</Text>
              <Text style={[styles.amountValue, { color: primaryColor }]}>{formatINR(data.amount)}</Text>
              <View style={styles.methodBadge}>
                <Text style={styles.methodText}>{data.paymentMethod?.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Student Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Student Details</Text>
              <Row label="Name"             value={data.studentName} />
              <Row label="Admission No."    value={data.admissionNumber} />
              <Row label="Class"            value={data.className} />
              <Row label="Academic Year"    value={data.academicYear} />
            </View>

            <View style={styles.divider} />

            {/* Payment Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Details</Text>
              <Row label="Fee Type"          value={data.feeTypeName} />
              <Row label="Payment Date"      value={data.date ? new Date(data.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
              <Row label="Transaction ID"    value={data.transactionNumber} />
              <Row label="Reference No."     value={data.referenceNumber} />
              <Row label="Processed By"      value={data.processedBy} />
            </View>

            {/* Footer */}
            <View style={styles.receiptFooter}>
              <Feather name="shield" size={12} color={VITANA_COLORS.textSecondary} />
              <Text style={styles.footerText}>This is a computer-generated receipt.</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  receiptCard: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  receiptHeader: {
    alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16, gap: 8,
  },
  receiptTitle: { fontSize: 18, fontWeight: '700', color: '#fff', fontFamily: 'Poppins' },
  receiptNumber: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  amountSection: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  amountLabel: { fontSize: 12, color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  amountValue: { fontSize: 36, fontWeight: '800', fontFamily: 'Poppins' },
  methodBadge: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  methodText: { fontSize: 11, fontWeight: '700', color: '#166534', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 16 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6 },
  rowLabel: { fontSize: 13, color: VITANA_COLORS.textSecondary, flex: 1 },
  rowValue: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.text, flex: 1, textAlign: 'right' },
  receiptFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  footerText: { fontSize: 11, color: VITANA_COLORS.textSecondary },
});
