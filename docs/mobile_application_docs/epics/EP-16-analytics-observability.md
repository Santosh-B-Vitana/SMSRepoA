# EP-16: Analytics & Observability

> **Epic ID:** EP-16  
> **Priority:** P2  
> **Estimated Sprints:** 2  
> **Phase:** 3 — Sprint 17  
> **Related Docs:** [06-mobile-architecture](../06-mobile-architecture.md) · [PROMPT-15](../12-cursor-prompts/PROMPT-15-analytics-monitoring.md)

---

## Business Objective

Without visibility into how the mobile app is being used — and where it's failing — Vitana cannot improve it. Observability is the foundation for data-driven product decisions. Crash reporting catches bugs before users complain. Usage analytics shows which features are driving engagement. Performance monitoring identifies slow screens before they become churn drivers.

## Technical Objective

Integrate Sentry for crash reporting, performance monitoring, and API error tracking. Integrate Amplitude for product analytics (screen views, feature usage). Set up custom dashboards for key health metrics. Establish a monitoring runbook for the mobile platform.

---

## Current State Analysis

**Backend:** Sentry is already used. OpenTelemetry traces via OTLP. Structured Serilog logs. These provide server-side observability.

**Mobile:** No crash reporting. No analytics. No performance monitoring. These must all be added.

---

## Functional Requirements

### Crash Reporting (Sentry)

| ID | Requirement |
|---|---|
| FR-1 | Sentry React Native SDK initialized on app start |
| FR-2 | User context set post-login (id + schoolId + role — no PII) |
| FR-3 | All unhandled JS exceptions captured |
| FR-4 | All unhandled Promise rejections captured |
| FR-5 | Error boundaries around each feature module |
| FR-6 | API errors captured as Sentry events with status code + endpoint |
| FR-7 | `X-Correlation-ID` from API responses attached to Sentry events |
| FR-8 | Authorization headers scrubbed from all Sentry payloads |
| FR-9 | Breadcrumbs: navigation events, API calls, user actions |
| FR-10 | Source maps uploaded to Sentry on every build (EAS + CI) |

### Performance Monitoring (Sentry Performance)

| ID | Requirement |
|---|---|
| FR-11 | App startup time measured (cold start + warm start) |
| FR-12 | Screen render time tracked via Sentry transactions |
| FR-13 | API call duration tracked as Sentry spans |
| FR-14 | Slow renders (> 500ms) flagged |
| FR-15 | Memory warnings captured |

### Product Analytics (Amplitude)

| ID | Requirement |
|---|---|
| FR-16 | Screen view events on every route change |
| FR-17 | Feature usage events for critical actions |
| FR-18 | User properties: role, schoolId, appVersion |
| FR-19 | Funnel tracking: login → dashboard → first key action |
| FR-20 | Retention metrics: DAU / WAU / MAU |
| FR-21 | No PII in any analytics event (no names, emails, Aadhaar) |

---

## Sentry Integration

### Initialization

```typescript
// app/_layout.tsx — before everything else
import * as Sentry from '@sentry/react-native';
import { routingInstrumentation } from 'expo-router/sentry-instrumentation';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_ENV,
  tracesSampleRate: process.env.EXPO_PUBLIC_ENV === 'production' ? 0.2 : 1.0,
  profilesSampleRate: 0.1,
  integrations: [
    new Sentry.ReactNativeTracing({
      routingInstrumentation,
      tracePropagationTargets: ['api.vitanasms.com'],
    }),
  ],
  beforeSend: (event) => {
    // Scrub Authorization header
    if (event.request?.headers?.['Authorization']) {
      event.request.headers['Authorization'] = '[Filtered]';
    }
    // Scrub any potential token data
    if (event.extra?.refreshToken) event.extra.refreshToken = '[Filtered]';
    return event;
  },
});
```

### Error Boundaries

Every role group and every major feature module wrapped:

```typescript
// src/components/common/FeatureErrorBoundary.tsx
export function FeatureErrorBoundary({ children, featureName }: Props) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorState
          title={`${featureName} failed to load`}
          message="We've been notified. Please try again."
          onRetry={resetError}
        />
      )}
      onError={(error) => {
        Sentry.captureException(error, { tags: { feature: featureName } });
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
```

### API Error Capture

In the Axios error interceptor:

```typescript
if (error.response?.status >= 500) {
  Sentry.captureEvent({
    message: `API Error ${error.response.status}: ${error.config?.url}`,
    level: 'error',
    tags: {
      endpoint: error.config?.url,
      method: error.config?.method,
      statusCode: String(error.response.status),
      correlationId: error.response.headers['x-correlation-id'],
    },
  });
}
```

