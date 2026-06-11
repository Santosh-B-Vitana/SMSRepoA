import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import * as ScreenCapture from 'expo-screen-capture';
import { Feather } from '@expo/vector-icons';
import { parentApi } from '@/api/endpoints/parent';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { formatINR } from '@vitana/shared-utils';
import { VITANA_COLORS } from '@/theme/tokens';
import { queryClient } from '@/api/queryClient';

export default function PayFees() {
  const { primaryColor } = useSchoolTheme();

  const { data: children } = useQuery({
    queryKey: ['my-children'],
    queryFn: parentApi.getMyChildren,
  });
  const student = children?.[0];
  const studentId = student?.id;

  const { data: feeRecord } = useQuery({
    queryKey: ['fees', studentId],
    queryFn: () => parentApi.getFeeRecords(studentId!),
    enabled: !!studentId,
  });

  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (feeRecord?.pendingAmount) {
      setAmount(String(feeRecord.pendingAmount));
    }
  }, [feeRecord?.pendingAmount]);

  // Block screenshots during payment
  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync();
    return () => {
      void ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  const mutation = useMutation({
    mutationFn: async ({ sId, amt }: { sId: string; amt: number }) => {
      const paymentData = await parentApi.initiateMobilePayment(sId, amt);
      return paymentData;
    },
    onSuccess: async (paymentData) => {
      const cashfreeUrl = `https://payments.cashfree.com/order/#${paymentData.paymentSessionId}`;
      const redirectUrl = 'vitanasms://fees/pay/result';

      const result = await WebBrowser.openAuthSessionAsync(cashfreeUrl, redirectUrl);

      if (result.type === 'success') {
        // Verify payment regardless of returned URL params (most reliable approach)
        try {
          await parentApi.verifyPayment(paymentData.cfOrderId, '');
          await queryClient.invalidateQueries({ queryKey: ['fees', studentId] });
          await queryClient.invalidateQueries({ queryKey: ['payment-history', studentId] });
          await queryClient.invalidateQueries({ queryKey: ['parent-dashboard'] });
          router.replace('/(parent)/fees/success');
        } catch {
          router.replace('/(parent)/fees/failed');
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
  const canPay = parsedAmount > 0 && !!studentId && !mutation.isPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}>
          Pay Fees
        </Text>
      </View>

      <View style={{ flex: 1, padding: 16, gap: 16 }}>
        {/* Student Info */}
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: VITANA_COLORS.border,
          }}
        >
          <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, marginBottom: 4 }}>
            Student
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>
            {student?.studentName ?? '—'}
          </Text>
          <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
            {student?.className ?? ''}
          </Text>
        </View>

        {/* Amount Input */}
        <View>
          <Text
            style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text, marginBottom: 8 }}
          >
            Amount (₹)
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor={VITANA_COLORS.textSecondary}
            style={{
              borderWidth: 1,
              borderColor: VITANA_COLORS.border,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 18,
              fontWeight: '600',
              color: VITANA_COLORS.text,
              backgroundColor: '#fff',
            }}
          />
          {feeRecord && (
            <TouchableOpacity
              onPress={() => setAmount(String(feeRecord.pendingAmount))}
              style={{ marginTop: 8 }}
            >
              <Text style={{ fontSize: 13, color: primaryColor }}>
                Pay full amount: {formatINR(feeRecord.pendingAmount)}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Security Notice */}
        <View
          style={{
            backgroundColor: '#eff6ff',
            borderRadius: 10,
            padding: 14,
            borderWidth: 1,
            borderColor: '#bfdbfe',
            flexDirection: 'row',
            gap: 10,
          }}
        >
          <Feather name="lock" size={16} color="#2563eb" style={{ marginTop: 1 }} />
          <Text style={{ fontSize: 13, color: '#1e40af', flex: 1, lineHeight: 20 }}>
            Your payment is secured by Cashfree. UPI, Cards, and Netbanking accepted. You will be
            redirected to a secure checkout page.
          </Text>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          onPress={() =>
            mutation.mutate({ sId: studentId!, amt: parsedAmount })
          }
          disabled={!canPay}
          style={{
            backgroundColor: canPay ? primaryColor : VITANA_COLORS.border,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            marginTop: 'auto',
          }}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
              {parsedAmount > 0 ? `Pay ${formatINR(parsedAmount)}` : 'Enter Amount'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={{ alignItems: 'center' }}>
          <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 14 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
