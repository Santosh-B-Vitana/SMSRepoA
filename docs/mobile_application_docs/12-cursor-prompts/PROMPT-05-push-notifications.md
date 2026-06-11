# PROMPT-05: Push Notifications

> **Version**: 2.0 — Full 10-Phase Anatomy  
> **Epic**: EP-06 — Push Notifications  
> **Sprint**: 10 (Weeks 19–20)  
> **Story Points**: 16  
> **Prerequisites**: PROMPT-01 ✓, PROMPT-02 ✓; Firebase project provisioned by DevOps  
> **Backend Dependency**: Firebase Admin SDK + `POST /api/notifications/register-device` (PROMPT-11D)  
> **Next Prompt**: PROMPT-14 (Messaging) — requires push for new message alerts

---

## PHASE 1: Context & Scope

### What We're Building

Real-time push notifications to every user role. A parent gets notified when their child is absent. A teacher gets notified of a leave request. An admin gets billing alerts.

**Capabilities:**
- FCM (Android) + APNS (iOS) via Firebase unified SDK
- Device token registration with backend on first login
- Token rotation handling (FCM rotates tokens periodically)
- Foreground: in-app banner with sound for High/Urgent
- Background/quit: system notification tray
- Tap → deep-link to relevant screen
- Killed-app tap handled on startup
- Notification center (bell icon + list screen)
- Per-type notification preference toggles
- Permission rationale screen (shown before system dialog)
- Silent push for background cache invalidation

### Current State

- ✅ `expo-notifications` installed
- ✅ All screens exist (parent, teacher, student, admin)
- ✅ Deep link routes exist (Expo Router generates URL scheme)
- ❌ Firebase not configured
- ❌ Device registration not implemented
- ❌ Push handler not set up
- ❌ Notification center screens empty

### Success Criteria

- [ ] FCM token stored in `MobileDeviceTokens` table after login
- [ ] Push notification received when attendance is marked absent (physical device)
- [ ] Tapping notification deep-links to correct screen for all 15 notification types
- [ ] Killed-app tap navigates correctly (tested on both platforms)
- [ ] Notification center shows all notifications with correct read/unread state
- [ ] "Mark All Read" clears unread badge
- [ ] Notification preferences toggles persist across app restarts
- [ ] Permission rationale shown exactly once per install
- [ ] Silent push (background cache invalidation) works
- [ ] No notification tokens in Sentry events or console logs

---

## PHASE 2: Analysis Phase

### Read First

```bash
docs/mobile_application_docs/09-push-notification-architecture.md
docs/mobile_application_docs/epics/EP-06-push-notifications.md
```

### Pre-Implementation Setup (DevOps must complete first)

```bash
# 1. Create Firebase project at https://console.firebase.google.com
#    Project name: vitana-sms-mobile

# 2. Add Android app
#    Package name: com.vitana.sms
#    Download google-services.json → place in mobile/google-services.json

# 3. Add iOS app
#    Bundle ID: com.vitana.sms
#    Download GoogleService-Info.plist → place in mobile/GoogleService-Info.plist

# 4. Get Firebase Server Key / Service Account JSON
#    → Project Settings → Service Accounts → Generate new private key
#    → Place in backend: appsettings.json "Firebase:ServiceAccountJsonPath"

# 5. Add to mobile/.gitignore:
#    google-services.json
#    GoogleService-Info.plist
```

### Backend API Contracts

```
POST /api/notifications/register-device
  Auth: Bearer <token>
  Body: { nativeToken: string, platform: 'android'|'ios', deviceId: string, appVersion: string }
  200: {}

GET /api/notifications?page=1&pageSize=20
  200: PaginatedResponse<AppNotification>

PUT /api/notifications/{id}/read
  200: {}

PUT /api/notifications/read-all
  200: {}

GET /api/notifications/unread-count
  200: { count: number }

GET /api/notifications/preferences
  200: { [notificationType]: { pushEnabled: boolean, inAppEnabled: boolean } }

PUT /api/notifications/preferences/{notificationType}
  Body: { pushEnabled: boolean }
  200: {}
```

### Notification Type → Deep Link Map

