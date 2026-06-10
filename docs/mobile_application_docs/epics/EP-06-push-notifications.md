# EP-06: Push Notifications

> **Epic ID:** EP-06  
> **Priority:** P0  
> **Estimated Sprints:** 2  
> **Phase:** 2 — Sprint 10  
> **Related Docs:** [09-push-notification-architecture](../09-push-notification-architecture.md) · [PROMPT-05](../12-cursor-prompts/PROMPT-05-push-notifications.md)

---

## Business Objective

Push notifications are the mechanism that converts the Vitana mobile app from a "when I think of it" check-in tool into an "always-on school communication channel." A parent who receives a push notification when their child is absent — and can tap it to see attendance details — is actively engaged. That engagement drives daily active users, platform stickiness, and word-of-mouth adoption in schools.

**Expected impact:**
- 30%+ increase in daily active users (notification-driven opens).
- Parent response time to fee due reminders drops from days to hours.
- Announcements readership increases from ~20% (web) to ~60%+ (push-driven mobile).

## Technical Objective

Integrate Firebase Cloud Messaging (FCM) and Apple Push Notification Service (APNS) via the Firebase unified SDK, implement device token registration and rotation, build the notification center UI, deep-link every notification type to the relevant screen, and implement per-user notification preferences.

---

## Current State Analysis

**Backend:** `NotificationService` saves to `Notifications` table (in-app only). No Firebase Admin SDK. No `MobileDeviceTokens` table. No push delivery.

**Mobile:** No push notification configuration exists.

**What needs to be built:**
- Firebase Admin SDK in the .NET backend.
- `MobileDeviceTokens`, `NotificationDeliveryLog`, `UserNotificationPreferences` tables (migration).
- Push delivery wired into `NotificationService.CreateNotificationAsync()`.
- Expo Notifications + Firebase Messaging on mobile.
- Device token registration flow.
- Notification handler, deep link router, notification center.

---

## Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | Android push notifications via FCM |
| FR-2 | iOS push notifications via APNS (through Firebase unified) |
| FR-3 | Device token registered with backend on first login |
| FR-4 | Token refresh handled automatically (FCM rotates tokens) |
| FR-5 | Multi-device support: one user on phone + tablet |
| FR-6 | Foreground notifications show as in-app banner |
| FR-7 | Background/quit-state notifications show in system tray |
| FR-8 | Tapping notification deep-links to relevant screen |
| FR-9 | Killed-app tap: app opens and navigates to correct screen |
| FR-10 | Notification center with all notifications listed |
| FR-11 | Unread count badge on notification bell icon |
| FR-12 | Mark individual notification as read |
| FR-13 | Mark all as read |
| FR-14 | Per-type notification preference toggles |
| FR-15 | Permission rationale screen shown before system dialog |
| FR-16 | Silent push triggers background TanStack Query cache invalidation |
| FR-17 | Delivery tracking in `NotificationDeliveryLog` |
| FR-18 | Tenant isolation: notifications never cross school boundaries |

---

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | Push notification delivered within 5 seconds of backend event |
| NFR-2 | Delivery rate ≥ 95% (excluding user-disabled notifications) |
| NFR-3 | Device token registration completes in < 2 seconds |
| NFR-4 | Notification tap-to-navigate in < 500ms |
| NFR-5 | Stale FCM tokens (> 90 days inactive) auto-cleaned by Hangfire job |

---

## Notification Categories & Deep Links

### Parent Notifications

| Type Key | Trigger | Priority | Deep Link |
|---|---|---|---|
| `fee_due` | N days before due date | High | `/(parent)/fees` |
| `fee_overdue` | Past due date | Urgent | `/(parent)/fees` |
| `fee_payment_confirmed` | Cashfree webhook success | Normal | `/(parent)/fees/receipt/{id}` |
| `attendance_absent` | Child marked absent | High | `/(parent)/attendance/{studentId}` |
| `attendance_shortage` | Attendance < threshold% | High | `/(parent)/attendance/{studentId}` |
| `result_published` | Admin publishes exam result | Normal | `/(parent)/results/{studentId}` |
| `report_card_ready` | Report card generated | Normal | `/(parent)/results/{studentId}` |
| `new_announcement` | New announcement posted | Normal | `/(parent)/announcements/{id}` |
| `new_diary_entry` | Teacher posts diary | Low | `/(parent)/diary/{studentId}` |
| `leave_approved` | Leave request approved | Normal | `/(parent)/leaves` |
| `leave_rejected` | Leave request rejected | Normal | `/(parent)/leaves` |
| `assignment_graded` | Child's submission graded | Normal | `/(parent)/assignments/{id}` |
| `new_message` | Teacher sends message | High | `/(parent)/messages/{conversationId}` |

### Teacher Notifications

