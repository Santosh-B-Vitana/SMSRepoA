# PROMPT-05: Push Notifications Implementation

> **Prompt ID:** PROMPT-05  
> **Epic:** EP-06 — Push Notifications  
> **Phase:** 2 — Sprint 10  
> **Estimated Story Points:** 16  
> **Prerequisites:** PROMPT-01, PROMPT-02 complete; Backend push delivery service built  
> **Related Architecture Docs:** [09-push-notification-architecture](../09-push-notification-architecture.md)

---

## Context

The Parent and Teacher apps are in beta. Add push notifications to deliver real-time alerts. This is the feature that converts the app from "useful to check" to "actively drives engagement."

**Backend requirements (must be built by backend team in Sprint 9):**
- Firebase Admin SDK integrated into `NotificationService`.
- `POST /api/notifications/register-device` → accepts `{ nativeToken, platform, deviceId, appVersion }`.
- Push delivery on: fee due, absent marking, result published, leave approved/rejected.
- `GET /api/notifications/preferences` and `PUT /api/notifications/preferences/{type}`.

**Firebase setup required before Sprint 10:**
- Firebase project created.
- Android app (`com.vitana.sms`) registered in Firebase project.
- iOS app registered.
- `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) available as secrets.

---

## Requirements

### 1. Firebase Setup in Expo

Install `@react-native-firebase/app` and `@react-native-firebase/messaging` via Expo's Firebase plugin.

Configure in `app.config.js`:
```javascript
plugins: [
  '@react-native-firebase/app',
  ['expo-notifications', {
    icon: './assets/notification-icon.png',
    color: '#1a6fd8',
    sounds: ['./assets/sounds/notification.wav'],
  }],
],
android: {
  googleServicesFile: process.env.GOOGLE_SERVICES_JSON_PATH || './google-services.json',
},
ios: {
  googleServicesFile: process.env.GOOGLE_SERVICES_INFO_PLIST_PATH || './GoogleService-Info.plist',
}
```

### 2. Notification Handler (`src/notifications/handler.ts`)

Configure `Notifications.setNotificationHandler()` as described in architecture doc Section 7.

Handle:
- **Foreground notifications:** Show in-app banner (Notifications handler returns `shouldShowAlert: true`).
- **Background/quit notifications:** System handles display; set up `getLastNotificationResponseAsync()` on app start.

Sound: play notification sound only for `High` and `Urgent` priority.

### 3. Device Token Registration (`src/notifications/registration.ts`)

```typescript
export async function registerForPushNotifications() {
  // 1. Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    // User denied — store preference, don't ask again
    await SecureStore.setItemAsync('push_permission_denied', 'true');
    return;
  }
  
  // 2. Get native FCM/APNS token
  const token = (await Notifications.getDevicePushTokenAsync()).data;
  
  // 3. Register with backend
  await notificationsApi.registerDevice({
    nativeToken: token,
    platform: Platform.OS,
    deviceId: await Application.getIosIdForVendorAsync() || DeviceInfo.getUniqueId(),
    appVersion: Application.nativeApplicationVersion ?? '1.0.0',
  });
  
  // 4. Handle token refresh (FCM rotates tokens)
  Notifications.addPushTokenListener((newToken) => {
    notificationsApi.registerDevice({ nativeToken: newToken.data, ... });
  });
}
```

Call `registerForPushNotifications()` after successful login (not before — must be authenticated).

### 4. Deep Link Routing (`src/notifications/deepLinks.ts`)

Map notification types to app routes:
```typescript
export const notificationDeepLinks: Record<string, (data: Record<string, string>) => string> = {
  'fee_due': (d) => `/(parent)/fees`,
  'fee_overdue': (d) => `/(parent)/fees`,
  'fee_payment_confirmed': (d) => `/(parent)/fees/receipt/${d.paymentId}`,
  'attendance_absent': (d) => `/(parent)/attendance/${d.studentId}`,
  'attendance_shortage': (d) => `/(parent)/attendance/${d.studentId}`,
  'result_published': (d) => `/(parent)/results/${d.studentId}`,
  'new_announcement': (d) => `/(parent)/announcements/${d.announcementId}`,
  'new_diary_entry': (d) => `/(parent)/diary/${d.studentId}`,
  'leave_approved': () => `/(parent)/leaves`,
  'leave_rejected': () => `/(parent)/leaves`,
  'leave_request_received': () => `/(teacher)/leaves`,
  'timetable_change': () => `/(teacher)/timetable`,
  'submission_received': (d) => `/(teacher)/assignments/${d.assignmentId}`,
};
```

Handle notification tap in `setupNotificationHandlers()`:
- When app is killed: use `Notifications.getLastNotificationResponseAsync()` on startup.
- When app is backgrounded: `Notifications.addNotificationResponseReceivedListener()`.
- When foregrounded: `Notifications.addNotificationReceivedListener()`.

### 5. Notification Center Screen

**API:** `GET /api/notifications?page=1&pageSize=20`  
**Route:** `/(parent)/notifications/`, `/(teacher)/notifications/`, etc.

**Layout:**
- Header with "Mark All Read" button.
- Infinite scroll list of notifications.
- Each item: icon (by type), title, body, timestamp (relative: "2 hours ago").
- Unread items have blue dot indicator.
- Tap → navigate to deep-link route AND call `PUT /api/notifications/{id}/read`.

**Unread count badge:**
- Show on tab bar bell icon.
- `useQuery({ queryKey: ['notifications', 'unread-count'], refetchInterval: 60000 })`.
- On foreground push received: increment badge by 1 (optimistic).

### 6. Notification Preferences Screen

**Route:** `/(profile)/notification-preferences`

Toggle list for each notification type. On toggle:
- `PUT /api/notifications/preferences/{type}` with `{ pushEnabled: bool }`.
- Some types (direct messages, payment confirmation) cannot be fully disabled — show info tooltip.

### 7. Permission Rationale

Show a rational screen BEFORE the system permission dialog:

```
"Vitana SMS wants to send you notifications for:
• Your child's attendance updates
• Fee due reminders
• Exam result announcements