```typescript
const DEEP_LINKS: Record<string, (data: Record<string, string>) => string> = {
  'fee_due':                (d) => `/(parent)/fees`,
  'fee_overdue':            (d) => `/(parent)/fees`,
  'fee_payment_confirmed':  (d) => `/(parent)/fees/receipt/${d.paymentId}`,
  'attendance_absent':      (d) => `/(parent)/attendance/${d.studentId}`,
  'attendance_shortage':    (d) => `/(parent)/attendance/${d.studentId}`,
  'result_published':       (d) => `/(parent)/results/${d.studentId}`,
  'report_card_ready':      (d) => `/(parent)/results/${d.studentId}`,
  'new_announcement':       (d) => `/(parent)/announcements/${d.announcementId}`,
  'new_diary_entry':        (d) => `/(parent)/diary/${d.studentId}`,
  'leave_approved':         ()  => `/(parent)/leaves`,
  'leave_rejected':         ()  => `/(parent)/leaves`,
  'assignment_graded':      (d) => `/(student)/assignments/${d.assignmentId}`,
  'assignment_created':     (d) => `/(student)/assignments/${d.assignmentId}`,
  'leave_request_received': ()  => `/(teacher)/leaves`,
  'new_message':            (d) => `/(teacher)/messages/${d.conversationId}`,
  'timetable_change':       ()  => `/(teacher)/timetable`,
  'submission_received':    (d) => `/(teacher)/assignments/${d.assignmentId}`,
  'billing_expiry_warning': ()  => `/(admin)/more/settings`,
  'billing_expired':        ()  => `/(admin)/more/settings`,
};
```

---

## PHASE 3: Technical Planning

### 3.1 Notification Flow

```
New event (e.g., fee overdue)
    │ Backend
    ▼
NotificationService.CreateAndPushAsync()
  → Save to Notifications table (in-app)
  → Check UserNotificationPreferences
  → Get active MobileDeviceTokens for userId
  → FirebaseMessaging.DefaultInstance.SendAsync()
    │
    │ FCM/APNS
    ▼
Device receives push
  → App foregrounded? → expo-notifications handler → in-app banner
  → App backgrounded? → system tray notification
  → App killed? → system tray → startup check via getLastNotificationResponseAsync()
    │
    │ User taps
    ▼
notificationDeepLinks[type](data) → router.push(route)
```

### 3.2 Permission Flow

```
First login
    │
    ▼
Permissions not yet requested (check AsyncStorage 'push_permission_asked')
    │
    ▼
Show RationaleScreen (not system dialog yet)
  → User taps "Allow Notifications"
  → requestPermissionsAsync() → system dialog
  → On granted: registerForPushNotifications()
  → On denied: store 'push_permission_denied' in AsyncStorage
    │
    ▼
Future app opens: skip rationale, proceed directly
```

---

## PHASE 4: Database Design

> No SQLite changes. Backend tables (defined in PROMPT-11D):

```sql
MobileDeviceTokens    -- (UserId, DeviceId) unique
NotificationDeliveryLog
UserNotificationPreferences
```

---

## PHASE 5: Backend Implementation

### Firebase Admin SDK

```csharp
// Program.cs — add Firebase initialization
var firebaseCredential = GoogleCredential.FromFile(
    builder.Configuration["Firebase:ServiceAccountJsonPath"]
);
FirebaseApp.Create(new AppOptions { Credential = firebaseCredential });
services.AddSingleton(FirebaseMessaging.DefaultInstance);
```

### Push Delivery

