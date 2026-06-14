import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import { Feather } from '@expo/vector-icons';
import { authApi } from '@/api/endpoints/auth';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolStore } from '@/stores/schoolStore';
import { queryClient } from '@/api/queryClient';
import { VITANA_COLORS, VITANA_GRADIENTS } from '@/theme/tokens';
import { identifyUser, track } from '@/lib/analytics';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { UserRole } from '@vitana/shared-types';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
type LoginForm = z.infer<typeof loginSchema>;

function getRoleRoute(role: UserRole): string {
  switch (role) {
    case 'Parent':
      return '/(parent)/';
    case 'Student':
      return '/(student)/';
    case 'Admin':
    case 'Principal':
    case 'HRManager':
    case 'Accountant':
    case 'SuperAdmin':
      return '/(admin)/';
    case 'Teacher':
    case 'Staff':
    case 'Librarian':
    case 'TransportManager':
    case 'HostelWarden':
    case 'Receptionist':
    default:
      return '/(teacher)/';
  }
}

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showBiometricHint, setShowBiometricHint] = useState(false);

  const { setAuth } = useAuthStore();
  const { branding } = useSchoolStore();
  const isWhiteLabel = (Constants.expoConfig?.extra?.isWhiteLabel as boolean) ?? false;

  const primaryColor = branding?.primaryColor ?? VITANA_COLORS.primary;
  const gradientColors = VITANA_GRADIENTS.auth as [string, string, string];

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    async function checkBiometricAvailability() {
      const biometricEnabled = await SecureStore.getItemAsync('biometric_enabled');
      if (biometricEnabled !== 'true') return;

      // Only offer biometric unlock if the user still has a stored session.
      // If user explicitly logged out, user/refreshToken are cleared and
      // biometric makes no sense — they must enter credentials again.
      const { user, refreshToken } = useAuthStore.getState();
      if (!user || !refreshToken) return;

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return;

      setShowBiometricHint(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Sign in as ${user.firstName}`,
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        track('biometric_unlock');
        // Biometric verified — restore the session using the stored refresh token
        try {
          const refreshResponse = await authApi.refreshToken(refreshToken);
          const { updateTokens } = useAuthStore.getState();
          updateTokens(refreshResponse.token, refreshResponse.refreshToken);
          router.replace(getRoleRoute(user.role) as Parameters<typeof router.replace>[0]);
        } catch {
          // Refresh token expired — clear stale auth, user must log in manually
          useAuthStore.getState().clearAuth();
          setShowBiometricHint(false);
          setApiError('Session expired. Please log in again.');
        }
      } else {
        setShowBiometricHint(false);
      }
    }
    void checkBiometricAvailability();
  }, []);

  const attemptBiometricUnlock = useCallback(async () => {
    const { user, refreshToken } = useAuthStore.getState();
    if (!user || !refreshToken) return;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Sign in as ${user.firstName}`,
      fallbackLabel: 'Use Password',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    if (result.success) {
      track('biometric_unlock');
      try {
        const refreshResponse = await authApi.refreshToken(refreshToken);
        useAuthStore.getState().updateTokens(refreshResponse.token, refreshResponse.refreshToken);
        router.replace(getRoleRoute(user.role) as Parameters<typeof router.replace>[0]);
      } catch {
        useAuthStore.getState().clearAuth();
        setApiError('Session expired. Please log in again.');
      }
    }
  }, []);

  async function offerBiometricSetup() {
    const alreadyShown = await SecureStore.getItemAsync('biometric_prompt_shown');
    if (alreadyShown) return;

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) return;

    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const isFaceID = supportedTypes.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    );
    const label = isFaceID ? 'Face ID' : 'Fingerprint';

    Alert.alert(`Enable ${label}?`, `Sign in faster with ${label} next time.`, [
      { text: 'Not Now', style: 'cancel' },
      {
        text: `Enable ${label}`,
        onPress: () => void SecureStore.setItemAsync('biometric_enabled', 'true'),
      },
    ]);
    await SecureStore.setItemAsync('biometric_prompt_shown', 'true');
  }

  async function onSubmit(data: LoginForm) {
    setApiError('');
    queryClient.clear();

    try {
      const response = await authApi.login({ username: data.username, password: data.password });

      if (response.requiresTwoFactor) {
        router.push({
          pathname: '/(auth)/2fa',
          params: { email: response.email },
        });
        return;
      }

      setAuth(response.user, response.token, response.refreshToken);
      identifyUser(response.user.id, response.user.role, response.user.schoolId);
      Sentry.setUser({ id: response.user.id });
      Sentry.setTag('schoolId', response.user.schoolId);
      Sentry.setTag('role', response.user.role);
      track('login_success', { role: response.user.role, method: 'password' });
      await offerBiometricSetup();
      router.replace(getRoleRoute(response.user.role) as Parameters<typeof router.replace>[0]);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status ?? 0;
      track('login_failed', { status_code: status });
      if (status === 429) {
        setApiError('Too many attempts. Account locked for 15 minutes.');
      } else if (status === 401) {
        setApiError('Incorrect username or password.');
      } else if (status === 0) {
        setApiError('No internet connection. Check your network and try again.');
      } else {
        setApiError('Something went wrong. Please try again.');
      }
    }
  }

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Hero: Logo + Branding */}
            <View style={styles.hero}>
              <View style={styles.logoContainer}>
                {branding?.logoUrl ? (
                  <Image
                    source={{ uri: branding.logoUrl }}
                    style={styles.schoolLogo}
                    contentFit="contain"
                    accessibilityLabel={`${branding.schoolName} logo`}
                  />
                ) : (
                  <Image
                    source={require('../../assets/logo/vitanalogo2-removebg-preview.png')}
                    style={styles.vitanaLogo}
                    contentFit="contain"
                    accessibilityLabel="Vitana SMS"
                  />
                )}
              </View>
              <Text style={styles.appName}>
                {branding?.schoolName ?? 'Vitana SMS'}
              </Text>
              <Text style={styles.tagline}>School Management System</Text>
            </View>

            {/* Form Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSubtitle}>Sign in to your account</Text>

              <View style={styles.form}>
                {/* Username */}
                <Controller
                  control={control}
                  name="username"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Username"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Enter your username"
                      icon="user"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      returnKeyType="next"
                      accessibilityLabel="Username"
                      error={errors.username?.message}
                      primaryColor={primaryColor}
                    />
                  )}
                />

                {/* Password */}
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Password"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Enter your password"
                      icon="lock"
                      secureTextEntry={!showPassword}
                      returnKeyType="go"
                      onSubmitEditing={handleSubmit(onSubmit)}
                      accessibilityLabel="Password"
                      error={errors.password?.message}
                      primaryColor={primaryColor}
                      rightIcon={showPassword ? 'eye-off' : 'eye'}
                      onRightIconPress={() => setShowPassword(!showPassword)}
                    />
                  )}
                />

                {/* API Error */}
                {apiError ? (
                  <View style={styles.errorBox}>
                    <Feather name="alert-circle" size={14} color={VITANA_COLORS.error} />
                    <Text style={styles.errorText}>{apiError}</Text>
                  </View>
                ) : null}

                {/* Sign In */}
                <Button
                  label="Sign In"
                  onPress={handleSubmit(onSubmit)}
                  loading={isSubmitting}
                  primaryColor={primaryColor}
                  style={styles.signInBtn}
                />

                {/* Biometric */}
                {showBiometricHint ? (
                  <TouchableOpacity
                    onPress={() => void attemptBiometricUnlock()}
                    style={styles.biometricBtn}
                  >
                    <Feather name="shield" size={16} color={primaryColor} />
                    <Text style={[styles.biometricText, { color: primaryColor }]}>
                      Use Biometric Unlock
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Footer Links */}
              <View style={styles.links}>
                <TouchableOpacity
                  onPress={() => {
                    const base =
                      (process.env.EXPO_PUBLIC_WEB_BASE_URL as string | undefined) ??
                      (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined)?.replace('/api', '') ??
                      'https://app.vitanasms.com';
                    void WebBrowser.openBrowserAsync(`${base}/forgot-password`);
                  }}
                  style={styles.linkBtn}
                  accessibilityLabel="Forgot password"
                >
                  <Text style={[styles.linkText, { color: primaryColor }]}>Forgot password?</Text>
                </TouchableOpacity>

                {!isWhiteLabel ? (
                  <TouchableOpacity
                    onPress={() => router.replace('/(auth)')}
                    style={styles.linkBtn}
                  >
                    <Feather name="arrow-left" size={13} color={VITANA_COLORS.textSecondary} />
                    <Text style={styles.linkSecondaryText}> Use a different school</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Bottom badge */}
            <View style={styles.bottomBadge}>
              <Image
                source={require('../../assets/logo/vitanalogo2-removebg-preview.png')}
                style={styles.bottomLogo}
                contentFit="contain"
              />
              <Text style={styles.poweredBy}>Powered by Vitana SMS</Text>
            </View>
          </ScrollView>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  schoolLogo: {
    width: 80,
    height: 80,
  },
  vitanaLogo: {
    width: 70,
    height: 70,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 4,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
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
    fontSize: 22,
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: VITANA_COLORS.errorLight,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: VITANA_COLORS.error,
    fontFamily: 'Inter',
  },
  signInBtn: {
    marginTop: 4,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
  },
  biometricText: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  links: {
    marginTop: 20,
    gap: 4,
    alignItems: 'center',
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  linkSecondaryText: {
    fontSize: 13,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
  },
  bottomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },
  bottomLogo: {
    width: 16,
    height: 16,
  },
  poweredBy: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
    fontFamily: 'Inter',
  },
});
