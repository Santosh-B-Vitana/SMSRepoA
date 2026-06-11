# Vitana SMS — ERP Analysis for Mobile Platform

> **Classification:** Internal Architecture Document  
> **Version:** 1.0  
> **Date:** June 2026  
> **Related Docs:** [01-executive-summary](./01-executive-summary.md) · [03-api-analysis](./03-api-analysis.md) · [13-feature-inventory](./13-feature-inventory.md)

---

## 1. System Overview

**Vitana SMS v2.9** is a production-grade School Management System (ERP) targeting Indian K-12 institutions. It is a full-stack multi-tenant SaaS platform with the following technology stack:

| Layer | Technology |
|---|---|
| Backend | ASP.NET Core 8 on .NET 8 |
| ORM | Entity Framework Core 8 (SQL Server primary) |
| Auth | JWT Bearer + Refresh Tokens + TOTP 2FA |
| Cache | Redis (StackExchange.Redis) |
| File Storage | AWS S3 / MinIO (local fallback) |
| Background Jobs | Hangfire 1.8 (SQL Server storage) |
| Observability | Serilog + OpenTelemetry (OTLP) |
| Payment | Cashfree India (UPI / Cards / Wallets) |
| PDF Generation | QuestPDF + PdfSharpCore |
| Frontend | React 19 + Vite 6 + TanStack Query v5 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | SQL Server (AWS RDS) per-school, CRM DB on SQL Server |

---

## 2. Multi-Tenancy Architecture

This is the most critical design pattern for mobile integration to understand.

### 2.1 Database-Per-Tenant Model

Each school has its **own dedicated SQL Server database**. The `CrmDbContext` (platform-level) holds a `SchoolConfig` table that maps each school's domain to its database server and database name.

**Resolution flow:**
1. HTTP request arrives at the API.
2. `UseSchoolDbContext()` middleware reads the incoming `Host` header.
3. Looks up `SchoolConfig` in the CRM DB by domain (cached for 6 hours in Redis).
4. Configures the `AppDbContext` to connect to that school's dedicated database.
5. JWT claims carry `SchoolId` (Guid) for all subsequent data access.

### 2.2 Mobile Implication

The mobile app must:
- Know which school domain to target at login time (entered by user or hardcoded in dedicated app).
- Send `Authorization: Bearer <token>` on every request.
- The `SchoolId` embedded in the JWT handles all subsequent tenant scoping server-side.
- No additional tenant header needed from mobile (the domain resolution happens via the API host).

### 2.3 EF Global Query Filters

Every entity extending `BaseEntity` has an EF Core global query filter: `WHERE SchoolId = @currentSchoolId AND IsDeleted = 0`. This is applied automatically — mobile does not need to worry about cross-school data leakage.

---

## 3. Authentication & Access Control

### 3.1 JWT Structure

```json
{
  "nameid": "user-guid",
  "schoolId": "school-guid",
  "role": "Parent",
  "linkedEntityId": "guardian-guid",
  "email": "parent@email.com",
  "exp": 1718000000
}
```

**Token lifetime:** 60 minutes (configurable per environment).  
**Refresh token:** Stored in DB (`RefreshTokens` table). Rotated on each use.

### 3.2 Role Hierarchy

| Role | Access Level |
|---|---|
| `SuperAdmin` | All schools, all modules, no tenant scoping |
| `Admin` | Full school management |
| `Principal` | Same as Admin, slightly narrower RBAC |
| `Teacher` | Class/subject assignment scope |
| `Staff` | Limited operational access |
| `HRManager` | Staff-related modules |
| `Accountant` | Finance and fee modules |
| `Librarian` | Library module |
| `TransportManager` | Transport module |
| `HostelWarden` | Hostel module |
| `Receptionist` | Front desk, visitor management |
| `Parent` | Own children's data only |
| `Student` | Own data only |

### 3.3 Fine-Grained RBAC

