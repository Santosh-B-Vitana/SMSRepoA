# Vitana Mobile Platform — API Analysis

> **Classification:** Internal Architecture Document  
> **Version:** 1.0  
> **Date:** June 2026  
> **Related Docs:** [02-erp-analysis](./02-erp-analysis.md) · [06-mobile-architecture](./06-mobile-architecture.md)

---

## 1. API Foundation

### 1.1 Base URL Pattern

| Environment | Base URL |
|---|---|
| Local development | `http://localhost:5092/api` |
| Staging | `https://api-staging.vitanasms.com/api` |
| Production | `https://api.vitanasms.com/api` |

Mobile apps should use `EXPO_PUBLIC_API_BASE_URL` environment variable per build profile.

### 1.2 Standard Response Envelope

Every successful API response is wrapped by `ApiResponseWrapperMiddleware`:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2026-06-10T17:58:00Z",
  "correlationId": "3f5a9b2d-..."
}
```

Error responses follow RFC 7807 Problem Details:
```json
{
  "type": "https://tools.ietf.org/html/rfc7807",
  "title": "Validation Error",
  "status": 422,
  "detail": "Student not found",
  "traceId": "..."
}
```

Mobile API client must unwrap `.data` from success responses and handle RFC 7807 error format.

### 1.3 Required Headers

| Header | Value | When Required |
|---|---|---|
| `Authorization` | `Bearer <access_token>` | All authenticated endpoints |
| `X-Academic-Year` | `"2025-2026"` | Attendance, exams, fees, timetable queries |
| `Content-Type` | `application/json` | POST/PUT/PATCH with JSON body |
| `X-Correlation-ID` | UUID v4 (client-generated) | All requests (for tracing) |

### 1.4 Pagination Convention

All list endpoints support:
```
GET /api/students?page=1&pageSize=20&search=John&sortBy=name&sortDir=asc
```

Response includes pagination metadata in `data`:
```json
{
  "items": [...],
  "totalCount": 450,
  "page": 1,
  "pageSize": 20,
  "totalPages": 23
}
```

---

## 2. Authentication API

### 2.1 Login Flow

```
POST /api/auth/login
Body: { "username": "parent@school.com", "password": "..." }

Response 200:
{
  "data": {
    "token": "eyJ...",
    "refreshToken": "abc123...",
    "expiration": "2026-06-10T19:00:00Z",
    "user": {
      "id": "guid",
      "username": "parent@school.com",
      "email": "...",
      "role": "Parent",
      "schoolId": "guid",
      "fullName": "Priya Sharma",
      "linkedEntityId": "guardian-guid"
    }
  }
}
```

### 2.2 Token Refresh

```
POST /api/auth/refresh
Body: { "accessToken": "expired-jwt", "refreshToken": "valid-refresh-token" }

Response 200:
{
  "data": {
    "token": "new-eyJ...",
    "refreshToken": "new-refresh-token",
    "expiration": "2026-06-10T21:00:00Z"
  }
}
```

**Mobile strategy:** Use an Axios interceptor (or custom Fetch wrapper) that:
1. Detects 401 responses.
2. Queues the failed request.
3. Calls `/api/auth/refresh` with stored refresh token.
4. Retries all queued requests with the new token.
5. On refresh failure → clear SecureStore → navigate to login screen.

### 2.3 Public Branding (Pre-Login)

```
GET /api/settings/public-branding
No auth required.

