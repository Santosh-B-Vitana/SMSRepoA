import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { authApi } from '@/api/endpoints/auth';
import { useSchoolStore } from '@/stores/schoolStore';
import { VITANA_COLORS } from '@/theme/tokens';

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
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6">
          {/* Vitana Logo */}
          <View className="items-center mb-10">
            <View
              className="w-20 h-20 rounded-2xl items-center justify-center mb-4"
              style={{ backgroundColor: VITANA_COLORS.primary }}
            >
              <Text className="text-white font-bold text-3xl">V</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">Vitana SMS</Text>
            <Text className="text-sm text-gray-500 mt-1">School Management System</Text>
          </View>

          {/* Domain Input */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-800 mb-2">School Domain</Text>
            <TextInput
              value={domain}
              onChangeText={(t) => {
                setDomain(t);
                setError('');
              }}
              placeholder="yourschool.vitanasms.com"
              placeholderTextColor={VITANA_COLORS.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={() => void handleContinue()}
              className={`border rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50 ${
                error ? 'border-red-500' : 'border-gray-200'
              }`}
              accessibilityLabel="School domain"
            />
            {error ? (
              <Text className="text-red-500 text-sm mt-2">{error}</Text>
            ) : null}
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            onPress={() => void handleContinue()}
            disabled={loading}
            className="rounded-xl py-4 items-center justify-center"
            style={{
              backgroundColor: VITANA_COLORS.primary,
              opacity: loading ? 0.7 : 1,
            }}
            accessibilityLabel="Continue to login"
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-semibold text-white text-base">Continue</Text>
            )}
          </TouchableOpacity>

          <Text className="text-gray-400 text-center text-xs mt-8">
            Contact your school administrator for your school domain
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