You can customise these in settings."

[Allow Notifications]  [Not Now]
```

Show this only ONCE. If user taps "Not Now", don't show the system dialog. Allow them to enable later from settings.

---

## Implementation Tasks

1. Install Firebase + Expo Notifications + configure in `app.config.js`.
2. Implement `src/notifications/handler.ts`.
3. Implement `src/notifications/registration.ts`.
4. Implement `src/notifications/deepLinks.ts`.
5. Implement notification center screens for each role.
6. Implement unread count badge.
7. Implement notification permission rationale screen.
8. Implement notification preferences screen.
9. Wire `registerForPushNotifications()` into post-login flow.
10. Handle killed-app notification tap.
11. Test on physical devices (simulators don't support real push).

---

## Acceptance Criteria

- [ ] FCM token registered with backend on first login (verified in `MobileDeviceTokens` table).
- [ ] Push notification received and displayed when fee is overdue (tested in dev environment).
- [ ] Tapping notification navigates to correct screen (all 10 types).
- [ ] Unread count badge shows on notification bell.
- [ ] "Mark All Read" clears badge.
- [ ] Notification preference toggles persist (verified via API call).
- [ ] Permission rationale screen shown once before system dialog.
- [ ] On iOS: notification appears in system notification center.
- [ ] On Android: notification appears with Vitana icon and correct channel.
- [ ] Killed-app notification tap: app opens on correct screen.

---

## Testing Requirements

- Unit: `notificationDeepLinks[type](data)` → correct route.
- Manual (physical device): Send test notification from backend → receive on device.
- Manual: Kill app → receive notification → tap → app opens on correct screen.
- Manual: Enable/disable notification types → verify backend updated.

---

## Definition of Done

- [ ] All acceptance criteria pass.
- [ ] Tested on physical iPhone (iOS 16+) and Android (API 30+).
- [ ] No notification permission dialog shown before rationale screen.
- [ ] `google-services.json` and `GoogleService-Info.plist` stored as EAS secrets (not committed to git).