Beyond roles, the system has:
- **Permission Scopes:** Domain, Module, Action levels.
- **Permission Tiers:** Academic, Finance & HR, Operations, Communication.
- **School Feature Permissions:** Each module (Library, Transport, Hostel, WhatsApp, etc.) can be enabled/disabled per school by Super Admin.

**Mobile implication:** After login, fetch:
1. `GET /api/permissions/me` — user's fine-grained permissions.
2. `GET /api/school-feature-permissions/my-school` — which modules are enabled.

The mobile app uses both to render navigation and gate features.

### 3.4 Public Branding Endpoint

`GET /api/settings/public-branding` — anonymous, returns school name, logo URL, and brand color before login. Mobile uses this to display school branding on the login screen.

---

## 4. Module Inventory & Mobile Readiness

### 4.1 Core Modules (Backend is Complete)

| Module | Backend API | Mobile Priority | Mobile Role |
|---|---|---|---|
| Authentication | `/api/auth` | P0 | All roles |
| Student Management | `/api/students` | P1 | Admin, Teacher |
| Staff Management | `/api/staff` | P2 | Admin, HRManager |
| Attendance | `/api/attendance` | P0 | Teacher, Parent, Student |
| Examinations & Results | `/api/examinations` | P0 | Teacher, Parent, Student |
| Fee Management | `/api/fees` | P0 | Admin, Parent, Student |
| Announcements | `/api/announcements` | P0 | All roles |
| Notifications | `/api/notifications` | P0 | All roles |
| Assignments | `/api/assignments` | P1 | Teacher, Student, Parent |
| Timetable | `/api/timetable` | P1 | Teacher, Student |
| Diary | `/api/diary` | P1 | Teacher, Parent |
| Leave Management | `/api/leavemanagement` | P1 | Staff, Student, Parent |
| Library | `/api/library` | P2 | Admin, Student, Librarian |
| Transport | `/api/transport` | P2 | Admin, Parent, Student |
| Hostel | `/api/hostel` | P2 | Admin, HostelWarden |
| Documents & Certificates | `/api/documents`, `/api/certificates` | P2 | Admin, Student, Parent |
| Finance & Payroll | `/api/finance`, `/api/payroll` | P3 | Admin, HRManager, Accountant |
| Communication / School Connect | `/api/schoolconnect` | P1 | Teacher, Parent |
| Visitor Management | `/api/visitor` | P3 | Admin, Receptionist |
| Analytics | `/api/analytics` | P2 | Admin, Principal |
| WhatsApp | `/api/whatsapp` | P2 | Admin (trigger campaigns) |
| Online Exams | `/api/online-exam` | P2 | Teacher, Student |
| Syllabus | `/api/syllabus` | P2 | Teacher, Student |
| Reports | `/api/reports` | P3 | Admin, Principal |

---

## 5. Branding & Theming System

### 5.1 Current Web Branding

- School uploads a logo image (stored in AWS S3).
- School sets a **primary theme color** (HSL).
- `GET /api/settings/public-branding` returns: `{ schoolName, logoUrl, primaryColor }`.
- The web app uses this to color the sidebar, buttons, and logo display.

### 5.2 Brand Tokens (Derived from Exploration)

| Token | Default Value |
|---|---|
| Primary | `hsl(217, 91%, 50%)` — deep blue |
| Accent | `hsl(185, 85%, 45%)` — teal |
| Sidebar Background | `hsl(222, 47%, 11%)` — dark navy |
| Font (body) | Inter |
| Font (brand) | Poppins |
| Font (display) | Space Grotesk |
| Border Radius | 0.75rem |

### 5.3 Mobile Branding Extension Needed

The current branding system supports only logo + color. For the mobile white-label platform, the API must be extended to support:
- App icon (1024×1024 PNG)
- Splash screen (2048×2048 PNG)
- Secondary/accent color
- Dark mode palette
- Font family selection
- Store metadata (app name, tagline, description)

