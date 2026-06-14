import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { authApi } from '@/api/endpoints/auth';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolStore } from '@/stores/schoolStore';
import { VITANA_COLORS, VITANA_GRADIENTS } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';
import type { UserRole } from '@vitana/shared-types';

function getRoleRoute(role: UserRole): string {
  switch (role) {
    case 'Parent':
      return '/(parent)/';
    case 'Student':
      return '/(student)/';
    case 'Teacher':
      return '/(teacher)/';
    default:
      return '/(admin)/';
  }
}

const DIGIT_COUNT = 6;

export default function TwoFAScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { setAuth } = useAuthStore();
  const { branding } = useSchoolStore();
  const primaryColor = branding?.primaryColor ?? VITANA_COLORS.primary;

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  async function verifyCode(digits: string) {
    if (digits.length !== DIGIT_COUNT) return;
    setLoading(true);
    setError('');
    try {
      const response = await authApi.twoFactorLogin(email ?? '', digits);
      setAuth(response.user, response.token, response.refreshToken);
      router.replace(getRoleRoute(response.user.role) as Parameters<typeof router.replace>[0]);
    } catch {
      setError('Invalid or expired code. Check your authenticator app.');
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, DIGIT_COUNT);
    setCode(digits);
    setError('');
    if (digits.length === DIGIT_COUNT) {
      void verifyCode(digits);
    }
  }

  const digits = code.split('').concat(Array(DIGIT_COUNT - code.length).fill(''));

  return (
    <LinearGradient
      colors={VITANA_GRADIENTS.auth as [string, string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Back */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#ffffff" />
          </TouchableOpacity>

          {/* Hero */}
          <View style={styles.hero}>
            <View style={[styles.iconContainer, { backgroundColor: `${primaryColor}30` }]}>
              <Feather name="shield" size={36} color="#ffffff" />
            </View>
            <Text style={styles.heroTitle}>Two-Factor Auth</Text>
            <Text style={styles.heroSubtitle}>
              Enter the 6-digit code{'\n'}from your authenticator app
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Authentication Code</Text>

            {/* Digit boxes — invisible input underneath */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
              style={styles.digitRow}
              accessible={false}
            >
              {digits.map((d, i) => {
                const isFilled = i < code.length;
                const isActive = i === code.length;
                return (
                  <View
                    key={i}
                    style={[
                      styles.digitBox,
                      isFilled && { borderColor: primaryColor, backgroundColor: `${primaryColor}10` },
                      isActive && styles.digitBoxActive,
                      error ? styles.digitBoxError : null,
                    ]}
                  >
                    <Text style={[styles.digitText, isFilled && { color: primaryColor }]}>
                      {d ? '•' : ''}
                    </Text>
                  </View>
                );
              })}
            </TouchableOpacity>

            {/* Hidden real input */}
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={DIGIT_COUNT}
              style={styles.hiddenInput}
              accessibilityLabel="6-digit authentication code"
            />

            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={13} color={VITANA_COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button
              label="Verify Code"
              onPress={() => void verifyCode(code)}
              loading={loading}
              disabled={code.length !== DIGIT_COUNT}
              primaryColor={primaryColor}
              style={styles.verifyBtn}
            />

            <TouchableOpacity
              onPress={() => router.replace('/(auth)/login')}
              style={styles.backLink}
            >
              <Feather name="arrow-left" size={13} color={VITANA_COLORS.textSecondary} />
              <Text style={styles.backLinkText}> Back to login</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.70)',
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 20,
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
  cardLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    textAlign: 'center',
    marginBottom: 20,
  },
  digitRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  digitBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: VITANA_COLORS.border,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxActive: {
    borderColor: VITANA_COLORS.primary,
    backgroundColor: '#fff',
    shadowColor: VITANA_COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  digitBoxError: {
    borderColor: VITANA_COLORS.error,
  },
  digitText: {
    fontSize: 20,
    fontWeight: '700',
    color: VITANA_COLORS.text,
    fontFamily: 'Inter',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: VITANA_COLORS.errorLight,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: VITANA_COLORS.error,
    fontFamily: 'Inter',
  },
  verifyBtn: {
    marginBottom: 4,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  backLinkText: {
    fontSize: 13,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
  },
});