---

## Amplitude Integration

### Initialization

```typescript
// src/lib/analytics.ts
import { Amplitude } from '@amplitude/analytics-react-native';

export function initAnalytics() {
  Amplitude.init(process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY!);
}

export function identifyUser(user: UserProfile) {
  Amplitude.setUserId(user.id);   // internal UUID only, no email
  Amplitude.identify(new Identify()
    .set('role', user.role)
    .set('schoolId', user.schoolId)
    .set('appVersion', Application.nativeApplicationVersion!)
    .set('platform', Platform.OS)
  );
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  // Enforce no-PII rule
  const sanitized = sanitizeProperties(properties);
  Amplitude.track(event, sanitized);
}

export function trackScreen(screenName: string) {
  Amplitude.track('screen_viewed', { screenName });
}
```

### Auto Screen Tracking

```typescript
// Expo Router segments → Amplitude screen events
function useScreenTracking() {
  const segments = useSegments();
  useEffect(() => {
    const screenName = segments.join('/') || 'home';
    trackScreen(screenName);
  }, [segments]);
}
```

### Event Taxonomy

| Category | Event | Properties |
|---|---|---|
| Auth | `login_success` | `role`, `method: 'password' \| 'biometric'` |
| Auth | `login_failed` | `reason: 'invalid_creds' \| 'locked' \| 'network'` |
| Auth | `logout` | `session_duration_minutes` |
| Parent | `attendance_viewed` | `month`, `studentId (hashed)` |
| Parent | `fee_payment_initiated` | `amount_bucket: '<5k' \| '5k-20k' \| '>20k'` |
| Parent | `fee_payment_completed` | `payment_method`, `success: bool` |
| Parent | `result_viewed` | `exam_type` |
| Teacher | `attendance_submitted` | `class_size`, `was_offline`, `absent_count` |
| Teacher | `marks_entry_submitted` | `exam_type`, `class_size`, `was_offline` |
| Teacher | `assignment_created` | `subject`, `due_days_from_now` |
| Student | `assignment_submitted` | `type: 'text' \| 'file'`, `days_before_due` |
| App | `offline_queue_synced` | `operation_type`, `count`, `wait_minutes` |
| App | `feature_flag_gate_hit` | `feature_key`, `was_blocked: bool` |

---

## Performance Targets & Alerts

| Metric | Target | Alert If |
|---|---|---|
| Cold start to auth screen | < 1.5s | > 3s |
| Dashboard load time | < 2s | > 4s |
| Attendance grid render | < 500ms | > 1s |
| API call (P95) | < 800ms | > 2s |
| App crash rate | < 0.5% sessions | > 1% |
| ANR rate (Android) | < 0.5% | > 1% |
| JS bundle size | < 10 MB | > 15 MB |

---

## Mobile Dashboard (Sentry + Amplitude)

Weekly review metrics:
- DAU / WAU trends.
- Top error events (count + affected users).
- Slowest screens / API endpoints.
- Feature usage breakdown (which screens are visited most).
- Offline sync success rate.
- Push notification delivery rate.
- Payment conversion rate.

---

## User Stories

| ID | Story | SP |
|---|---|---|
| EP-16-US-01 | Sentry crash reporting initialization | 3 |
| EP-16-US-02 | Error boundaries on all feature modules | 3 |
| EP-16-US-03 | API error capture with correlation IDs | 3 |
| EP-16-US-04 | Sentry Performance (startup + screens + API spans) | 5 |
| EP-16-US-05 | Source maps upload in CI | 3 |
| EP-16-US-06 | Amplitude initialization + screen tracking | 3 |
| EP-16-US-07 | Event taxonomy implementation (all events) | 5 |
| EP-16-US-08 | User identification (no PII) | 2 |
| EP-16-US-09 | Monitoring runbook document | 2 |

**Total:** 29 story points / 2 sprints

---

## Acceptance Criteria

- [ ] Intentional crash in dev → event appears in Sentry within 30 seconds.
- [ ] Authorization header NOT visible in any Sentry event.
- [ ] Screen view events appear in Amplitude for each navigation.
- [ ] `login_success` event includes `role` and `method` (no email).
- [ ] Source maps uploaded: stack traces in Sentry show readable TS code.
- [ ] Cold start measured in Sentry transactions.
- [ ] Error boundary: crashing one feature module doesn't crash the whole app.

---

## Sprint Breakdown

| Sprint | Scope |
|---|---|
| Sprint 17 | Sentry init + error boundaries + API error capture + source maps |
| Sprint 18 | Amplitude init + event taxonomy + screen tracking + performance |
