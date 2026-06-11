# Vitana Mobile Platform — Push Notification Architecture

> **Classification:** Internal Architecture Document  
> **Version:** 1.0  
> **Date:** June 2026  
> **Related Docs:** [06-mobile-architecture](./06-mobile-architecture.md) · [07-feature-flag-architecture](./07-feature-flag-architecture.md)

---

## 1. Overview

The Vitana push notification system delivers real-time alerts to parents, students, teachers, and admins across Android (FCM) and iOS (APNS). The architecture is:

- **Unified delivery** — one backend notification service dispatches to both platforms.
- **Tenant-isolated** — notifications never leak across school boundaries.
- **Role-aware** — different notification categories per role.
- **Deep-link native** — every notification routes to the relevant app screen.
- **Preference-respecting** — per-user opt-in/out per notification type.
- **Analytics-tracked** — delivery, open, and conversion tracking.

---

## 2. Technology Stack

| Component | Technology |
|---|---|
| Android push | Firebase Cloud Messaging (FCM) |
| iOS push | Apple Push Notification Service (APNS) via FCM (unified via Firebase) |
| Firebase SDK (mobile) | `@react-native-firebase/messaging` (via Expo Firebase plugin) |
| Backend Firebase admin | `FirebaseAdmin` .NET SDK (`FirebaseAdmin` NuGet) |
| Notification scheduling | Hangfire background jobs |
| Device token storage | `MobileDeviceTokens` table (new) |
| Delivery tracking | `NotificationDeliveryLog` table (new) |
| Preferences | `UserNotificationPreferences` table (new) |

---

## 3. Database Schema

```sql
-- NEW: Device token registry
MobileDeviceTokens
  Id                UNIQUEIDENTIFIER  PRIMARY KEY
  UserId            UNIQUEIDENTIFIER  FK → UserLogins
  SchoolId          UNIQUEIDENTIFIER
  DeviceToken       NVARCHAR(500)     -- FCM registration token
  Platform          NVARCHAR(10)      -- 'android' | 'ios'
  DeviceId          NVARCHAR(200)     -- Device unique ID (Expo deviceId)
  AppVersion        NVARCHAR(20)      -- e.g. "1.2.0"
  IsActive          BIT
  LastActiveAt      DATETIME2
  RegisteredAt      DATETIME2
  UpdatedAt         DATETIME2
  -- Unique: (UserId, DeviceId) to prevent duplicates

-- NEW: Notification delivery log
NotificationDeliveryLog
  Id                UNIQUEIDENTIFIER  PRIMARY KEY
  NotificationId    UNIQUEIDENTIFIER  FK → Notifications
  DeviceTokenId     UNIQUEIDENTIFIER  FK → MobileDeviceTokens
  Status            NVARCHAR(20)      -- 'queued' | 'sent' | 'delivered' | 'failed' | 'opened'
  SentAt            DATETIME2
  DeliveredAt       DATETIME2
  OpenedAt          DATETIME2
  FailureReason     NVARCHAR(500)
  FcmMessageId      NVARCHAR(200)

-- NEW: Per-user notification preferences
UserNotificationPreferences
  UserId            UNIQUEIDENTIFIER  PK (composite)
  NotificationType  NVARCHAR(50)      PK (composite)
  PushEnabled       BIT               DEFAULT 1
  EmailEnabled      BIT               DEFAULT 0
  InAppEnabled      BIT               DEFAULT 1
  UpdatedAt         DATETIME2
```

---

## 4. Notification Categories

### 4.1 Parent Notifications

| Type | Trigger | Priority | Deep Link |
|---|---|---|---|
| `fee_due` | Fee due date approaching (N days before) | High | `/fees?studentId=X` |
| `fee_overdue` | Fee past due date | Urgent | `/fees?studentId=X` |
| `fee_payment_confirmed` | Cashfree payment webhook success | Normal | `/fees/receipt/{id}` |
| `attendance_absent` | Child marked absent | High | `/attendance/{studentId}` |
| `attendance_shortage` | Child below threshold % | High | `/attendance/{studentId}` |
| `result_published` | Exam result published | Normal | `/results/{studentId}` |
| `report_card_ready` | Report card generated | Normal | `/results/{studentId}` |
| `new_announcement` | New school/class announcement | Normal | `/announcements/{id}` |
| `new_diary_entry` | Teacher posts class diary | Low | `/diary/{studentId}` |
| `leave_approved` | Child's leave request approved | Normal | `/leaves` |
| `leave_rejected` | Child's leave request rejected | Normal | `/leaves` |
| `assignment_graded` | Child's submission graded | Normal | `/assignments/{id}` |
| `new_message` | Teacher sends direct message | High | `/messages/{conversationId}` |