This extension is tracked in the [White Label Architecture](./08-white-label-architecture.md) document.

---

## 6. Existing Communication Infrastructure

### 6.1 In-App Notifications

- Backend: `NotificationService` writing to `Notifications` table.
- Frontend: Polling via TanStack Query (60s interval), bell icon badge.
- Mobile: Device token registration via `POST /api/notifications/register-device` → enables push.

### 6.2 WhatsApp (Just Shipped)

- Full Meta Cloud API integration with template management, contact opt-in, delivery tracking.
- Background jobs: queue-based processing, retry, cost tracking.
- This is ready for mobile to expose campaign triggering and delivery analytics.

### 6.3 Announcements

- Multi-audience: all school, class-specific, role-specific.
- Mobile: class-filtered announcements via `/api/announcements` with role-appropriate filtering.

---

## 7. Workflow Analysis

### 7.1 Parent Daily Workflow

```
Morning: Open app → check child's attendance (was yesterday marked?)
         Read any new announcements
         Check diary entry from class teacher
Evening: Pay outstanding fees if notification received
         View exam results when published
         Message class teacher if needed
Monthly: Check attendance % (shortage alert?)
         Review exam performance trends
```

**Mobile API calls needed:**
- `GET /api/students/my-children` — child list
- `GET /api/attendance/students?studentId=X` — today's attendance
- `GET /api/announcements?forParent=true` — announcements
- `GET /api/diary/parent/child/{studentId}` — diary
- `GET /api/fees/records?studentId=X` — fee summary
- `GET /api/examinations/results?studentId=X` — results

### 7.2 Teacher Daily Workflow

```
8:00 AM: Open app → view today's timetable
8:30 AM: Mark attendance for Period 1 class
         (Bulk mark all present, mark exceptions individually)
11:00 AM: Post diary entry for morning class
1:00 PM: Mark attendance for afternoon classes
3:00 PM: Enter marks for last week's test
4:00 PM: Approve/reject pending student leave requests
```

**Mobile API calls needed:**
- `GET /api/timetable/my-schedule` — today's schedule
- `POST /api/attendance/students/bulk` — bulk attendance
- `POST /api/diary` — diary entry
- `PUT /api/examinations/results/bulk` — marks entry
- `GET/PUT /api/leavemanagement/leave-requests` — leave approvals

### 7.3 Student Daily Workflow

```
Morning: View today's timetable
         Check if any new assignment due
Afternoon: Submit completed assignment
           Check recently published results
           View library due dates
Evening: Download tomorrow's homework from diary
```

### 7.4 Admin Daily Workflow

```
Morning: Dashboard — today's attendance rate, fee collection
         Approve pending staff leave requests
         Review any billing alerts
Weekly: View class-wise attendance summary
        Review exam performance analytics
        Check defaulter list
Monthly: Payroll run
         Fee collection report
```

---

## 8. Data Aggregation Requirements

Several mobile views require aggregating data from multiple API endpoints. These are candidates for mobile-specific aggregation endpoints (or BFF — Backend for Frontend patterns):

| Mobile View | Current APIs Needed | Aggregation Endpoint Needed |
|---|---|---|
| Parent Dashboard | `/students/my-children` + `/attendance/stats` + `/fees/records` + `/announcements` + `/notifications` | `GET /api/mobile/parent-dashboard` |
| Teacher Dashboard | `/timetable/my-schedule` + `/attendance/stats` + `/assignments` + `/leaves/pending` | `GET /api/mobile/teacher-dashboard` |
| Student Dashboard | `/timetable` + `/attendance/my-attendance` + `/examinations/results` + `/assignments` | `GET /api/mobile/student-dashboard` |
| Admin Dashboard | `/analytics/dashboard` + `/fees/stats` + `/attendance/stats` | `GET /api/mobile/admin-dashboard` |

