import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useSchoolTheme } from '@/theme/useSchoolTheme';

export default function PaymentSuccess() {
  const { primaryColor } = useSchoolTheme();
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.body}>
        <View style={[s.iconWrap, { backgroundColor: primaryColor + '20' }]}>
          <Feather name="check-circle" size={56} color={primaryColor} />
        </View>
        <Text style={s.title}>Payment Successful</Text>
        <Text style={s.sub}>Your fee payment has been processed successfully.</Text>
        <TouchableOpacity
          style={[s.btn, { backgroundColor: primaryColor }]}
          onPress={() => router.replace('/(student)/fees/index')}
        >
          <Text style={s.btnText}>View Fee Summary</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/(student)/index')}>
          <Text style={s.link}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  iconWrap: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  sub: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  btn: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  link: { fontSize: 14, color: '#6b7280', marginTop: 4 },
});
