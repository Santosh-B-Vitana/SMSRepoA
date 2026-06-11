import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { parentApi } from '@/api/endpoints/parent';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/common/EmptyState';
import { formatINR, formatDate } from '@vitana/shared-utils';
import { VITANA_COLORS } from '@/theme/tokens';

export default function FeesSummary() {
  const { primaryColor } = useSchoolTheme();
  const canOnlinePayment = useFeatureFlag('mobile.fees.online_payment', true);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(!!state.isConnected);
    });
    return unsubscribe;
  }, []);

  const { data: children } = useQuery({
    queryKey: ['my-children'],
    queryFn: parentApi.getMyChildren,
  });
  const studentId = children?.[0]?.id;

  const {
    data: feeRecord,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['fees', studentId],
    queryFn: () => parentApi.getFeeRecords(studentId!),
    enabled: !!studentId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: paymentHistory } = useQuery({
    queryKey: ['payment-history', studentId],
    queryFn: () => parentApi.getPaymentHistory(studentId!),
    enabled: !!studentId,
  });

  const canPay = canOnlinePayment && isConnected;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
        <View style={{ padding: 16, gap: 12 }}>
          <SkeletonLoader height={120} borderRadius={12} />
          <SkeletonLoader height={200} borderRadius={12} />
          <SkeletonLoader height={60} borderRadius={12} />
        </View>
      </SafeAreaView>
    );
  }

  if (!feeRecord && !isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
        <EmptyState icon="dollar-sign" title="No fee record found" subtitle="Contact the school office for details." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={{ padding: 16, paddingBottom: 32, gap: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: VITANA_COLORS.text }}>
            Fee Summary
          </Text>

          {/* Outstanding Balance Card */}
          {feeRecord && (
            <View style={{ backgroundColor: primaryColor, borderRadius: 14, padding: 20 }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>Outstanding Balance</Text>
              <Text style={{ color: '#fff', fontSize: 32, fontWeight: '700', marginTop: 4 }}>
                {formatINR(feeRecord.pendingAmount)}
              </Text>
              {feeRecord.lateFeeAmount > 0 && (
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
                  Includes {formatINR(feeRecord.lateFeeAmount)} late fee
                </Text>
              )}
              <View style={{ flexDirection: 'row', marginTop: 16, gap: 24 }}>
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Total</Text>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                    {formatINR(feeRecord.totalAmount)}
                  </Text>
                </View>
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Paid</Text>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                    {formatINR(feeRecord.paidAmount)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Pay Now Button */}
          {feeRecord && feeRecord.pendingAmount > 0 && (
            <TouchableOpacity
              onPress={() => canPay && router.push('/(parent)/fees/pay')}
              disabled={!canPay}
              style={{
                backgroundColor: canPay ? primaryColor : VITANA_COLORS.border,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                {canPay
                  ? `Pay Online  ${formatINR(feeRecord.pendingAmount)}`
                  : isConnected
                    ? 'Online payment not available'
                    : 'Offline — Connect to pay'}
              </Text>
            </TouchableOpacity>
          )}

          {!isConnected && (
            <View
              style={{
                backgroundColor: '#fffbeb',
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: '#fde68a',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Feather name="wifi-off" size={16} color={VITANA_COLORS.warning} />
              <Text style={{ fontSize: 13, color: '#92400e', flex: 1 }}>
                You are offline. Connect to the internet to make payments.
              </Text>
            </View>
          )}

          {/* Fee Head Breakdown */}
          {feeRecord && feeRecord.feeHeads.length > 0 && (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: VITANA_COLORS.border,
              }}
            >
              <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text }}>
                  Fee Breakdown
                </Text>
              </View>
              {feeRecord.feeHeads.map((head, index) => (
                <View
                  key={head.feeHeadId}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottomWidth: index < feeRecord.feeHeads.length - 1 ? 1 : 0,
                    borderBottomColor: VITANA_COLORS.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text }}>
                      {head.feeHeadName}
                    </Text>
                    {head.isConcession && head.concessionType && (
                      <Text style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>
                        {head.concessionType} concession applied
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text }}>
                      {formatINR(head.amount)}
                    </Text>
                    {head.pendingAmount > 0 && (
                      <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>
                        {formatINR(head.pendingAmount)} pending
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Payment History */}
          {paymentHistory && paymentHistory.length > 0 && (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: VITANA_COLORS.border,
              }}
            >
              <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text }}>
                  Payment History
                </Text>
              </View>
              {paymentHistory.slice(0, 10).map((payment, index) => (
                <TouchableOpacity
                  key={payment.id}
                  onPress={() =>
                    router.push({ pathname: '/(parent)/fees/receipt/[id]', params: { id: payment.id } })
                  }
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottomWidth: index < Math.min(paymentHistory.length, 10) - 1 ? 1 : 0,
                    borderBottomColor: VITANA_COLORS.border,
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text }}>
                      {formatINR(payment.amount)}
                    </Text>
                    <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
                      {formatDate(payment.paymentDate)} · {payment.paymentMode}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
                      #{payment.receiptNumber}
                    </Text>
                    <Feather name="chevron-right" size={14} color={VITANA_COLORS.textSecondary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