These aggregation endpoints avoid 5–7 sequential API calls on app launch, critical for mobile performance on Indian 4G networks.

---

## 9. API Readiness Assessment

### 9.1 Ready for Mobile (No Changes Needed)

- Authentication (login, refresh, logout, change-password)
- Student attendance (mark, bulk, stats, monthly)
- Fee records and payment initiation
- Exam results and report card retrieval
- Announcements (create, read, role-filtered)
- Notifications (read, mark, device registration)
- Timetable (my-schedule, class timetable)
- Leave management (apply, approve, reject)
- Diary (create, read for parent/student)
- Documents (view, download)

### 9.2 Needs Mobile-Optimized Variants

| Endpoint | Issue | Recommendation |
|---|---|---|
| `GET /api/students` | Returns full profile data — too heavy for list views | Add `?fields=id,name,photo,class` projection |
| `GET /api/examinations/results` | No pagination on some result sets | Enforce `page`/`pageSize` |
| Fee payment flow | Web-only Cashfree SDK used | Mobile deep-link callback required |
| `GET /api/analytics/dashboard` | Designed for desktop charts (Recharts) | Create mobile chart data format |
| `GET /api/reports/dise` | Export-only, no mobile value | Skip for mobile |

### 9.3 Missing Mobile APIs (Must Build)

| API | Purpose | Priority |
|---|---|---|
| `GET /api/mobile/parent-dashboard` | Aggregated parent home screen | P0 |
| `GET /api/mobile/teacher-dashboard` | Aggregated teacher home screen | P0 |
| `GET /api/mobile/student-dashboard` | Aggregated student home screen | P0 |
| `POST /api/mobile/device-registration` | FCM/APNS token registration with platform details | P0 |
| `GET /api/mobile/app-config` | Feature flags + branding in one call | P0 |
| `POST /api/fees/payments/gateway/mobile-initiate` | Cashfree UPI deep-link for mobile | P0 |
| `GET /api/mobile/offline-sync-bundle` | Compact data bundle for offline caching | P1 |
| `GET /api/mobile/branding` | Extended branding (icon, splash, fonts, colors) | P1 |
| `POST /api/mobile/feedback` | In-app feedback/crash reporting | P2 |

---

## 10. Security Analysis for Mobile

| Concern | Current Web Handling | Mobile Requirement |
|---|---|---|
| Token storage | Browser memory / httpOnly cookie | iOS Keychain / Android Keystore (Expo SecureStore) |
| Refresh token rotation | Yes — single-use, DB-stored | Same — mobile must handle rotation |
| Biometric auth | Not implemented | Fingerprint / FaceID wrapping SecureStore on mobile |
| Certificate pinning | No | Add for production (Expo supports custom fetch) |
| App tampering | N/A (web) | SafetyNet (Android) / DeviceCheck (iOS) attestation |
| Deep-link hijacking | N/A | Verified App Links (Android) / Universal Links (iOS) |
| Screen recording protection | N/A | Enable for payment screens |

---

## 11. Indian Market Considerations

| Factor | Detail |
|---|---|
| **Network** | 4G with variable quality; 2G fallback in rural areas. Offline-first is critical. |
| **Devices** | Mid-range Android dominates (2–4 GB RAM). Avoid memory-heavy patterns. Bundle size target: <10 MB JS. |
| **Payment** | UPI is dominant (>60% transactions). Cashfree integration already exists. |
| **Language** | English primary; Hindi and regional language support in Phase 3. |
| **Time zones** | IST only (UTC+5:30). Backend uses UTC; mobile should display in IST. |
| **Academic calendar** | April–March academic year. Academic year context header `X-Academic-Year` required on all relevant API calls. |
| **Data privacy** | Aadhaar numbers must remain masked (only last 4 visible). PAN masked. Never transmit raw Aadhaar in mobile requests. |

---

*Next: [03-api-analysis.md](./03-api-analysis.md)*
