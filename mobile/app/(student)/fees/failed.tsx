import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export default function PaymentFailed() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.body}>
        <View style={s.iconWrap}>
          <Feather name="x-circle" size={56} color="#dc2626" />
        </View>
        <Text style={s.title}>Payment Failed</Text>
        <Text style={s.sub}>
          Your payment could not be completed. No amount has been deducted. Please try again.
        </Text>
        <TouchableOpacity
          style={s.btn}
          onPress={() => router.replace('/(student)/fees/pay' as any)}
        >
          <Text style={s.btnText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/(student)/fees/index')}>
          <Text style={s.link}>Back to Fees</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  iconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  sub: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  btn: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8, backgroundColor: '#dc2626' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  link: { fontSize: 14, color: '#6b7280', marginTop: 4 },
});