```csharp
// Services/Push/FirebasePushNotificationService.cs
public async Task SendToUserAsync(Guid userId, PushNotificationPayload payload)
{
    var tokens = await _dbContext.MobileDeviceTokens
        .Where(t => t.UserId == userId && t.IsActive)
        .ToListAsync();

    var tasks = tokens.Select(async token =>
    {
        try
        {
            var message = new Message
            {
                Token = token.DeviceToken,
                Notification = new Notification { Title = payload.Title, Body = payload.Body },
                Data = new Dictionary<string, string>(payload.Data ?? new())
                {
                    ["notificationType"] = payload.NotificationType,
                    ["notificationId"] = payload.NotificationId?.ToString() ?? "",
                },
                Android = new AndroidConfig
                {
                    Priority = payload.Priority == NotificationPriority.High
                        ? AndroidMessagePriority.High : AndroidMessagePriority.Normal,
                    Notification = new AndroidNotification
                    {
                        ChannelId = "vitana_default",
                        Icon = "notification_icon",
                    },
                },
                Apns = new ApnsConfig
                {
                    Aps = new Aps
                    {
                        Sound = payload.Priority == NotificationPriority.High ? "default" : null,
                        Badge = 1,
                    },
                },
            };
            await _firebaseMessaging.SendAsync(message);
        }
        catch (FirebaseMessagingException ex) when (ex.MessagingErrorCode == MessagingErrorCode.Unregistered)
        {
            // Token is invalid — mark inactive
            token.IsActive = false;
            await _dbContext.SaveChangesAsync();
        }
    });

    await Task.WhenAll(tasks);
}
```

### Device Registration Endpoint

```csharp
[HttpPost("notifications/register-device")]
[Authorize]
public async Task<IActionResult> RegisterDevice([FromBody] RegisterDeviceRequest request)
{
    var existing = await _dbContext.MobileDeviceTokens
        .FirstOrDefaultAsync(t => t.UserId == _userId && t.DeviceId == request.DeviceId);

    if (existing != null)
    {
        existing.DeviceToken = request.NativeToken;
        existing.AppVersion = request.AppVersion;
        existing.IsActive = true;
        existing.LastActiveAt = DateTime.UtcNow;
    }
    else
    {
        _dbContext.MobileDeviceTokens.Add(new MobileDeviceToken
        {
            UserId = _userId,
            SchoolId = _schoolId,
            DeviceToken = request.NativeToken,
            Platform = request.Platform,
            DeviceId = request.DeviceId,
            AppVersion = request.AppVersion,
            IsActive = true,
            RegisteredAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow,
        });
    }

    await _dbContext.SaveChangesAsync();
    return Ok();
}
```

---

## PHASE 6: Mobile Implementation

### 6.1 Notification Registration

```typescript
// mobile/src/notifications/registration.ts
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import apiClient from '../api/client';

export async function registerForPushNotifications(): Promise<void> {
  // Check if already denied
  const denied = await AsyncStorage.getItem('push_permission_denied');
  if (denied === 'true') return;

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    await AsyncStorage.setItem('push_permission_denied', 'true');
    return;
  }

  // Get native FCM/APNS token
  const tokenData = await Notifications.getDevicePushTokenAsync();
  const nativeToken = tokenData.data;

  // Get device ID
  const deviceId = Platform.OS === 'ios'
    ? (await Application.getIosIdForVendorAsync()) ?? 'unknown-ios'
    : Application.androidId ?? 'unknown-android';

  const appVersion = Application.nativeApplicationVersion ?? '1.0.0';

  // Register with backend
  await apiClient.post('/notifications/register-device', {
    nativeToken,
    platform: Platform.OS,
    deviceId,
    appVersion,
  });

  // Handle token refresh (FCM rotates tokens)
  Notifications.addPushTokenListener(async (newToken) => {
    await apiClient.post('/notifications/register-device', {
      nativeToken: newToken.data,
      platform: Platform.OS,
      deviceId,
      appVersion,
    });
  });
}
```

### 6.2 Notification Handler