| Type Key | Trigger | Priority | Deep Link |
|---|---|---|---|
| `leave_request_received` | Student/parent applies | Normal | `/(teacher)/leaves` |
| `leave_approved` | Own leave approved | Normal | `/(teacher)/leaves` |
| `leave_rejected` | Own leave rejected | Normal | `/(teacher)/leaves` |
| `new_announcement` | School announcement | Normal | `/(teacher)/announcements/{id}` |
| `submission_received` | Student submits assignment | Low | `/(teacher)/assignments/{id}` |
| `new_message` | Parent sends message | High | `/(teacher)/messages/{conversationId}` |
| `timetable_change` | Substitution assigned | High | `/(teacher)/timetable` |

### Student Notifications

| Type Key | Trigger | Priority | Deep Link |
|---|---|---|---|
| `assignment_created` | Teacher creates assignment | Normal | `/(student)/assignments/{id}` |
| `assignment_graded` | Teacher grades submission | Normal | `/(student)/assignments/{id}` |
| `result_published` | Result published | Normal | `/(student)/results/{examId}` |
| `leave_approved` | Leave request approved | Normal | `/(student)/leaves` |
| `leave_rejected` | Leave rejected | Normal | `/(student)/leaves` |
| `new_announcement` | School announcement | Normal | `/(student)/announcements/{id}` |

### Admin Notifications

| Type Key | Trigger | Priority | Deep Link |
|---|---|---|---|
| `leave_request_received` | Staff leave application | Normal | `/(admin)/approvals` |
| `billing_expiry_warning` | 30/15/7 days before expiry | Urgent | `/(admin)/settings/billing` |
| `billing_expired` | Subscription expired | Urgent | `/(admin)/settings/billing` |
| `new_admission` | New application submitted | Normal | `/(admin)/admissions` |
| `daily_attendance_summary` | 4 PM digest | Low | `/(admin)/reports` |

---

## Backend Architecture

### New Database Tables

```sql
MobileDeviceTokens (AppDbContext)
  Id UUID PK
  UserId UUID FK → UserLogins
  SchoolId UUID
  DeviceToken NVARCHAR(500)
  Platform NVARCHAR(10)   -- 'android' | 'ios'
  DeviceId NVARCHAR(200)
  AppVersion NVARCHAR(20)
  IsActive BIT
  LastActiveAt DATETIME2
  RegisteredAt DATETIME2
  UNIQUE (UserId, DeviceId)

NotificationDeliveryLog (AppDbContext)
  Id UUID PK
  NotificationId UUID FK → Notifications
  DeviceTokenId UUID FK → MobileDeviceTokens
  Status NVARCHAR(20)     -- 'queued' | 'sent' | 'delivered' | 'failed' | 'opened'
  SentAt DATETIME2
  FcmMessageId NVARCHAR(200)
  FailureReason NVARCHAR(500)

UserNotificationPreferences (AppDbContext)
  UserId UUID (composite PK)
  NotificationType NVARCHAR(50) (composite PK)
  PushEnabled BIT DEFAULT 1
  InAppEnabled BIT DEFAULT 1
  UpdatedAt DATETIME2
```

### Firebase Admin SDK Integration

Initialize `FirebaseApp.Create()` in `Program.cs` using service account JSON from config key `Firebase:ServiceAccountJsonPath`. Inject `FirebaseMessaging` as singleton.

Extend `NotificationService.CreateAndPushAsync()` to:
1. Retrieve active `MobileDeviceTokens` for target user(s).
2. Check `UserNotificationPreferences.PushEnabled` for the notification type.
3. Build FCM `Message` with `Notification`, `Data`, `Android`, and `Apns` config.
4. Call `FirebaseMessaging.DefaultInstance.SendAsync(message)`.
5. Log to `NotificationDeliveryLog`.
6. On invalid token error → mark `IsActive = false`.

### Hangfire Cleanup Job

`MobileDeviceTokenCleanupJob` — weekly, removes tokens where `LastActiveAt < 90 days ago`.

---

## Mobile Architecture

### Permission Flow

```
Post-login (first time only):
  → Show rationale bottom sheet
  → User taps "Allow"
  → System permission dialog
  → On granted: register token
  → On denied: store 'push_permission_denied', don't ask again
  → Settings screen: "Enable Notifications" link to system settings
```

### Token Lifecycle

```
App install + login
  → Notifications.requestPermissionsAsync()
  → Granted: Notifications.getDevicePushTokenAsync()
  → POST /api/notifications/register-device
  → Store token in SecureStore (for refresh detection)

FCM token rotation (FCM rotates periodically):
  → Notifications.addPushTokenListener()
  → On new token: re-register with backend

App uninstall or logout:
  → POST /api/notifications/unregister-device (optional, best-effort)
  → Backend marks token IsActive=false on next delivery failure
```

