import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Constants from 'expo-constants';
import { authApi } from '@/api/endpoints/auth';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolStore } from '@/stores/schoolStore';
import { queryClient } from '@/api/queryClient';
import { VITANA_COLORS } from '@/theme/tokens';
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

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    async function checkBiometricAvailability() {
      const biometricEnabled = await SecureStore.getItemAsync('biometric_enabled');
      if (biometricEnabled !== 'true') return;
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        setShowBiometricHint(true);
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Sign in to Vitana SMS',
          fallbackLabel: 'Use Password',
          cancelLabel: 'Cancel',
        });
        if (result.success) {
          const { user } = useAuthStore.getState();
          if (user) {
            router.replace(getRoleRoute(user.role) as Parameters<typeof router.replace>[0]);
          }
        }
      }
    }
    void checkBiometricAvailability();
  }, []);

  async function attemptBiometricUnlock() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sign in to Vitana SMS',
      fallbackLabel: 'Use Password',
      cancelLabel: 'Cancel',
    });

    if (result.success) {
      const { user } = useAuthStore.getState();
      if (user) {
        router.replace(getRoleRoute(user.role) as Parameters<typeof router.replace>[0]);
      }
    }
  }

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
    // Clear stale query cache before a fresh login
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
      await offerBiometricSetup();
      router.replace(getRoleRoute(response.user.role) as Parameters<typeof router.replace>[0]);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status ?? 0;
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
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center px-6 py-8">
            {/* School Branding */}
            <View className="items-center mb-8">
              {branding?.logoUrl ? (
                <Image
                  source={{ uri: branding.logoUrl }}
                  style={{ width: 80, height: 80, borderRadius: 12 }}
                  contentFit="contain"
                  accessibilityLabel={`${branding.schoolName} logo`}
                />
              ) : (
                <View
                  className="w-20 h-20 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Text className="text-white font-bold text-2xl">
                    {branding?.schoolName?.[0] ?? 'V'}
                  </Text>
                </View>
              )}
              <Text className="text-xl font-bold text-gray-900 mt-3">
                {branding?.schoolName ?? 'Vitana SMS'}
              </Text>
              <Text className="text-sm text-gray-500 mt-1">Sign in to your account</Text>
            </View>

            {/* Form */}
            <View className="gap-y-4">
              {/* Username */}
              <View>
                <Text className="text-sm font-medium text-gray-800 mb-1.5">Username</Text>
                <Controller
                  control={control}
                  name="username"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Enter your username"
                      placeholderTextColor={VITANA_COLORS.textSecondary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      returnKeyType="next"
                      accessibilityLabel="Username"
                      className={`border rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50 ${
                        errors.username ? 'border-red-500' : 'border-gray-200'
                      }`}
                    />
                  )}
                />
                {errors.username ? (
                  <Text className="text-red-500 text-sm mt-1">{errors.username.message}</Text>
                ) : null}
              </View>

              {/* Password */}
              <View>
                <Text className="text-sm font-medium text-gray-800 mb-1.5">Password</Text>
                <View className="relative">
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Enter your password"
                        placeholderTextColor={VITANA_COLORS.textSecondary}
                        secureTextEntry={!showPassword}
                        returnKeyType="go"
                        onSubmitEditing={handleSubmit(onSubmit)}
                        accessibilityLabel="Password"
                        className={`border rounded-xl px-4 py-3.5 pr-12 text-base text-gray-900 bg-gray-50 ${
                          errors.password ? 'border-red-500' : 'border-gray-200'
                        }`}
                      />
                    )}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 p-1"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Text className="text-gray-400 text-sm">
                      {showPassword ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {errors.password ? (
                  <Text className="text-red-500 text-sm mt-1">{errors.password.message}</Text>
                ) : null}
              </View>

              {/* API Error */}
              {apiError ? (
                <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <Text className="text-red-600 text-sm">{apiError}</Text>
                </View>
              ) : null}

              {/* Sign In Button */}
              <TouchableOpacity
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="rounded-xl py-4 items-center justify-center mt-2"
                style={{ backgroundColor: primaryColor, opacity: isSubmitting ? 0.7 : 1 }}
                accessibilityLabel="Sign In"
                accessibilityRole="button"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-semibold text-white text-base">Sign In</Text>
                )}
              </TouchableOpacity>

              {/* Biometric Unlock */}
              {showBiometricHint ? (
                <TouchableOpacity
                  onPress={() => void attemptBiometricUnlock()}
                  className="flex-row items-center justify-center py-3"
                >
                  <Text className="text-sm font-medium" style={{ color: primaryColor }}>
                    Use Biometric Unlock
                  </Text>
                </TouchableOpacity>
              ) : null}

              {/* Forgot Password */}
              <TouchableOpacity
                onPress={() =>
                  void WebBrowser.openBrowserAsync('https://app.vitanasms.com/forgot-password')
                }
                className="items-center py-2"
                accessibilityLabel="Forgot password"
              >
                <Text className="text-sm text-gray-500 underline">Forgot password?</Text>
              </TouchableOpacity>

              {/* Switch school (shared app only) */}
              {!isWhiteLabel ? (
                <TouchableOpacity
                  onPress={() => router.replace('/(auth)/')}
                  className="items-center py-2"
                >
                  <Text className="text-sm text-gray-500">← Use a different school</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View className="pb-6 items-center">
        <Text className="text-xs text-gray-400">Powered by Vitana SMS</Text>
      </View>
    </SafeAreaView>
  );
}
