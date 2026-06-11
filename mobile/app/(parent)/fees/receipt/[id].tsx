import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Feather } from '@expo/vector-icons';
import { parentApi } from '@/api/endpoints/parent';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';

export default function ReceiptViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, error } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => parentApi.getPaymentReceipt(id!),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });

  async function openReceipt() {
    if (data?.pdfUrl) {
      await WebBrowser.openBrowserAsync(data.pdfUrl);
    }
  }

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
          Payment Receipt
        </Text>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color={primaryColor} />
        ) : error || !data?.pdfUrl ? (
          <>
            <Feather name="x-circle" size={48} color={VITANA_COLORS.textSecondary} />
            <Text style={{ fontSize: 16, color: VITANA_COLORS.textSecondary, marginTop: 12, textAlign: 'center' }}>
              Receipt not available
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginTop: 24, paddingVertical: 12 }}
            >
              <Text style={{ color: primaryColor, fontSize: 14, fontWeight: '500' }}>Go Back</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: '#eff6ff',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <Feather name="file-text" size={40} color="#2563eb" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '600', color: VITANA_COLORS.text, marginBottom: 8 }}>
              Receipt Ready
            </Text>
            <Text
              style={{ fontSize: 14, color: VITANA_COLORS.textSecondary, textAlign: 'center', marginBottom: 32 }}
            >
              Your payment receipt is ready. Tap below to open and share it.
            </Text>
            <TouchableOpacity
              onPress={openReceipt}
              style={{
                backgroundColor: primaryColor,
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 32,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Feather name="external-link" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Open Receipt</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