Response:
{
  "data": {
    "schoolName": "Delhi Public School",
    "logoUrl": "https://s3.amazonaws.com/.../dps-logo.png",
    "primaryColor": "#1a6fd8"
  }
}
```

Use at login screen startup to display school identity before credentials are entered.

---

## 3. Critical API Endpoints by Mobile Screen

### 3.1 Parent App APIs

| Screen | Method | Endpoint | Notes |
|---|---|---|---|
| Dashboard | GET | `/api/mobile/parent-dashboard` | **TO BUILD** — aggregation endpoint |
| My Children | GET | `/api/students/my-children` | Returns list of linked children |
| Child Attendance | GET | `/api/attendance/students?studentId=X&month=Y` | Monthly attendance |
| Attendance Today | GET | `/api/attendance/students?studentId=X&date=today` | Today's status |
| Fee Summary | GET | `/api/fees/records?studentId=X` | Full fee ledger |
| Pay Fee | POST | `/api/fees/payments/gateway/initiate` | Initiates Cashfree payment |
| Fee Receipt | GET | `/api/fees/payments/{id}/receipt` | PDF download |
| Exam Results | GET | `/api/examinations/results?studentId=X` | Published results |
| Report Card | GET | `/api/examinations/report-cards/{studentId}` | PDF report card |
| Announcements | GET | `/api/announcements?audience=parent` | Filtered announcements |
| Diary | GET | `/api/diary/parent/child/{studentId}` | Class teacher diary |
| Notifications | GET | `/api/notifications` | All notifications |
| Mark Read | PUT | `/api/notifications/{id}/read` | Mark notification read |
| Leave Request | POST | `/api/leavemanagement/student-leave` | Submit leave for child |
| Message Teacher | POST | `/api/communication/messages` | Direct message |

### 3.2 Teacher App APIs

| Screen | Method | Endpoint | Notes |
|---|---|---|---|
| Dashboard | GET | `/api/mobile/teacher-dashboard` | **TO BUILD** |
| Timetable | GET | `/api/timetable/my-schedule` | Teacher's schedule |
| Mark Attendance | POST | `/api/attendance/students/bulk` | Bulk for a class |
| Edit Attendance | PUT | `/api/attendance/students/{id}` | Correct a record |
| Attendance Summary | GET | `/api/attendance/stats?classId=X` | Class stats |
| Enter Marks | PUT | `/api/examinations/results/bulk` | Bulk marks entry |
| My Classes | GET | `/api/academics/teacher-assignments` | Assigned classes |
| Post Diary | POST | `/api/diary` | Class diary entry |
| Assignments | GET | `/api/assignments?teacherId=X` | My assignments |
| Create Assignment | POST | `/api/assignments` | New assignment |
| Grade Submission | PUT | `/api/assignments/{id}/grade/{submissionId}` | Grade student work |
| Leave Requests | GET | `/api/attendance/leave-requests?role=teacher` | Pending leaves |
| Approve Leave | PUT | `/api/attendance/leave-requests/{id}/approve` | Approve leave |
| My Leave | POST | `/api/leavemanagement/leave-requests` | Apply own leave |
| Announcements | GET | `/api/announcements` | Read + create |
| Notifications | GET | `/api/notifications` | Notification feed |

### 3.3 Student App APIs

| Screen | Method | Endpoint | Notes |
|---|---|---|---|
| Dashboard | GET | `/api/mobile/student-dashboard` | **TO BUILD** |
| My Profile | GET | `/api/students/me` | Own profile |
| Timetable | GET | `/api/timetable?classId=X` | Class timetable |
| Attendance | GET | `/api/attendance/my-attendance` | Own attendance |
| Exam Results | GET | `/api/examinations/results?studentId=me` | Own results |
| Result Portal | GET | `/api/examinations/report-cards/{id}` | Report card |
| Assignments | GET | `/api/assignments?studentId=me` | My assignments |
| Submit Assignment | POST | `/api/assignments/{id}/submissions` | File/text submit |
| Fee Summary | GET | `/api/fees/records?studentId=me` | Own fee ledger |
| Leave Request | POST | `/api/attendance/leave-requests` | Apply for leave |
| Library | GET | `/api/library/my-issues` | Issued books |
| Notifications | GET | `/api/notifications` | Notification feed |
| Announcements | GET | `/api/announcements` | School announcements |

### 3.4 Admin App APIs

| Screen | Method | Endpoint | Notes |
|---|---|---|---|
| Dashboard | GET | `/api/mobile/admin-dashboard` | **TO BUILD** |
| Analytics | GET | `/api/analytics/dashboard` | Key metrics |
| Attendance Today | GET | `/api/attendance/stats` | School-wide today |
| Fee Collection | GET | `/api/fees/stats` | Collection summary |
| Staff Leave | GET | `/api/leavemanagement/leave-requests` | All pending |
| Approve Leave | PUT | `/api/leavemanagement/leave-requests/{id}/approve` | Approve |
| Announcements | POST | `/api/announcements` | Create announcement |
| Student List | GET | `/api/students` | With pagination |
| Staff List | GET | `/api/staff` | With pagination |
| Notifications | GET | `/api/notifications` | Notification feed |

---

## 4. API Gap Analysis

### 4.1 Missing Mobile-Specific Endpoints

These endpoints do not exist and must be created before mobile launch:

| Endpoint | Method | Purpose | Priority | Epic |
|---|---|---|---|---|
| `/api/mobile/app-config` | GET | Feature flags + branding in one call | P0 | Feature Flags |
| `/api/mobile/parent-dashboard` | GET | Aggregated parent home data | P0 | Parent App |
| `/api/mobile/teacher-dashboard` | GET | Aggregated teacher home data | P0 | Teacher App |
| `/api/mobile/student-dashboard` | GET | Aggregated student home data | P0 | Student App |
| `/api/mobile/admin-dashboard` | GET | Aggregated admin home data | P1 | Admin App |
| `/api/mobile/offline-bundle` | GET | Sync bundle for offline mode | P1 | Offline Sync |
| `/api/mobile/branding` | GET | Extended branding config | P1 | White Label |
| `/api/notifications/register-device` | POST | FCM/APNS token + platform | P0 | Push Notifications |
| `/api/fees/payments/mobile-initiate` | POST | Mobile-optimized Cashfree initiation | P0 | Fee Module |
| `/api/mobile/feedback` | POST | In-app feedback collection | P2 | Analytics |

### 4.2 Endpoints Needing Optimization

| Endpoint | Issue | Fix |
|---|---|---|
| `GET /api/students` | Returns 50+ fields per student; too heavy for list | Add `?minimal=true` or `fields=id,name,photo` |
| `GET /api/examinations/results` | Some exam setups return nested data not needed on mobile | Add `?simplified=true` projection |
| `GET /api/announcements` | No cursor-based pagination for infinite scroll | Add `?cursor=lastId` support |
| `GET /api/staff` | Full profile data in list responses | Add `?minimal=true` for list contexts |
| `GET /api/fees/records` | Joined data includes full structure history | Add `?summary=true` |

### 4.3 File/Media Handling

| Type | Current API | Mobile Consideration |
|---|---|---|
| Photo upload | `POST /api/students/{id}/photo` (multipart) | React Native image picker → compress before upload |
| Document upload | `POST /api/students/{id}/documents` (multipart) | File size limit: 10 MB (configurable) |
| Document download | `GET /api/documents/{id}/download` | Stream to device storage (Expo FileSystem) |
| PDF (report card) | `GET /api/examinations/report-cards/{id}` | Open with Expo WebBrowser |
| PDF (payslip) | `GET /api/payroll/{id}/payslip` | Same as above |

---

## 5. API Versioning Strategy

The backend uses `Asp.Versioning.Http 8.1`. Current mobile-specific APIs should be versioned:

```
/api/v1/mobile/app-config        (initial)
/api/v2/mobile/app-config        (when breaking changes needed)
```

**Rule:** Never make breaking changes to v1 endpoints once mobile app is live in stores. Stores take 1–3 days for app review. OTA updates can fix logic, but cannot change API contracts if server changes are needed.

**Versioning convention for mobile:**
- Header-based: `X-Api-Version: 2` (preferred for mobile — no URL change needed in stored clients)
- URL-based: `/api/v1/...` (for clarity in documentation)

---

## 6. Caching Strategy

### 6.1 Server-Side Caching (Existing)

| Data | Cache Duration | Cache Key |
|---|---|---|
| School config (domain → DB) | 6 hours | `school_config:{domain}` |
| Feature permissions | Per-request (from JWT) | n/a |
| Public branding | 1 hour | `branding:{schoolId}` |

### 6.2 Mobile-Side Caching (To Implement)

| Data | Strategy | TTL |
|---|---|---|
| App configuration / feature flags | TanStack Query + AsyncStorage | 30 minutes |
| School branding | Persistent cache | 24 hours |
| Student list (teacher's classes) | TanStack Query | 10 minutes |
| Today's attendance records | TanStack Query | 5 minutes |
| Announcements feed | TanStack Query + infinite scroll | 15 minutes |
| Notifications | TanStack Query | 30 seconds polling |
| Timetable | TanStack Query | 2 hours |
| Fee records | TanStack Query | 10 minutes |
| Exam results (published) | TanStack Query | 60 minutes (results don't change) |
| User profile | TanStack Query + AsyncStorage | 24 hours |
| School branding assets | React Native Fast Image cache | Permanent (LRU eviction) |

---

## 7. Real-Time & Push Notifications

### 7.1 Current Push Architecture (Backend)

- `NotificationService` → writes to `Notifications` table.
- `POST /api/notifications/register-device` — stores FCM/APNS token against user.
- Push is currently not implemented (in-app polling only).

### 7.2 Mobile Push Integration Requirements

Mobile must:
1. On login, register the FCM/APNS device token via `POST /api/notifications/register-device`.
2. Handle foreground push (show in-app banner).
3. Handle background push (system notification).
4. On notification tap, deep-link to relevant screen.
5. On app foreground, refresh notification count.

Backend must add:
- FCM/APNS delivery call in `NotificationService` when pushing new notifications.
- Multi-device support (one user on phone + tablet = two tokens).
- Silent push for background sync trigger.

---

## 8. Offline API Strategy

### 8.1 Sync Bundle Endpoint Design

```
GET /api/mobile/offline-bundle
Authorization: Bearer <token>
X-Academic-Year: 2025-2026