```typescript
// mobile/src/notifications/handler.ts
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { queryClient } from '../api/queryClient';

const DEEP_LINKS: Record<string, (data: Record<string, string>) => string> = {
  'fee_due':               () => `/(parent)/fees`,
  'fee_overdue':           () => `/(parent)/fees`,
  'fee_payment_confirmed': (d) => `/(parent)/fees/receipt/${d.paymentId}`,
  'attendance_absent':     (d) => `/(parent)/attendance/${d.studentId}`,
  'attendance_shortage':   (d) => `/(parent)/attendance/${d.studentId}`,
  'result_published':      (d) => `/(parent)/results/${d.studentId}`,
  'report_card_ready':     (d) => `/(parent)/results/${d.studentId}`,
  'new_announcement':      (d) => `/(parent)/announcements/${d.announcementId}`,
  'new_diary_entry':       (d) => `/(parent)/diary/${d.studentId}`,
  'leave_approved':        () => `/(parent)/leaves`,
  'leave_rejected':        () => `/(parent)/leaves`,
  'assignment_graded':     (d) => `/(student)/assignments/${d.assignmentId}`,
  'assignment_created':    (d) => `/(student)/assignments/${d.assignmentId}`,
  'leave_request_received':() => `/(teacher)/leaves`,
  'new_message':           (d) => `/(teacher)/messages/${d.conversationId}`,
  'timetable_change':      () => `/(teacher)/timetable`,
  'billing_expiry_warning':() => `/(admin)/more`,
  'billing_expired':       () => `/(admin)/more`,
  'silent_sync':           () => '',  // handled separately
};

// Configure foreground display
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, string>;
    const isSilent = data?.type === 'silent_sync';

    return {
      shouldShowAlert: !isSilent,
      shouldPlaySound: ['high', 'urgent'].includes(data?.priority ?? ''),
      shouldSetBadge: !isSilent,
    };
  },
});

function navigateFromNotification(notification: Notifications.Notification) {
  const data = notification.request.content.data as Record<string, string>;
  const type = data?.notificationType ?? data?.type;

  if (!type || type === 'silent_sync') {
    // Silent push — invalidate relevant cache
    const resource = data?.resource;
    if (resource) queryClient.invalidateQueries({ queryKey: [resource] });
    return;
  }

  const deepLinkFn = DEEP_LINKS[type];
  if (deepLinkFn) {
    const route = deepLinkFn(data);
    if (route) {
      setTimeout(() => router.push(route as any), 100);
    }
  }

  // Mark as opened
  const notificationId = data?.notificationId;
  if (notificationId) {
    apiClient.put(`/notifications/${notificationId}/read`).catch(() => {});
  }
}

export function setupNotificationHandlers(): () => void {
  // Foreground: received while app is open
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as Record<string, string>;
    if (data?.type === 'silent_sync') {
      const resource = data?.resource;
      if (resource) queryClient.invalidateQueries({ queryKey: [resource] });
    }
    // Also refresh notification count
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  });

  // Tapped (background or quit)
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    navigateFromNotification(response.notification);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}

// Call on app startup to handle killed-app tap
export async function handleInitialNotification() {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response) {
    navigateFromNotification(response.notification);
  }
}

// Import apiClient lazily to avoid circular dependency
let apiClient: any;
import('../api/client').then(m => { apiClient = m.default; });
```

### 6.3 Root Layout Integration

```typescript
// mobile/app/_layout.tsx — ADD after existing useEffect calls

import { setupNotificationHandlers, handleInitialNotification } from '../src/notifications/handler';
import { registerForPushNotifications } from '../src/notifications/registration';

// Inside RootLayout, add:
useEffect(() => {
  // Set up notification handlers
  const cleanup = setupNotificationHandlers();
  handleInitialNotification();
  return cleanup;
}, []);

// In RoleRouter useEffect (after authentication confirmed):
// After navigating to dashboard, register for push:
if (isAuthenticated && user) {
  registerForPushNotifications().catch(err =>
    console.warn('[Push] Registration failed:', err)
  );
}
```

### 6.4 Permission Rationale Screen

