import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';

const PUSH_ASKED_KEY = 'push_permission_asked';
const PUSH_DENIED_KEY = 'push_permission_denied';

export async function hasAskedPermission(): Promise<boolean> {
  const asked = await AsyncStorage.getItem(PUSH_ASKED_KEY);
  return asked === 'true';
}

export async function hasDeniedPermission(): Promise<boolean> {
  const denied = await AsyncStorage.getItem(PUSH_DENIED_KEY);
  return denied === 'true';
}

export async function markPermissionAsked(): Promise<void> {
  await AsyncStorage.setItem(PUSH_ASKED_KEY, 'true');
}

export async function registerForPushNotifications(): Promise<void> {
  const denied = await hasDeniedPermission();
  if (denied) return;

  type PermStatus = { status: string; granted: boolean; canAskAgain: boolean };
  const existingPerms = (await Notifications.getPermissionsAsync()) as unknown as PermStatus;
  let finalStatus = existingPerms.status;

  if (existingPerms.status !== 'granted') {
    const newPerms = (await Notifications.requestPermissionsAsync()) as unknown as PermStatus;
    finalStatus = newPerms.status;
  }

  if (finalStatus !== 'granted') {
    await AsyncStorage.setItem(PUSH_DENIED_KEY, 'true');
    return;
  }

  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const nativeToken = tokenData.data as string;

    const deviceId =
      Platform.OS === 'ios'
        ? ((await Application.getIosIdForVendorAsync()) ?? 'unknown-ios')
        : ((await Application.getAndroidId()) ?? 'unknown-android');

    const appVersion = Application.nativeApplicationVersion ?? '1.0.0';

    await apiClient.post('/notifications/register-device', {
      nativeToken,
      platform: Platform.OS,
      deviceId,
      appVersion,
    });

    // Handle token refresh (FCM rotates tokens periodically)
    Notifications.addPushTokenListener(async (newToken) => {
      try {
        await apiClient.post('/notifications/register-device', {
          nativeToken: newToken.data,
          platform: Platform.OS,
          deviceId,
          appVersion,
        });
      } catch {
        // Token refresh failures are non-critical
      }
    });
  } catch (err) {
    // Registration failure is non-fatal — app continues working without push
    console.warn('[Push] Device registration failed:', err);
  }
}
