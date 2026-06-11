import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '@/api/endpoints/auth';
import { useSchoolStore } from '@/stores/schoolStore';
import { VITANA_COLORS } from '@/theme/tokens';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Minimum 8 characters required'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

const FIELDS: { name: keyof FormData; label: string }[] = [
  { name: 'currentPassword', label: 'Current Password' },
  { name: 'newPassword', label: 'New Password' },
  { name: 'confirmPassword', label: 'Confirm New Password' },
];

export default function ChangePasswordScreen() {
  const { branding } = useSchoolStore();
  const primaryColor = branding?.primaryColor ?? VITANA_COLORS.primary;
  const [apiError, setApiError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setApiError('');
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword);
      Alert.alert('Password Changed', 'Your password has been updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status ?? 0;
      if (status === 400) {
        setApiError('Current password is incorrect.');
      } else {
        setApiError('Failed to change password. Please try again.');
      }
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 py-4">
          <TouchableOpacity onPress={() => router.back()} className="mb-4 py-2">
            <Text className="text-sm text-gray-500">← Back</Text>
          </TouchableOpacity>

          <Text className="text-xl font-bold text-gray-900 mb-6">Change Password</Text>

          {FIELDS.map(({ name, label }) => (
            <View key={name} className="mb-4">
              <Text className="text-sm font-medium text-gray-800 mb-1.5">{label}</Text>
              <Controller
                control={control}
                name={name}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    returnKeyType="next"
                    accessibilityLabel={label}
                    className={`border rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50 ${
                      errors[name] ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                )}
              />
              {errors[name] ? (
                <Text className="text-red-500 text-sm mt-1">{errors[name]?.message}</Text>
              ) : null}
            </View>
          ))}

          {apiError ? (
            <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              <Text className="text-red-600 text-sm">{apiError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="rounded-xl py-4 items-center"
            style={{ backgroundColor: primaryColor, opacity: isSubmitting ? 0.7 : 1 }}
            accessibilityLabel="Update password"
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-semibold text-white text-base">Update Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
