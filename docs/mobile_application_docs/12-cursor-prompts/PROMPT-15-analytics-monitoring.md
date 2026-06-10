# PROMPT-15: Analytics & Observability Setup

> **Prompt ID:** PROMPT-15  
> **Epic:** EP-16 — Analytics & Observability  
> **Phase:** 3 — Sprint 17–18  
> **Estimated Story Points:** 29  
> **Prerequisites:** PROMPT-01 complete (Sentry stub from foundation setup)  
> **Related Architecture Docs:** [epics/EP-16-analytics-observability](../epics/EP-16-analytics-observability.md)

---

## Context

The mobile app is in beta. Now instrument it properly for production monitoring. This covers Sentry crash reporting, Sentry Performance APM, Amplitude product analytics, source map uploads, and error boundaries around all feature modules.

**Important:** No PII may appear in any analytics event or Sentry payload. The following are NEVER tracked:
- Student or parent names.
- Email addresses.
- Phone numbers.
- Aadhaar / PAN numbers.
- Fee amounts as exact values (use buckets: `<5k`, `5k-20k`, `>20k`).
- Message content.

---

## Requirements

### 1. Sentry — Full Setup

#### Initialization (`app/_layout.tsx`)

```typescript
import * as Sentry from '@sentry/react-native';
import { useNavigationContainerRef } from 'expo-router';

const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
  release: `vitana-sms@${Application.nativeApplicationVersion}+${Application.nativeBuildVersion}`,
  dist: Platform.OS,
  
  tracesSampleRate: process.env.EXPO_PUBLIC_ENV === 'production' ? 0.15 : 1.0,
  profilesSampleRate: process.env.EXPO_PUBLIC_ENV === 'production' ? 0.05 : 0.3,
  
  integrations: [
    new Sentry.ReactNativeTracing({
      routingInstrumentation,
      // Track navigation as transactions
      enableStallTracking: true,
      enableUserInteractionTracing: true,
    }),
  ],
  
  beforeSend: (event) => {
    // Scrub all sensitive fields
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
      delete event.request.headers['authorization'];
    }
    // Remove any student/parent name patterns from event message
    if (event.extra) {
      delete event.extra.refreshToken;
      delete event.extra.accessToken;
    }
    return event;
  },
  
  beforeSendTransaction: (transaction) => {
    // Remove query parameters that might contain sensitive data
    if (transaction.request?.url) {
      transaction.request.url = stripSensitiveQueryParams(transaction.request.url);
    }
    return transaction;
  },
});

// Set navigation ref
const ref = useNavigationContainerRef();
useEffect(() => { routingInstrumentation.registerNavigationContainer(ref); }, [ref]);
```

#### Post-Login User Context

```typescript
// src/features/auth/hooks/useLogin.ts — after successful login
Sentry.setUser({
  id: user.id,   // internal UUID only
  // NO email, NO name
});
Sentry.setTag('schoolId', user.schoolId);
Sentry.setTag('role', user.role);
Sentry.setTag('appVersion', Application.nativeApplicationVersion!);
Sentry.setTag('platform', Platform.OS);
```

#### On Logout

```typescript
Sentry.setUser(null);  // Clear user context
```

#### API Error Capture

Extend the Axios error interceptor (in `src/api/client.ts`):

```typescript
// In the error interceptor (after 401 handling)
if (error.response?.status && error.response.status >= 500) {
  Sentry.withScope((scope) => {
    scope.setTag('endpoint', error.config?.url ?? 'unknown');
    scope.setTag('httpMethod', error.config?.method?.toUpperCase() ?? 'UNKNOWN');
    scope.setTag('httpStatus', String(error.response!.status));
    scope.setExtra('correlationId', error.response?.headers?.['x-correlation-id']);
    scope.setExtra('responseData', JSON.stringify(error.response?.data)?.substring(0, 500));
    Sentry.captureMessage(
      `API Error ${error.response.status}: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
      'error'
    );
  });
}
```

#### Error Boundaries

Create `src/components/common/FeatureErrorBoundary.tsx` as defined in EP-16.

Wrap every role group and major feature in `app/_layout.tsx` and per-feature layout files:

```typescript
// app/(parent)/_layout.tsx
<FeatureErrorBoundary featureName="Parent Portal">
  <Tabs>...</Tabs>
</FeatureErrorBoundary>
```

Features to wrap individually:
- `FeatureErrorBoundary featureName="Fees"` around fees screens.
- `FeatureErrorBoundary featureName="Results"` around results screens.
- `FeatureErrorBoundary featureName="Attendance"` around attendance screens.
- `FeatureErrorBoundary featureName="Marks Entry"` around marks entry grid.
- `FeatureErrorBoundary featureName="Messaging"` around messaging screens.

#### Performance Transactions

Manual transaction for critical user flows:

```typescript
// In parent dashboard
const transaction = Sentry.startTransaction({ name: 'parent_dashboard_load' });
Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction));

