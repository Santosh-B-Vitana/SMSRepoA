# PROMPT-11: Backend Mobile API Gaps Implementation

> **Prompt ID:** PROMPT-11  
> **Epic:** Multiple — Backend prerequisites for mobile  
> **Phase:** 1–2 — Sprints 3, 7, 9, 14  
> **Estimated Story Points:** 28  
> **Prerequisites:** Existing backend codebase; understanding of `03-api-analysis.md`  
> **Related Architecture Docs:** [03-api-analysis](../03-api-analysis.md) · [06-mobile-architecture](../06-mobile-architecture.md)

---

## Context

This prompt is for the **backend team** to implement the missing API endpoints that mobile requires. These must be built in parallel with mobile development to avoid blocking.

Read `docs/mobile_application_docs/03-api-analysis.md` Section 4 (API Gap Analysis) completely.

---

## Requirements

### 1. Parent Dashboard Aggregation Endpoint

**Must be ready:** Sprint 3

```csharp
// New controller: Controllers/Mobile/MobileParentDashboardController.cs
// Route: GET /api/mobile/parent-dashboard
// Auth: Role=Parent (linkedEntityId = guardianId)

[HttpGet("parent-dashboard")]
[Authorize(Roles = "Parent")]
public async Task<IActionResult> GetParentDashboard()
{
    // 1. Get children: IStudentService.GetStudentsByGuardianAsync(guardianId)
    // 2. For primary child (first child or user-selected):
    //    - Today's attendance: IAttendanceService.GetTodayAttendanceAsync(studentId)
    //    - Fee summary: IFeeService.GetStudentFeeSummaryAsync(studentId) 
    //    - Latest result: IExaminationService.GetLatestResultAsync(studentId)
    //    - Latest announcement: IAnnouncementService.GetLatestForParentAsync(guardianId)
    //    - Unread notification count: INotificationService.GetUnreadCountAsync(userId)
    // 3. Return aggregated DTO (all data in one response)
    
    // Response DTO:
    // { children, selectedChild, todayAttendance, feeSummary, 
    //   latestResult, latestAnnouncement, unreadCount }
}
```

**Performance requirement:** Total API response time < 500ms (parallel async calls).

### 2. Teacher Dashboard Aggregation Endpoint

**Must be ready:** Sprint 7

```csharp
// Route: GET /api/mobile/teacher-dashboard
// Auth: Role=Teacher,Staff,Principal

// Returns:
// { todaySchedule, pendingLeaveCount, classesStatus (which are marked today),
//   unreadNotificationCount, pendingAssignmentSubmissions }
```

### 3. Student Dashboard Aggregation Endpoint

**Must be ready:** Sprint 9

```csharp
// Route: GET /api/mobile/student-dashboard
// Auth: Role=Student

// Returns:
// { todaySchedule, attendanceThisMonth, latestResult, 
//   dueSoonAssignments, latestAnnouncement, unreadCount }
```

### 4. Admin Dashboard Aggregation Endpoint

**Must be ready:** Sprint 14

```csharp
// Route: GET /api/mobile/admin-dashboard
// Auth: Role=Admin,Principal

// Returns:
// { todayAttendanceRate, todayFeeCollection, pendingApprovals,
//   billingAlert, recentAnnouncements, unreadCount }
```

### 5. App Configuration Endpoint

**Must be ready:** Sprint 2

```csharp
// Route: GET /api/mobile/app-config
// Auth: Any authenticated role
// Cache: Redis 5 minutes per schoolId+userId

// Returns: Full AppConfig as defined in 07-feature-flag-architecture.md Section 5
```

**Implementation notes:**
- Build `MobileAppConfigService` implementing `IMobileAppConfigService`.
- Read from `SchoolFeaturePermissions` (existing) + `MobileFeatureFlags` (new table).
- Include `rolePermissions` based on the user's role.
- Include `versionRequirements` from `MobileAppConfiguration` table.

### 6. Mobile Device Token Registration

**Must be ready:** Sprint 10

```csharp
// Route: POST /api/notifications/register-device
// Auth: Any authenticated role
// Body: { nativeToken, platform, deviceId, appVersion }

// Upsert into MobileDeviceTokens table:
//   - If (UserId, DeviceId) exists: update token + LastActiveAt + AppVersion
//   - Else: insert new record
// Mark old tokens for same user + different deviceId as IsActive=false
// (Users should have max 2 active devices)
```

### 7. Mobile Cashfree Payment Initiation

**Must be ready:** Sprint 4

