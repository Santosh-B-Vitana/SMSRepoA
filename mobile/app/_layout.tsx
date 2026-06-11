import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import * as Application from 'expo-application';
import { queryClient } from '@/api/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { SchoolThemeProvider } from '@/theme/index';
import { initDatabase } from '@/offline/db';
import { initializeSyncEngine } from '@/offline/syncEngine';
import { setupNotificationHandlers, handleInitialNotification } from '@/notifications/handler';
import { registerForPushNotifications } from '@/notifications/registration';
import { PushPermissionRationale } from '@/components/notifications/PushPermissionRationale';
import { useAppConfig } from '@/features/appConfig/hooks/useAppConfig';
import { semverLt } from '@vitana/shared-utils';
import type { UserRole } from '@vitana/shared-types';

/**
 * ONE APP — MULTIPLE ROLES
 *
 * This is a single binary. After login, the JWT role determines which portal
 * the user is routed to inside this same app:
 *   Parent                                    → /(parent)
 *   Teacher/Staff/Librarian/Transport/Hostel  → /(teacher)
 *   Student                                   → /(student)
 *   Admin/Principal/HRManager/Accountant      → /(admin)
 *   SuperAdmin                                → /(admin)  [super-admin portal in future sprint]
 *
 * White-label: a school's branded binary (com.<school>.sms) uses the exact same
 * routing logic — one binary serves all roles at that school.
 */
function getRoleRoute(role: UserRole | undefined): string {
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

function AuthGuard() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const segments = useSegments();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/');
      return;
    }

    if (isAuthenticated && user && inAuthGroup) {
      router.replace(getRoleRoute(user.role));
    }
  }, [isAuthenticated, user, segments]);

  return null;
}

/**
 * Fetches app config after authentication and enforces version/maintenance gates.
 * Rendered inside QueryClientProvider + only active when authenticated.
 */
function AppConfigLoader() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { data: config } = useAppConfig();

  useEffect(() => {
    if (!isAuthenticated || !config) return;

    const { versionRequirements } = config;

    if (versionRequirements.maintenanceMode) {
      router.replace('/maintenance');
      return;
    }

    if (versionRequirements.forceUpdateVersion) {
      const currentVersion = Application.nativeApplicationVersion ?? '1.0.0';
      if (semverLt(currentVersion, versionRequirements.forceUpdateVersion)) {
        router.replace('/force-update');
      }
    }
  }, [isAuthenticated, config]);

  return null;
}

export default function RootLayout() {
  const isHydrated = useAuthStore.persist?.hasHydrated?.() ?? true;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    initDatabase().catch((err: unknown) => console.error('[DB] Init failed:', err));
    const cleanup = initializeSyncEngine();
    return cleanup;
  }, []);

  useEffect(() => {
    const cleanup = setupNotificationHandlers();
    void handleInitialNotification();
    return cleanup;
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      registerForPushNotifications().catch((err: unknown) =>
        console.warn('[Push] Registration failed:', err),
      );
    }
  }, [isAuthenticated, user]);

  if (!isHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1a6fd8" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SchoolThemeProvider>
        <AuthGuard />
        <AppConfigLoader />
        <PushPermissionRationale />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(parent)" options={{ headerShown: false }} />
          <Stack.Screen name="(teacher)" options={{ headerShown: false }} />
          <Stack.Screen name="(student)" options={{ headerShown: false }} />
          <Stack.Screen name="(admin)" options={{ headerShown: false }} />
          <Stack.Screen name="force-update" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="maintenance" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </SchoolThemeProvider>
    </QueryClientProvider>
  );
}
