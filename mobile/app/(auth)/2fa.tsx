import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '@/api/endpoints/auth';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolStore } from '@/stores/schoolStore';
import { VITANA_COLORS } from '@/theme/tokens';
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
    if (digits.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const response = await authApi.twoFactorLogin(email ?? '', digits);
      setAuth(response.user, response.token, response.refreshToken);
      router.replace(getRoleRoute(response.user.role) as Parameters<typeof router.replace>[0]);
    } catch {
      setError('Invalid or expired code. Check your authenticator app and try again.');
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError('');
    if (digits.length === 6) {
      void verifyCode(digits);
    }
  }

  const borderColor = error
    ? VITANA_COLORS.error
    : code.length > 0
      ? primaryColor
      : VITANA_COLORS.border;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-8">
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
            style={{ backgroundColor: primaryColor + '20' }}
          >
            <Text className="text-3xl">🔐</Text>
          </View>
          <Text className="text-2xl font-bold text-gray-900">Two-Factor Auth</Text>
          <Text className="text-sm text-gray-500 text-center mt-2">
            Enter the 6-digit code from{'\n'}your authenticator app
          </Text>
        </View>

        {/* Code Input */}
        <View className="items-center mb-6">
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={VITANA_COLORS.textSecondary}
            className="border-2 rounded-xl px-6 py-4 text-center text-3xl text-gray-900 tracking-widest"
            style={{ borderColor }}
            accessibilityLabel="6-digit authentication code"
          />
          {error ? (
            <Text className="text-red-500 text-sm mt-2 text-center">{error}</Text>
          ) : null}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          onPress={() => void verifyCode(code)}
          disabled={code.length !== 6 || loading}
          className="rounded-xl py-4 items-center"
          style={{
            backgroundColor: code.length === 6 ? primaryColor : VITANA_COLORS.border,
          }}
          accessibilityLabel="Verify code"
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-semibold text-white text-base">Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          className="items-center py-4 mt-2"
        >
          <Text className="text-sm text-gray-500">← Back to login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