```csharp
// Route: POST /api/fees/payments/mobile-initiate
// Auth: Role=Parent,Student

// Behavior:
// 1. Validate student belongs to current user (parent: check guardian-student link)
// 2. Calculate amount (or use client-provided amount with validation)
// 3. Create Cashfree order via IPaymentGatewayService
// 4. Return: { cfOrderId, paymentSessionId, amount, currency }
//    paymentSessionId is used by Cashfree React Native SDK

// Existing: POST /api/fees/payments/gateway/initiate (web redirect flow)
// New:      POST /api/fees/payments/mobile-initiate (SDK session flow)
```

### 8. Notification Preferences

**Must be ready:** Sprint 10

```csharp
// Route: GET /api/notifications/preferences
// Route: PUT /api/notifications/preferences/{notificationType}
// Auth: Any authenticated role
// Body (PUT): { pushEnabled: bool, emailEnabled: bool }

// Upsert into UserNotificationPreferences table
// Return: all preferences for current user
```

### 9. Student Minimal List Query

**Must be ready:** Sprint 7

Add `?minimal=true` support to `GET /api/students`:

```csharp
// When minimal=true, return only: id, firstName, lastName, rollNumber, 
//   profilePhotoUrl, classId, sectionId, gender
// Not: address, parent details, documents, fee history, etc.
// This reduces payload from ~2KB per student to ~200 bytes
// Critical for teacher's class attendance screen (40 students)
```

### 10. Firebase Push Delivery in NotificationService

**Must be ready:** Sprint 10

Extend existing `NotificationService.CreateNotificationAsync()`:

```csharp
// After saving to Notifications table:
// 1. Get active device tokens: MobileDeviceTokens WHERE UserId=X AND IsActive=true
// 2. Check UserNotificationPreferences.PushEnabled for this notification type
// 3. If enabled and tokens exist:
//    foreach token: await FirebaseMessaging.DefaultInstance.SendAsync(message)
// 4. Log delivery status in NotificationDeliveryLog
// 5. Handle FCM errors: invalid token → mark MobileDeviceToken.IsActive=false

// Firebase Admin SDK: FirebaseAdmin NuGet package
// Initialize in Program.cs using service account JSON from config
```

---

## Implementation Order

| Endpoint | Sprint | Blocker For |
|---|---|---|
| `GET /api/mobile/app-config` | 2 | All mobile features |
| `GET /api/mobile/parent-dashboard` | 3 | Parent App dashboard |
| `POST /api/fees/payments/mobile-initiate` | 4 | Fee payment |
| `GET /api/mobile/teacher-dashboard` | 7 | Teacher App dashboard |
| `GET /api/students?minimal=true` | 7 | Teacher attendance screen |
| `GET /api/mobile/student-dashboard` | 9 | Student App dashboard |
| `POST /api/notifications/register-device` | 10 | Push notifications |
| `GET/PUT /api/notifications/preferences` | 10 | Notification preferences |
| Firebase push delivery | 10 | Push notifications |
| `GET /api/mobile/admin-dashboard` | 14 | Admin App dashboard |

---

## Acceptance Criteria

- [ ] `GET /api/mobile/app-config` returns within 200ms (Redis cached after first call).
- [ ] Parent dashboard returns all 6 data points in one response, < 500ms.
- [ ] `GET /api/students?classId=X&minimal=true` returns < 100 bytes per student.
- [ ] Mobile Cashfree initiation returns `paymentSessionId` compatible with Cashfree RN SDK.
- [ ] Push notification sent within 5 seconds of event (e.g., fee marked overdue).
- [ ] Invalid FCM tokens removed from DB after first failed delivery.
- [ ] Device registration is idempotent (calling twice with same `deviceId` doesn't duplicate).

---

## Testing Requirements

- Unit: `MobileAppConfigService.GetAppConfigAsync()` — all resolution priorities.
- Unit: `PaymentGatewayService` mobile initiation path.
- Integration: `POST /api/notifications/register-device` → verify DB record created.
- Integration: `GET /api/mobile/parent-dashboard` → verify all 6 data points returned.
- Load test: 100 concurrent `GET /api/mobile/app-config` calls → Redis cache hit rate.

---

## Definition of Done

- [ ] All endpoints return correct data for authenticated test users.
- [ ] All endpoints have Swagger documentation.
- [ ] Performance targets met (< 500ms for dashboard endpoints).
- [ ] Push delivery tested end-to-end with physical device.
- [ ] Database migrations applied to staging.
- [ ] Peer review complete.