```typescript
// mobile/src/components/notifications/PushPermissionRationale.tsx
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotifications } from '../../notifications/registration';
import { useSchoolStore } from '../../stores/schoolStore';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

export function PushPermissionRationale() {
  const [visible, setVisible] = useState(false);
  const { branding } = useSchoolStore();
  const primaryColor = branding?.primaryColor ?? VITANA_DESIGN_TOKENS.colors.primary;

  useEffect(() => {
    AsyncStorage.getItem('push_permission_asked').then((asked) => {
      if (!asked) setVisible(true);
    });
  }, []);

  async function handleAllow() {
    await AsyncStorage.setItem('push_permission_asked', 'true');
    setVisible(false);
    await registerForPushNotifications();
  }

  async function handleDismiss() {
    await AsyncStorage.setItem('push_permission_asked', 'true');
    await AsyncStorage.setItem('push_permission_denied', 'true');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
          <View className="items-center mb-4">
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center mb-3"
              style={{ backgroundColor: primaryColor + '20' }}
            >
              <Feather name="bell" size={32} color={primaryColor} />
            </View>
            <Text className="font-heading text-xl text-text-primary">Stay Informed</Text>
          </View>

          <Text className="font-body text-text-secondary text-center mb-6">
            Vitana SMS will send you notifications for:
          </Text>

          {[
            { icon: 'calendar', text: "Your child's attendance updates" },
            { icon: 'credit-card', text: 'Fee due reminders' },
            { icon: 'award', text: 'Exam result announcements' },
            { icon: 'bell', text: 'Important school announcements' },
          ].map(({ icon, text }) => (
            <View key={icon} className="flex-row items-center mb-3">
              <Feather name={icon as any} size={18} color={primaryColor} />
              <Text className="font-body text-text-primary ml-3 flex-1">{text}</Text>
            </View>
          ))}

          <Text className="font-body text-text-secondary text-xs text-center mt-2 mb-6">
            You can change these in Settings anytime.
          </Text>

          <TouchableOpacity
            onPress={handleAllow}
            className="rounded-xl py-4 items-center mb-3"
            style={{ backgroundColor: primaryColor }}
          >
            <Text className="font-body-semibold text-white text-base">Allow Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDismiss} className="items-center py-2">
            <Text className="font-body text-text-secondary">Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
```

### 6.5 Notification Center Screen

```typescript
// mobile/app/(parent)/notifications/index.tsx
// (Similar screens for teacher, student, admin — same component, different role)
import { View, Text, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { queryClient } from '../../../src/api/queryClient';
import apiClient from '../../../src/api/client';
import { formatRelativeTime, VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';
import { useSchoolStore } from '../../../src/stores/schoolStore';
import type { AppNotification } from '@vitana/shared-types';

const TYPE_ICONS: Record<string, string> = {
  'fee_due': 'credit-card', 'fee_overdue': 'alert-circle', 'fee_payment_confirmed': 'check-circle',
  'attendance_absent': 'calendar', 'result_published': 'award', 'new_announcement': 'bell',
  'leave_approved': 'check', 'leave_rejected': 'x', 'new_message': 'message-square',
  'assignment_graded': 'edit-3', 'billing_expiry_warning': 'alert-triangle',
};

export default function NotificationCenter() {
  const { branding } = useSchoolStore();
  const primaryColor = branding?.primaryColor ?? VITANA_DESIGN_TOKENS.colors.primary;

  const { data, fetchNextPage, hasNextPage, isLoading, refetch, isRefetching } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get('/notifications', { params: { page: pageParam, pageSize: 20 } }),
    getNextPageParam: (lastPage: any) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 30 * 1000,
  });

  const markAllRead = useMutation({
    mutationFn: () => apiClient.put('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const allNotifications: AppNotification[] = data?.pages.flatMap((p: any) => p.items) ?? [];
  const unreadCount = allNotifications.filter(n => !n.isRead).length;

  function handleTap(notification: AppNotification) {
    // Mark as read
    apiClient.put(`/notifications/${notification.id}/read`).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['notifications'] });

    // Navigate via deep link
    if (notification.deepLinkUrl) {
      router.push(notification.deepLinkUrl as any);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-border bg-white">
        <Text className="font-heading text-xl text-text-primary">Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <Text className="font-body text-sm" style={{ color: primaryColor }}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={allNotifications}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading ? null : (
            <View className="flex-1 items-center justify-center py-16">
              <Feather name="bell-off" size={40} color={VITANA_DESIGN_TOKENS.colors.textSecondary} />
              <Text className="font-heading text-base text-text-primary mt-4">No notifications</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleTap(item)}
            className={`px-4 py-4 border-b border-border flex-row items-start ${!item.isRead ? 'bg-primary/5' : 'bg-white'}`}
            activeOpacity={0.7}
          >
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mr-3 mt-0.5"
              style={{ backgroundColor: !item.isRead ? primaryColor + '20' : '#f1f5f9' }}
            >
              <Feather
                name={(TYPE_ICONS[item.type] ?? 'bell') as any}
                size={18}
                color={!item.isRead ? primaryColor : VITANA_DESIGN_TOKENS.colors.textSecondary}
              />
            </View>
            <View className="flex-1">
              <View className="flex-row items-start justify-between">
                <Text className={`font-body-${!item.isRead ? 'semibold' : 'medium'} text-text-primary flex-1 mr-2`}>
                  {item.title}
                </Text>
                {!item.isRead && <View className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: primaryColor }} />}
              </View>
              <Text className="font-body text-text-secondary text-sm mt-0.5" numberOfLines={2}>
                {item.body}
              </Text>
              <Text className="font-body text-text-secondary text-xs mt-1">
                {formatRelativeTime(item.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
```

