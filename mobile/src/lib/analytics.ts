import * as amplitude from '@amplitude/analytics-react-native';
import { Identify } from '@amplitude/analytics-react-native';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import type { UserRole } from '@vitana/shared-types';

const FORBIDDEN_KEYS = [
  'name',
  'email',
  'phone',
  'aadhaar',
  'pan',
  'password',
  'token',
  'refreshtoken',
];

export function sanitize(props?: Record<string, unknown>): Record<string, unknown> {
  if (!props) return {};
  return Object.fromEntries(
    Object.entries(props).filter(
      ([k]) => !FORBIDDEN_KEYS.some((fk) => k.toLowerCase().includes(fk)),
    ),
  );
}

export function getAmountBucket(amount: number): '<5k' | '5k-20k' | '20k-50k' | '>50k' {
  if (amount < 5000) return '<5k';
  if (amount < 20000) return '5k-20k';
  if (amount < 50000) return '20k-50k';
  return '>50k';
}

export async function initAnalytics(): Promise<void> {
  const apiKey = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY;
  if (!apiKey) return;
  await amplitude.init(apiKey, undefined, {
    trackingOptions: {
      ipAddress: false,
      carrier: false,
      deviceManufacturer: true,
      deviceModel: true,
      osVersion: true,
      platform: true,
      versionName: true,
    },
  });
}

export function identifyUser(userId: string, role: UserRole, schoolId: string): void {
  amplitude.setUserId(userId);
  const identify = new Identify();
  identify.set('role', role);
  identify.set('schoolId', schoolId);
  identify.set('appVersion', Application.nativeApplicationVersion ?? '1.0.0');
  identify.set('platform', Platform.OS);
  amplitude.identify(identify);
}

export function resetAnalyticsUser(): void {
  amplitude.reset();
}

export type AnalyticsEvent =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'biometric_unlock'
  | 'screen_viewed'
  | 'attendance_viewed'
  | 'attendance_submitted'
  | 'attendance_offline_queued'
  | 'fee_payment_initiated'
  | 'fee_payment_completed'
  | 'fee_payment_failed'
  | 'result_viewed'
  | 'report_card_viewed'
  | 'assignment_viewed'
  | 'assignment_submitted'
  | 'assignment_graded'
  | 'marks_entry_submitted'
  | 'marks_entry_offline_queued'
  | 'leave_applied'
  | 'leave_approved'
  | 'leave_rejected'
  | 'announcement_opened'
  | 'announcement_published'
  | 'message_sent'
  | 'push_notification_tapped'
  | 'offline_queue_synced'
  | 'offline_conflict_resolved'
  | 'feature_unavailable_shown'
  | 'force_update_shown'
  | 'maintenance_mode_shown';

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  amplitude.track(event, sanitize(properties));
}
