# @vitana/shared-types

Shared TypeScript type definitions for the Vitana SMS platform, consumed by both the web app (`ui/`) and the mobile app (`mobile/`).

## Purpose

This package is the **single source of truth** for all API contract types. Keeping types here prevents web and mobile from diverging over time.

## Usage

```typescript
import type { UserProfile, LoginResponse, FeeRecord } from '@vitana/shared-types';
```

## Package contents

| File | Types exported |
|---|---|
| `src/api/auth.ts` | `UserRole`, `UserProfile`, `LoginRequest`, `LoginResponse`, `RefreshTokenRequest`, `RefreshTokenResponse` |
| `src/api/attendance.ts` | `AttendanceStatus`, `StudentAttendanceRecord`, `AttendanceSummary`, `BulkAttendanceRequest` |
| `src/api/fees.ts` | `FeeStatus`, `FeeRecord`, `PaymentRecord`, `FeePaymentRequest`, `FeePaymentResponse` |
| `src/api/examinations.ts` | `Grade`, `ExamResult`, `ReportCard`, `SubjectResult`, `ExamSchedule` |
| `src/api/announcements.ts` | `AnnouncementAudience`, `AnnouncementPriority`, `Announcement`, `CreateAnnouncementRequest` |
| `src/api/notifications.ts` | `NotificationType`, `AppNotification`, `PushNotificationPayload`, `DeviceTokenRegistration` |
| `src/api/mobile.ts` | `AppConfig`, `SchoolBranding`, `FeatureFlags`, `ModuleFlags`, `BrandingColors` |

## Adding new types

1. Add to the appropriate file in `src/api/`, or create a new file for a new domain.
2. Export from the new file.
3. Re-export from `src/index.ts`.
4. Run `pnpm --filter @vitana/shared-types build` to verify TypeScript compilation.

## Building

```bash
pnpm --filter @vitana/shared-types build
```

Output is emitted to `dist/`. The `dist/` folder is what consumers import.
