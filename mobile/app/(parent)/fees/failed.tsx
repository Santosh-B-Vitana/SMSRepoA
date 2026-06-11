import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';

export default function PaymentFailed() {
  const { primaryColor } = useSchoolTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: '#fee2e2',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <Feather name="x-circle" size={48} color="#dc2626" />
        </View>

        <Text style={{ fontSize: 24, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 8 }}>
          Payment Failed
        </Text>
        <Text
          style={{ fontSize: 15, color: VITANA_COLORS.textSecondary, textAlign: 'center', lineHeight: 22 }}
        >
          Your payment could not be processed. No amount has been deducted. Please try again.
        </Text>

        <View style={{ width: '100%', gap: 12, marginTop: 40 }}>
          <TouchableOpacity
            onPress={() => router.replace('/(parent)/fees/pay')}
            style={{
              backgroundColor: primaryColor,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(parent)/fees/index')}
            style={{ alignItems: 'center', paddingVertical: 12 }}
          >
            <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 14 }}>Back to Fees</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
