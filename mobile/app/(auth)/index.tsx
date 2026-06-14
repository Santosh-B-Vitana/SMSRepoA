import { useState, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { Feather } from '@expo/vector-icons';
import { authApi } from '@/api/endpoints/auth';
import { useSchoolStore } from '@/stores/schoolStore';
import { VITANA_COLORS, VITANA_GRADIENTS } from '@/theme/tokens';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const isWhiteLabel = (Constants.expoConfig?.extra?.isWhiteLabel as boolean) ?? false;
const hardcodedDomain = (Constants.expoConfig?.extra?.schoolDomain as string | null) ?? null;

export default function SchoolDomainScreen() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setBranding } = useSchoolStore();

  useEffect(() => {
    if (isWhiteLabel && hardcodedDomain) {
      router.replace('/(auth)/login');
      return;
    }
    void SecureStore.getItemAsync('last_school_domain').then((saved) => {
      if (saved) setDomain(saved);
    });
  }, []);

  async function handleContinue() {
    const trimmed = domain.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your school domain');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const branding = await authApi.getPublicBranding(trimmed);
      setBranding({
        schoolName: branding.schoolName,
        logoUrl: branding.logoUrl,
        primaryColor: branding.primaryColor,
      });
      await SecureStore.setItemAsync('last_school_domain', trimmed);
      await SecureStore.setItemAsync('school_domain', trimmed);
      router.push('/(auth)/login');
    } catch {
      setError('School not found. Please check the domain and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={VITANA_GRADIENTS.auth as [string, string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.container}>
            {/* Logo section */}
            <View style={styles.hero}>
              <View style={styles.logoWrapper}>
                <Image
                  source={require('../../assets/logo/vitanalogo2-removebg-preview.png')}
                  style={styles.logo}
                  contentFit="contain"
                  accessibilityLabel="Vitana SMS"
                />
              </View>
              <Text style={styles.appName}>Vitana SMS</Text>
              <Text style={styles.tagline}>School Management System</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Find your school</Text>
              <Text style={styles.cardSubtitle}>
                Enter your school domain to get started
              </Text>

              <View style={styles.form}>
                <Input
                  label="School Domain"
                  value={domain}
                  onChangeText={(t) => {
                    setDomain(t);
                    setError('');
                  }}
                  placeholder="yourschool.vitanasms.com"
                  icon="globe"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="go"
                  onSubmitEditing={() => void handleContinue()}
                  accessibilityLabel="School domain"
                  error={error}
                />

                <Button
                  label="Continue"
                  onPress={() => void handleContinue()}
                  loading={loading}
                  icon={<Feather name="arrow-right" size={16} color="#fff" />}
                  iconPosition="right"
                />
              </View>

              <View style={styles.hint}>
                <Feather name="info" size={13} color={VITANA_COLORS.textSecondary} />
                <Text style={styles.hintText}>
                  Contact your school administrator for your school domain
                </Text>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoWrapper: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logo: {
    width: 70,
    height: 70,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.68)',
    fontFamily: 'Inter',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 24,
    elevation: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: VITANA_COLORS.text,
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 18,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    lineHeight: 17,
  },
});