---

## PHASE 7: AI/ML Integration

> Not applicable.

---

## PHASE 8: External Integrations

### Firebase app.config.js Plugin

```javascript
// mobile/app.config.js — add to plugins array:
'@react-native-firebase/app',
['expo-notifications', {
  icon: `${assetBase}/notification-icon.png`,
  color: school.colors.primary,
  sounds: ['./assets/sounds/notification.wav'],
  androidMode: 'default',
  androidCollapsedTitle: 'Vitana SMS',
}],

// android section — add:
googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',

// ios section — add:
googleServicesFile: process.env.GOOGLE_SERVICES_INFO_PLIST || './GoogleService-Info.plist',
```

### Install Firebase Package

```bash
cd mobile
pnpm add @react-native-firebase/app @react-native-firebase/messaging
# Note: These require a dev build (not Expo Go)
# Build dev client after adding: eas build --platform all --profile development
```

---

## PHASE 9: Testing & Validation

### 9.1 Tests

```typescript
// mobile/src/notifications/__tests__/handler.test.ts
import { DEEP_LINKS } from '../handler';

describe('notification deep links', () => {
  it('fee_overdue links to fees', () => {
    expect(DEEP_LINKS['fee_overdue']({})).toBe('/(parent)/fees');
  });
  it('attendance_absent includes studentId', () => {
    expect(DEEP_LINKS['attendance_absent']({ studentId: 'abc' }))
      .toBe('/(parent)/attendance/abc');
  });
  it('all 15+ types have entries', () => {
    const requiredTypes = [
      'fee_due', 'fee_overdue', 'attendance_absent', 'result_published',
      'new_announcement', 'leave_approved', 'assignment_graded', 'new_message',
    ];
    requiredTypes.forEach(type => {
      expect(DEEP_LINKS[type]).toBeDefined();
    });
  });
});
```

### 9.2 Validation Checklist

- [ ] Push notification received when backend sends (test with Postman → backend → device)
- [ ] `MobileDeviceTokens` table has row after login (check via Sentry or DB query)
- [ ] Tapping notification → correct screen opens (test all 5 key types manually)
- [ ] Killed app tap: force-quit app → receive notification → tap → correct screen
- [ ] Permission rationale shown on first login (not on second login)
- [ ] Notification center shows unread items in bold / blue dot
- [ ] "Mark all read" clears badge immediately
- [ ] Preference toggle: disable "Diary Updates" → backend updated (check API call in DevTools)

### Note on Testing Push on Simulators

> **Important**: Push notifications **do not work on iOS simulators** or **Android emulators without Google Play Services**. Use physical devices for push testing. Use a real device connected via USB for this sprint's testing.

---

## PHASE 10: Documentation & Verification

### Verification Commands

```bash
# Build a dev client (required — push doesn't work in Expo Go)
cd mobile && eas build --platform all --profile development

# Install on devices and scan QR code from Metro

# Test push delivery manually:
# 1. Backend: POST /api/fees/mark-overdue or trigger any event
# 2. Physical device should receive push within 5 seconds
```

### Git Commit

```bash
git add .
git commit -m "feat(mobile/push): push notifications for all roles

- Firebase SDK configured (FCM + APNS unified)
- Device token registration on login with rotation handling
- Foreground/background/killed-app notification handling
- Deep link routing for 15+ notification types
- Notification center screen (bell icon + list + mark read)
- Permission rationale modal (shown once before system dialog)
- Silent push for background cache invalidation
- PushPermissionRationale component
- Backend: Firebase Admin SDK + register-device endpoint

Next: PROMPT-06 (White Label) or PROMPT-08 (Student Portal)"
```

---

**END OF PROMPT-05**