### 4.2 Teacher / Staff Notifications

| Type | Trigger | Priority | Deep Link |
|---|---|---|---|
| `leave_request_received` | Staff/student applies for leave | Normal | `/leaves` |
| `leave_approved` | Own leave request approved | Normal | `/leaves` |
| `leave_rejected` | Own leave request rejected | Normal | `/leaves` |
| `new_announcement` | School-wide announcement | Normal | `/announcements/{id}` |
| `submission_received` | Student submits assignment | Low | `/assignments/{id}` |
| `new_message` | Parent sends direct message | High | `/messages/{conversationId}` |
| `timetable_change` | Substitution assigned | High | `/timetable` |

### 4.3 Admin / Principal Notifications

| Type | Trigger | Priority | Deep Link |
|---|---|---|---|
| `leave_request_received` | Staff leave application | Normal | `/approvals/leaves` |
| `billing_expiry_warning` | Subscription expiring in N days | Urgent | `/settings/billing` |
| `billing_expired` | Subscription expired | Urgent | `/settings/billing` |
| `daily_attendance_summary` | 4 PM daily summary | Low | `/reports/attendance` |
| `fee_collection_summary` | Daily fee collection digest | Low | `/reports/fees` |
| `new_admission` | New admission application received | Normal | `/admissions` |

---

## 5. Backend Push Delivery Service

```csharp
// Services/Push/IPushNotificationService.cs
public interface IPushNotificationService
{
    Task SendToUserAsync(Guid userId, PushNotificationPayload payload);
    Task SendToRoleAsync(Guid schoolId, string role, PushNotificationPayload payload);
    Task SendToAllSchoolAsync(Guid schoolId, PushNotificationPayload payload);
    Task SendBulkAsync(IEnumerable<Guid> userIds, PushNotificationPayload payload);
    Task RegisterDeviceAsync(Guid userId, string deviceToken, string platform, string deviceId, string appVersion);
    Task UnregisterDeviceAsync(Guid userId, string deviceId);
    Task<bool> IsNotificationEnabledAsync(Guid userId, string notificationType);
}

public record PushNotificationPayload(
    string Title,
    string Body,
    string NotificationType,
    string? DeepLinkUrl = null,
    Dictionary<string, string>? Data = null,
    NotificationPriority Priority = NotificationPriority.Normal,
    string? ImageUrl = null
);

public enum NotificationPriority { Low, Normal, High, Urgent }
```

```csharp
// Services/Push/FirebasePushNotificationService.cs
// Uses FirebaseAdmin SDK:
// var message = new Message {
//   Token = deviceToken,
//   Notification = new Notification { Title = payload.Title, Body = payload.Body },
//   Data = payload.Data,
//   Android = new AndroidConfig { Priority = AndroidMessagePriority.High },
//   Apns = new ApnsConfig { ... }
// };
// await FirebaseMessaging.DefaultInstance.SendAsync(message);
```

---

## 6. Existing NotificationService Integration

The existing `NotificationService` writes to the `Notifications` table. We extend it to also dispatch push:

```csharp
// Modification to existing NotificationService
public async Task CreateAndPushAsync(CreateNotificationRequest request)
{
    // 1. Save to Notifications table (existing)
    var notification = await SaveNotificationAsync(request);
    
    // 2. Check user preference
    if (!await _pushService.IsNotificationEnabledAsync(request.UserId, request.Type))
        return;
    
    // 3. Dispatch push
    await _pushService.SendToUserAsync(request.UserId, new PushNotificationPayload(
        Title: request.Title,
        Body: request.Body,
        NotificationType: request.Type,
        DeepLinkUrl: request.DeepLinkUrl,
        Data: new Dictionary<string, string> {
            ["notificationId"] = notification.Id.ToString(),
            ["schoolId"] = request.SchoolId.ToString()
        }
    ));
}
```

---

## 7. Mobile Push Handler

```typescript
// src/notifications/handler.ts
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { notificationDeepLinks } from './deepLinks';

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowAlert: true,
    shouldPlaySound: notification.request.content.data?.priority === 'high',
    shouldSetBadge: true,
  }),
});

// Handle notification tap (background/quit)
export function setupNotificationHandlers() {
  // Received while app is foregrounded
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      // Refresh relevant query cache based on notification type
      const type = notification.request.content.data?.notificationType;
      invalidateCacheForNotificationType(type);
    }
  );
  
  // Tapped — navigate to deep link
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      const notificationType = data?.notificationType as string;
      const deepLinkFn = notificationDeepLinks[notificationType];
      if (deepLinkFn) {
        const route = deepLinkFn(data);
        router.push(route);
      }
    }
  );
  
  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}
```

