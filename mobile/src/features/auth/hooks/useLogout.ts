import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Sentry from '@sentry/react-native';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolStore } from '@/stores/schoolStore';
import { queryClient } from '@/api/queryClient';
import { authApi } from '@/api/endpoints/auth';
import { track, resetAnalyticsUser } from '@/lib/analytics';
import { clearDatabase } from '@/offline/db';

// useAuthStore and useSchoolStore expose .getState() so logout can be
// called without a React hook subscription — safe to test outside React.
export function useLogout() {
  async function logout() {
    const { clearAuth, refreshToken } = useAuthStore.getState();
    const { resetBranding } = useSchoolStore.getState();

    // Tell server to invalidate the refresh token — fire-and-forget
    if (refreshToken) {
      authApi.logout(refreshToken).catch(() => {
        // Server-side invalidation failed; token will expire naturally
      });
    }

    // Clear all client state immediately so UI responds without waiting
    track('logout');
    clearAuth();
    resetBranding();
    queryClient.clear();
    resetAnalyticsUser();
    Sentry.setUser(null);

    // Clear offline SQLite cache so shared-device users can't read previous user's data
    await clearDatabase().catch(() => {
      // Non-fatal — cache will be re-scoped on next login
    });

    // Remove biometric and domain keys so user re-enables after next login
    await Promise.all([
      SecureStore.deleteItemAsync('biometric_enabled'),
      SecureStore.deleteItemAsync('biometric_prompt_shown'),
      SecureStore.deleteItemAsync('school_domain'),
    ]);

    router.replace('/(auth)/login');
  }

  return { logout };
}