// API calls automatically create child spans via the Axios integration
const data = await mobileApi.getParentDashboard();

transaction.finish();
```

### 2. Source Maps Upload

Add to EAS post-build hook in all production workflows:

```yaml
# In mobile-eas-production.yml, after build:
- name: Upload source maps to Sentry
  run: |
    npx @sentry/cli sourcemaps inject --org vitana --project vitana-mobile \
      --release "$APP_VERSION+$BUILD_NUMBER" \
      .expo/
    npx @sentry/cli sourcemaps upload --org vitana --project vitana-mobile \
      --release "$APP_VERSION+$BUILD_NUMBER" \
      .expo/
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
```

### 3. Amplitude — Full Setup

#### Installation

```bash
pnpm --filter @vitana/mobile add @amplitude/analytics-react-native
```

#### Initialization (`src/lib/analytics.ts`)

```typescript
import * as amplitude from '@amplitude/analytics-react-native';
import { Identify } from '@amplitude/analytics-react-native';

export async function initAnalytics() {
  await amplitude.init(process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY!, undefined, {
    serverZone: 'EU',  // EU server for GDPR compliance
    trackingOptions: {
      ipAddress: false,         // Don't track IP
      carrier: false,
      deviceManufacturer: true,
      deviceModel: true,
      language: true,
      osName: true,
      osVersion: true,
      platform: true,
      versionName: true,
    },
  });
}

export function identifyUser(user: UserProfile) {
  amplitude.setUserId(user.id);  // UUID only, never email
  
  const identify = new Identify();
  identify.set('role', user.role);
  identify.set('schoolId', user.schoolId);
  identify.set('appVersion', Application.nativeApplicationVersion!);
  identify.set('platform', Platform.OS);
  amplitude.identify(identify);
}

export function resetUser() {
  amplitude.reset();  // Call on logout
}

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  const sanitized = sanitizeForAnalytics(properties);
  amplitude.track(event, sanitized);
}

function sanitizeForAnalytics(props?: Record<string, unknown>): Record<string, unknown> {
  if (!props) return {};
  const FORBIDDEN_KEYS = ['name', 'email', 'phone', 'aadhaar', 'pan', 'password'];
  return Object.fromEntries(
    Object.entries(props).filter(([k]) => !FORBIDDEN_KEYS.some(fk => k.toLowerCase().includes(fk)))
  );
}
```

#### Analytics Event Type System

```typescript
// src/lib/analyticsEvents.ts
export type AnalyticsEvent =
  // Auth
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'biometric_unlock_success'
  | 'biometric_unlock_failed'
  // Parent
  | 'attendance_viewed'
  | 'fee_payment_initiated'
  | 'fee_payment_completed'
  | 'fee_payment_failed'
  | 'result_viewed'
  | 'report_card_viewed'
  | 'leave_applied'
  | 'announcement_opened'
  // Teacher
  | 'attendance_submitted'
  | 'marks_entry_submitted'
  | 'assignment_created'
  | 'assignment_graded'
  | 'diary_posted'
  | 'leave_approved'
  | 'leave_rejected'
  // Student
  | 'assignment_submitted'
  | 'timetable_viewed'
  // Admin
  | 'announcement_published'
  | 'bulk_leave_approved'
  // App
  | 'offline_queue_synced'
  | 'offline_conflict_resolved'
  | 'push_notification_tapped'
  | 'feature_unavailable_shown'
  | 'force_update_shown'
  | 'maintenance_mode_shown';
```

#### Auto Screen Tracking

```typescript
// src/hooks/useScreenTracking.ts
import { useSegments } from 'expo-router';
import { useEffect } from 'react';
import { track } from '../lib/analytics';

export function useScreenTracking() {
  const segments = useSegments();
  useEffect(() => {
    const screenName = segments.length > 0 ? segments.join('/') : 'home';
    track('screen_viewed' as any, { screenName });
  }, [segments]);
}
// Called in root _layout.tsx
```

#### Key Event Implementations

Implement `track()` calls at these points:

```typescript
// auth/useLogin.ts
track('login_success', { role: user.role, method: 'password' });
track('login_failed', { reason: 'invalid_credentials' });

// fees/useFeePayment.ts
track('fee_payment_initiated', {
  amount_bucket: getAmountBucket(amount),  // '<5k' | '5k-20k' | '>20k' | '>50k'
  school_id: user.schoolId,
});
track('fee_payment_completed', { payment_method: 'upi', success: true });

// attendance/useMarkAttendance.ts
track('attendance_submitted', {
  class_size: records.length,
  absent_count: records.filter(r => r.status === 'Absent').length,
  was_offline: !isConnected,
});