### Notification Handler

```typescript
// Foreground: show in-app banner
Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowAlert: true,
    shouldPlaySound: ['high', 'urgent'].includes(
      notification.request.content.data?.priority
    ),
    shouldSetBadge: true,
  }),
});

// Background tap: navigate
Notifications.addNotificationResponseReceivedListener((response) => {
  const { notificationType, ...data } = response.notification.request.content.data;
  const deepLinkFn = notificationDeepLinks[notificationType];
  if (deepLinkFn) router.push(deepLinkFn(data));
  // Also: mark notification as opened in backend
  notificationsApi.markOpened(data.notificationId);
});

// App was killed - check last notification on startup
Notifications.getLastNotificationResponseAsync().then((response) => {
  if (response) { /* navigate as above */ }
});
```

### Silent Push (Background Sync Trigger)

No visible notification. Used to trigger TanStack Query cache invalidation when server data changes.

```
FCM silent payload:
{
  "data": {
    "type": "silent_sync",
    "resource": "attendance",
    "schoolId": "..."
  }
}

Mobile handler:
  → queryClient.invalidateQueries({ queryKey: [resource] })
```

---

## Notification Center UI

```
Notification Center (/(role)/notifications/)
├── Header: "Notifications" | [Mark All Read]
├── Infinite scroll list
│   ├── [Blue dot] 2 hours ago
│   │   📅 Attendance Alert
│   │   "Aarav was marked Absent today"
│   ├── ─────── Yesterday ──────────────
│   ├── 💰 Fee Reminder
│   │   "₹12,500 fee is due in 3 days"
│   └── ...
```

Each item:
- Left: type icon (colored by category).
- Body: title (bold if unread), message text, relative timestamp.
- Blue dot on left if unread.
- Tap → navigate to deep link + mark as read.
- Long press → "Mark Read" / "Delete" action menu.

---

## Notification Preferences UI

```
Notification Settings (/(role)/profile/notifications)
├── Fee & Payments
│   ├── Fee Due Reminders          [ON]
│   └── Payment Confirmations      [ON]  (cannot disable)
├── Attendance
│   ├── Absence Alerts             [ON]
│   └── Attendance Shortage        [ON]
├── Academics
│   ├── Result Published           [ON]
│   └── Assignment Graded          [ON]
├── Communication
│   ├── New Announcements          [ON]
│   ├── Diary Updates              [OFF]
│   └── Direct Messages            [ON]  (cannot disable)
└── Leaves
    └── Leave Status Updates       [ON]
```

---

## User Stories

| ID | Story | SP |
|---|---|---|
| EP-06-US-01 | Device token registration (backend + mobile) | 3 |
| EP-06-US-02 | Firebase Admin integration in backend | 5 |
| EP-06-US-03 | Push delivery on all parent notification events | 5 |
| EP-06-US-04 | Push delivery on teacher and student events | 3 |
| EP-06-US-05 | Receive and deep-link from push notification | 5 |
| EP-06-US-06 | Notification center screen | 5 |
| EP-06-US-07 | Notification preferences screen | 3 |
| EP-06-US-08 | Permission rationale flow | 2 |
| EP-06-US-09 | Silent push for background sync | 2 |

**Total:** 33 story points / 2 sprints

---

## Acceptance Criteria

- [ ] FCM token stored in `MobileDeviceTokens` table after login.
- [ ] Push notification sent within 5 seconds of fee being marked overdue.
- [ ] Tapping "attendance_absent" notification navigates to correct child's attendance.
- [ ] Notification center shows all notifications with correct read/unread state.
- [ ] "Mark All Read" clears unread count.
- [ ] Notification preferences toggles persist across app restarts.
- [ ] Killed-app tap navigates correctly (tested on Android and iOS physical devices).
- [ ] Delivery rate > 95% for active tokens (verified in NotificationDeliveryLog).
- [ ] Stale token (returned 404 by FCM) marked inactive and not retried.
- [ ] Permission rationale shown exactly once per install.

---

## Sprint Breakdown

| Sprint | Scope |
|---|---|
| Sprint 10 (backend) | Firebase Admin SDK, new DB tables, push delivery in NotificationService |
| Sprint 10 (mobile) | Device registration, FCM SDK, notification handler, deep links, notification center |
| Sprint 11 | Notification preferences, silent push, permission rationale, cleanup job |

---

## Monitoring

| Metric | Target | Alert Threshold |
|---|---|---|
| Push delivery rate | > 95% | < 90% → Sentry alert |
| Notification open rate | > 30% | < 15% → investigate |
| Invalid token rate | < 5% | > 10% → FCM token hygiene issue |
| Notification center open rate | > 50% daily | Amplitude tracking |
