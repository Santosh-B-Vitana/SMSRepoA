import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { studentApi } from '@/api/endpoints/student';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { formatINR } from '@vitana/shared-utils';
import { VITANA_COLORS } from '@/theme/tokens';

export default function FeeSummaryScreen() {
  const { primaryColor } = useSchoolTheme();
  const canOnlinePayment = useFeatureFlag('mobile.fees.online_payment', true);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['student-fees'],
    queryFn: studentApi.getFeeRecords,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}>
          Fee Summary
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={{ padding: 16, gap: 14 }}>
          {isLoading ? (
            <>
              <SkeletonLoader height={120} borderRadius={12} />
              <SkeletonLoader height={200} borderRadius={12} />
            </>
          ) : !data ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Feather name="credit-card" size={40} color={VITANA_COLORS.textSecondary} />
              <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 14, marginTop: 10 }}>
                No fee records found
              </Text>
            </View>
          ) : (
            <>
              {/* Outstanding balance */}
              <View
                style={{
                  backgroundColor: data.pendingAmount > 0 ? '#fff7ed' : '#f0fdf4',
                  borderRadius: 16, padding: 20,
                  borderWidth: 1,
                  borderColor: data.pendingAmount > 0 ? '#fed7aa' : '#bbf7d0',
                }}
              >
                <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginBottom: 4 }}>
                  Outstanding Balance
                </Text>
                <Text
                  style={{
                    fontSize: 32, fontWeight: '800',
                    color: data.pendingAmount > 0 ? '#ea580c' : '#16a34a',
                  }}
                >
                  {formatINR(data.pendingAmount)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 24, marginTop: 12 }}>
                  <View>
                    <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>Total Fees</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text, marginTop: 2 }}>
                      {formatINR(data.totalAmount)}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>Paid</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#16a34a', marginTop: 2 }}>
                      {formatINR(data.paidAmount)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Online payment or contact school */}
              {data.pendingAmount > 0 && (
                canOnlinePayment ? (
                  <TouchableOpacity
                    onPress={() => router.push('/(student)/fees/pay' as any)}
                    style={{
                      backgroundColor: primaryColor, borderRadius: 12,
                      paddingVertical: 14, alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                      Pay Online  {formatINR(data.pendingAmount)}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View
                    style={{
                      backgroundColor: '#eff6ff', borderRadius: 12, padding: 14,
                      borderWidth: 1, borderColor: '#bfdbfe',
                      flexDirection: 'row', gap: 10, alignItems: 'flex-start',
                    }}
                  >
                    <Feather name="info" size={16} color="#2563eb" />
                    <Text style={{ flex: 1, fontSize: 13, color: '#1d4ed8', lineHeight: 18 }}>
                      Please contact your school administration to make fee payments.
                    </Text>
                  </View>
                )
              )}

              {/* Fee heads breakdown */}
              {(data.feeHeads?.length ?? 0) > 0 && (
                <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: VITANA_COLORS.border }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text, marginBottom: 12 }}>
                    Fee Breakdown
                  </Text>
                  {data.feeHeads.map((head, i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingVertical: 10, borderBottomWidth: i < data.feeHeads.length - 1 ? 1 : 0,
                        borderBottomColor: VITANA_COLORS.border,
                      }}
                    >
                      <Text style={{ fontSize: 14, color: VITANA_COLORS.text, flex: 1 }}>{head.feeHeadName}</Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text }}>
                          {formatINR(head.amount)}
                        </Text>
                        {head.pendingAmount > 0 && (
                          <Text style={{ fontSize: 12, color: '#dc2626' }}>
                            Due: {formatINR(head.pendingAmount)}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