Response:
{
  "data": {
    "lastSyncedAt": "2026-06-10T10:00:00Z",
    "profile": { ... },
    "timetable": { ... },
    "announcements": [ ... ],
    "students": [ ... ],    // for teachers: their class list
    "attendanceToday": [ ... ],
    "pendingLeaves": [ ... ]
  }
}
```

This endpoint is role-aware — returns different data based on the requester's role.

### 8.2 Offline Write Queue

For operations that should work offline:
- Attendance marking (teacher)
- Leave request submission (parent, student)
- Diary entry posting (teacher)

These are queued locally in SQLite (via `expo-sqlite`) with a `pendingSync` flag. When connectivity is restored, they are flushed in order.

---

## 9. Payment Integration

### 9.1 Current Web Flow

1. `POST /api/fees/payments/gateway/initiate` → returns Cashfree `paymentLink`.
2. Browser redirects to Cashfree checkout.
3. Cashfree calls webhook `POST /api/fees/payments/gateway/callback`.
4. UI polls for payment status.

### 9.2 Mobile Flow (To Implement)

1. `POST /api/fees/payments/gateway/mobile-initiate` → returns:
   - `cfOrderId`
   - `paymentSessionId` (for Cashfree SDK)
   - OR UPI deep-link string `upi://pay?...`