---

## 8. Device Token Registration

```typescript
// src/notifications/registration.ts
export async function registerForPushNotifications(userId: string) {
  // 1. Request permissions
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  
  // 2. Get Expo push token (wraps FCM/APNS token)
  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  })).data;
  
  // 3. Also get native FCM token for direct backend use
  const nativeToken = (await Notifications.getDevicePushTokenAsync()).data;
  
  // 4. Register with backend
  await notificationsApi.registerDevice({
    expoToken: token,
    nativeToken: nativeToken,
    platform: Platform.OS,
    deviceId: await getDeviceId(),
    appVersion: Application.nativeApplicationVersion,
  });
}
```

---

## 9. Notification Preferences Screen

Users can opt out of individual notification types:

```
Notification Settings
├── Fee Reminders              [ON]  Toggle
├── Attendance Alerts          [ON]  Toggle
├── Exam Results               [ON]  Toggle
├── Announcements              [ON]  Toggle
├── Diary Updates              [OFF] Toggle
├── Assignment Graded          [ON]  Toggle
└── Direct Messages            [ON]  Toggle (cannot fully disable)
```

On toggle:
```typescript
await notificationsApi.updatePreferences({
  notificationType: 'diary_update',
  pushEnabled: false,
  inAppEnabled: true,  // In-app always stays on
});
```

---

## 10. Tenant Isolation

Push notification tenant isolation is enforced at multiple layers:

1. **Database:** `MobileDeviceTokens` has `SchoolId`. Queries always filter by `SchoolId`.
2. **Service:** `SendToRoleAsync` filters device tokens by `SchoolId`.
3. **JWT claims:** `SchoolId` in JWT validates that the requesting user belongs to the school.
4. **Audit:** Every push send is logged with `SchoolId` in `NotificationDeliveryLog`.

A parent at School A can never receive a notification intended for School B.

---

## 11. Silent Push (Background Sync Trigger)

When the server has new data (e.g., attendance has been updated), it can send a **silent push** to trigger background data refresh:

```csharp
// Silent push payload (no title/body — no visible notification)
var message = new Message {
  Token = deviceToken,
  Data = new Dictionary<string, string> {
    ["type"] = "silent_sync",
    ["resource"] = "attendance",
    ["schoolId"] = schoolId.ToString()
  },
  Android = new AndroidConfig { Priority = AndroidMessagePriority.Normal },
  Apns = new ApnsConfig {
    Headers = new Dictionary<string, string> {
      ["apns-push-type"] = "background",
      ["apns-priority"] = "5"
    },
    Aps = new Aps { ContentAvailable = true }
  }
};
```

Mobile handles:
```typescript
// Background fetch handler for silent push
Notifications.addNotificationReceivedListener((notification) => {
  if (notification.request.content.data?.type === 'silent_sync') {
    const resource = notification.request.content.data.resource;
    queryClient.invalidateQueries({ queryKey: [resource] });
  }
});
```

---

## 12. WhatsApp Integration Compatibility

The push notification architecture is designed to complement WhatsApp notifications:

| Channel | Used For |
|---|---|
| Push (FCM/APNS) | Real-time, in-app, interactive (taps navigate) |
| WhatsApp | Important parent communications (fee reminders, critical alerts, result summaries) |
| Email | Receipts, formal communications |

The `NotificationService` decision tree:
```
Event occurs (e.g., fee overdue)
    │
    ▼
Is WhatsApp enabled for school AND parent opted in?
    ├── Yes → Send WhatsApp (IWhatsAppService.EnqueueAsync)
    └── No → Send Push (IPushNotificationService.SendToUserAsync)
         └── Always: Create in-app notification (existing)
```

---

## 13. Analytics & Monitoring

| Metric | Collection | Dashboard |
|---|---|---|
| Delivery rate | FCM delivery receipts → `NotificationDeliveryLog` | Admin analytics |
| Open rate | Mobile SDK → `POST /api/notifications/{id}/opened` | Admin analytics |
| Opt-out rate | `UserNotificationPreferences` aggregate | Vitana ops |
| Token staleness | `LastActiveAt` — tokens >90 days old removed | Hangfire cleanup job |
| Failed delivery | `FailureReason` in delivery log | Sentry alert if >5% |

---

*Next: [10-offline-architecture.md](./10-offline-architecture.md)*