// offline/queue.ts
track('offline_queue_synced', {
  operation_type: item.operationType,
  wait_minutes: Math.round((Date.now() - item.createdAt) / 60000),
  success: true,
});
```

### 4. Performance Monitoring Helpers

```typescript
// src/lib/performance.ts
export function measureScreenLoad(screenName: string) {
  const startTime = Date.now();
  return {
    complete: () => {
      const duration = Date.now() - startTime;
      // Record as Sentry span
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `${screenName} loaded in ${duration}ms`,
        level: duration > 2000 ? 'warning' : 'info',
        data: { duration, screenName },
      });
      // Warn if too slow
      if (duration > 2000) {
        Sentry.captureMessage(`Slow screen load: ${screenName} (${duration}ms)`, 'warning');
      }
    },
  };
}
```

Usage in screens:
```typescript
// In Parent Dashboard
const perf = measureScreenLoad('parent_dashboard');
const { data } = useQuery({ ... });
useEffect(() => { if (data) perf.complete(); }, [data]);
```

### 5. App Health Checks

```typescript
// src/lib/healthCheck.ts — run on app start
export async function performHealthChecks() {
  // 1. API reachability
  try {
    const start = Date.now();
    await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/health/live`);
    const latency = Date.now() - start;
    track('api_health_check', { latency_ms: latency, status: 'ok' });
  } catch {
    track('api_health_check', { status: 'failed' });
    Sentry.captureMessage('API health check failed on app start', 'warning');
  }
  
  // 2. SQLite health
  try {
    await db.run(sql`SELECT 1`);
  } catch (error) {
    Sentry.captureException(error, { tags: { component: 'sqlite' } });
  }
}
```

---

## Implementation Tasks

1. Complete Sentry initialization in `app/_layout.tsx` with all options.
2. Implement post-login Sentry user context setting.
3. Extend API client error interceptor with Sentry capture for 5xx errors.
4. Create `FeatureErrorBoundary` component.
5. Wrap all role groups and major features with `FeatureErrorBoundary`.
6. Add source maps upload to all production CI workflows.
7. Implement `analytics.ts` with Amplitude initialization.
8. Implement `analyticsEvents.ts` type system.
9. Implement `useScreenTracking()` hook.
10. Add `useScreenTracking()` to root `_layout.tsx`.
11. Implement `track()` calls for all 25+ events in the taxonomy.
12. Implement `getAmountBucket()` utility (no raw amounts).
13. Implement `sanitizeForAnalytics()` with forbidden key list.
14. Implement `measureScreenLoad()` performance helper.
15. Apply `measureScreenLoad()` to: Parent Dashboard, Teacher Dashboard, Attendance Grid, Marks Entry Grid, Fee Summary.
16. Implement `performHealthChecks()` called on app start.
17. Add Amplitude to EAS secrets: `EXPO_PUBLIC_AMPLITUDE_API_KEY`.
18. Add Sentry DSN to EAS secrets: `EXPO_PUBLIC_SENTRY_DSN`.
19. Verify Sentry events show clean TS stack traces (source maps working).
20. Verify no PII in Amplitude events (audit 5 sample events).

---

## Acceptance Criteria

- [ ] Intentional throw in Parent Dashboard → Sentry event appears within 30 seconds.
- [ ] Authorization header NOT visible in Sentry event.
- [ ] User ID visible in Sentry (UUID, not email).
- [ ] `login_success` event appears in Amplitude with `role` property.
- [ ] `attendance_submitted` event has `was_offline` property.
- [ ] `fee_payment_initiated` uses `amount_bucket`, not raw amount.
- [ ] Screen view events appear in Amplitude for Parent Dashboard, Attendance, and Results.
- [ ] Source maps: Sentry stack trace shows TypeScript filenames (not `bundle.js`).
- [ ] Error boundary: crashing `FeesModule` doesn't crash attendance or results screens.
- [ ] Cold start performance captured as Sentry transaction.
- [ ] API 500 error captured in Sentry with endpoint + correlationId.
- [ ] `sanitizeForAnalytics` removes any key containing "name", "email", "phone".

---

## Testing Requirements

Unit:
- `sanitizeForAnalytics({ name: 'Aarav', role: 'Student' })` → `{ role: 'Student' }`.
- `getAmountBucket(3500)` → `'<5k'`.
- `getAmountBucket(15000)` → `'5k-20k'`.
- `getAmountBucket(75000)` → `'>50k'`.

Manual:
- Sentry: trigger a real crash on a test device → verify event in Sentry project.
- Amplitude: login → navigate 3 screens → check Amplitude user activity stream.
- Privacy audit: review 10 Amplitude events → zero PII.

---

## Definition of Done

- [ ] All acceptance criteria pass.
- [ ] Zero PII in any analytics event or Sentry payload (reviewed by engineering lead).
- [ ] Sentry DSN + Amplitude key stored as EAS secrets (not in code).
- [ ] Source maps uploaded and verified (readable stack trace).
- [ ] `EXPO_PUBLIC_SENTRY_DSN` present in all EAS build profiles.
- [ ] Peer review complete.