2. Mobile opens Cashfree SDK `CheckoutSheet` (React Native SDK).
3. On SDK `onPaymentSuccess` → confirm with backend `POST /api/fees/payments/verify`.
4. On SDK `onPaymentFailure` → show error, retry option.

Alternatively, open Cashfree web checkout in `expo-web-browser` with return deep link.

---

## 10. API Rate Limiting

The backend has the following rate limit policies (relevant to mobile):

| Policy | Limit | Mobile Impact |
|---|---|---|
| Auth (login) | 5 attempts / 15 min | Normal — user-facing login |
| Global | 100 req / 10 sec per IP | Mobile should implement local request debouncing |
| Upload | 10 uploads / 5 min | Batch upload if needed |
| Report generation | 5 / min | Async report generation pattern |
| Search | 30 / min | Debounce search input (300ms) |
| Export | 2 / min | Mobile doesn't typically need bulk exports |

---

## 11. API Security

| Concern | Implementation | Mobile Action |
|---|---|---|
| HTTPS only | CORS enforces HTTPS in prod | Always use HTTPS base URL |
| JWT expiry | 60 minutes | Implement silent refresh |
| Refresh token rotation | Single-use, stored in DB | Store in SecureStore, replace on rotation |
| Correlation ID | Auto-injected, also client-settable | Set `X-Correlation-ID` header from mobile for tracing |
| CORS | Whitelisted origins | Native mobile apps bypass CORS (no `Origin` header) |
| XSS | HtmlSanitizer on inputs | React Native has no DOM XSS, but sanitize user-generated content rendered in WebView |

---

## 12. API Readiness Summary

| Category | Status | Action |
|---|---|---|
| Authentication | Ready | Implement token refresh interceptor |
| Core data fetch (parent) | Ready | Wire directly |
| Core data fetch (teacher) | Ready | Wire directly |
| Core data fetch (student) | Ready | Wire directly |
| Aggregation endpoints | Missing | Build 4 mobile dashboard endpoints |
| Feature flags | Partial | `/api/school-feature-permissions/my-school` exists; build `/api/mobile/app-config` |
| Push notifications | Backend partial | Add FCM/APNS delivery + device registration |
| Mobile payment flow | Missing | Build mobile-initiate + verify endpoints |
| Offline bundle | Missing | Build `/api/mobile/offline-bundle` |
| Extended branding | Missing | Extend branding API |
| API versioning | Configured | Apply v1 prefix to all mobile endpoints |

---

*Next: [04-technology-recommendation.md](./04-technology-recommendation.md)*
