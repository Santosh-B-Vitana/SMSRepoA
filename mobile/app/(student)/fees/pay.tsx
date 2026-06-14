import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import * as ScreenCapture from 'expo-screen-capture';
import { Feather } from '@expo/vector-icons';
import { studentApi } from '@/api/endpoints/student';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { formatINR } from '@vitana/shared-utils';
import { VITANA_COLORS } from '@/theme/tokens';
import { queryClient } from '@/api/queryClient';

export default function StudentPayFees() {
  const { primaryColor } = useSchoolTheme();

  const { data: profile } = useQuery({
    queryKey: ['student-profile'],
    queryFn: studentApi.getProfile,
    staleTime: 10 * 60_000,
  });

  const { data: feeRecord } = useQuery({
    queryKey: ['student-fees'],
    queryFn: studentApi.getFeeRecords,
    staleTime: 5 * 60_000,
  });

  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (feeRecord?.pendingAmount) {
      setAmount(String(feeRecord.pendingAmount));
    }
  }, [feeRecord?.pendingAmount]);

  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync();
    return () => { void ScreenCapture.allowScreenCaptureAsync(); };
  }, []);

  const mutation = useMutation({
    mutationFn: async ({ studentId, amt }: { studentId: string; amt: number }) => {
      return studentApi.initiatePayment(studentId, amt);
    },
    onSuccess: async (paymentData) => {
      const cashfreeUrl = `https://payments.cashfree.com/order/#${paymentData.paymentSessionId}`;
      const redirectUrl = 'vitanasms://fees/pay/result';

      const result = await WebBrowser.openAuthSessionAsync(cashfreeUrl, redirectUrl);

      if (result.type === 'success') {
        try {
          await studentApi.verifyPayment(paymentData.cfOrderId, '');
          await queryClient.invalidateQueries({ queryKey: ['student-fees'] });
          await queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
          router.replace('/(student)/fees/success' as any);
        } catch {
          router.replace('/(student)/fees/failed' as any);
        }
      } else if (result.type === 'cancel') {
        router.back();
      }
    },
    onError: () => {
      Alert.alert('Payment Error', 'Could not initiate payment. Please try again later.');
    },
  });

  const parsedAmount = parseFloat(amount) || 0;
  const canPay = parsedAmount > 0 && !!profile?.id && !mutation.isPending;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Pay Fees</Text>
      </View>

      <View style={s.body}>
        {/* Student Info */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Student</Text>
          <Text style={s.cardValue}>{profile?.name ?? '—'}</Text>
          <Text style={s.cardSub}>{profile?.className ?? ''} · Roll {profile?.rollNumber ?? '—'}</Text>
        </View>

        {/* Outstanding summary */}
        {feeRecord && feeRecord.pendingAmount > 0 && (
          <View style={[s.card, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
            <Text style={s.cardLabel}>Outstanding Balance</Text>
            <Text style={[s.cardValue, { fontSize: 28, color: '#ea580c' }]}>
              {formatINR(feeRecord.pendingAmount)}
            </Text>
            <Text style={s.cardSub}>Total: {formatINR(feeRecord.totalAmount)} · Paid: {formatINR(feeRecord.paidAmount)}</Text>
          </View>
        )}

        {/* Amount Input */}
        <View>
          <Text style={s.inputLabel}>Amount to Pay (₹)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor={VITANA_COLORS.textSecondary}
            style={s.input}
          />
          {feeRecord && (
            <TouchableOpacity onPress={() => setAmount(String(feeRecord.pendingAmount))} style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 13, color: primaryColor }}>
                Pay full amount: {formatINR(feeRecord.pendingAmount)}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Security notice */}
        <View style={s.securityNotice}>
          <Feather name="lock" size={16} color="#2563eb" />
          <Text style={s.securityText}>
            Payment secured by Cashfree. UPI, Cards, and Netbanking accepted. You will be redirected
            to a secure checkout.
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        {/* Pay Button */}
        <TouchableOpacity
          onPress={() => mutation.mutate({ studentId: profile!.id, amt: parsedAmount })}
          disabled={!canPay}
          style={[s.payBtn, { backgroundColor: canPay ? primaryColor : VITANA_COLORS.border }]}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.payBtnText}>
              {parsedAmount > 0 ? `Pay ${formatINR(parsedAmount)}` : 'Enter Amount'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={{ alignItems: 'center', marginTop: 12 }}>
          <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 14 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 },
  body: { flex: 1, padding: 16, gap: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: VITANA_COLORS.border,
  },
  cardLabel: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginBottom: 4 },
  cardValue: { fontSize: 16, fontWeight: '700', color: VITANA_COLORS.text },
  cardSub: { fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text, marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: VITANA_COLORS.border, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 18, fontWeight: '600', color: VITANA_COLORS.text, backgroundColor: '#fff',
  },
  securityNotice: {
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#bfdbfe', flexDirection: 'row', gap: 10,
  },
  securityText: { fontSize: 13, color: '#1e40af', flex: 1, lineHeight: 20 },
  payBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
