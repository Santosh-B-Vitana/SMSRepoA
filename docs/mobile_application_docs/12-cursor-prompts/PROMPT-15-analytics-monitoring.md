# PROMPT-15: Analytics & Observability

> **Version**: 2.0 — Full 10-Phase Anatomy  
> **Epic**: EP-16 — Analytics & Observability  
> **Sprint**: 17–18 (Weeks 33–36)  
> **Story Points**: 29  
> **Prerequisites**: PROMPT-01 ✓ (Sentry stub initialized)  
> **Can start**: Any time after PROMPT-01 — runs in parallel with feature development

---

## PHASE 1: Context & Scope

### What We're Building

Complete observability: crash reporting (Sentry), product analytics (Amplitude), performance monitoring, source map uploads, and error boundaries. This sprint makes the app production-ready from a monitoring perspective.

**Critical rule**: **No PII in any event**. Student names, parent emails, phone numbers, Aadhaar, PAN — never in analytics or Sentry.

**Capabilities:**
- Sentry crash reporting with user context (UUID only, never email)
- Sentry Performance: screen load times, API latency
- Source maps uploaded to Sentry in CI (readable stack traces)
- Error boundaries on every feature module
- Amplitude product analytics (screen views + feature events)
- 25+ typed analytics events (no raw amounts — use buckets)
- PII sanitization layer

### Current State

- ✅ Sentry initialized in `app/_layout.tsx` (basic stub from PROMPT-01)
- ✅ `EXPO_PUBLIC_SENTRY_DSN` used in init
- ❌ Error boundaries not placed on feature modules
- ❌ Amplitude not installed
- ❌ Source maps upload not in CI
- ❌ Event taxonomy not implemented
- ❌ API error capture not in Axios interceptor

### Success Criteria

- [ ] Intentional crash → Sentry event within 30 seconds
- [ ] Authorization header NOT in any Sentry event (scrubbed)
- [ ] User ID in Sentry is UUID (not email)
- [ ] Source maps: readable TypeScript filenames in Sentry stack traces
- [ ] Screen view event for every navigation change (Amplitude)
- [ ] `login_success` event has `role` property (no email, no name)
- [ ] `fee_payment_initiated` uses `amount_bucket` (not raw amount)
- [ ] Error boundary: crashing Fees module doesn't crash Attendance module
- [ ] Cold start measured as Sentry transaction
- [ ] All 25+ event types implemented

---

## PHASE 2: Analysis Phase

### Read First

```bash
docs/mobile_application_docs/epics/EP-16-analytics-observability.md
```

### Existing Code Audit

```bash
# Verify Sentry stub exists
grep "Sentry.init" mobile/app/_layout.tsx

# Check Amplitude not yet installed
grep "amplitude" mobile/package.json  # Should NOT be there yet

# Verify EXPO_PUBLIC_SENTRY_DSN in env
grep "SENTRY_DSN" mobile/.env.example
```

### Privacy Rules (Enforce in Code)

```typescript
// FORBIDDEN in any event property:
const FORBIDDEN_KEYS = ['name', 'email', 'phone', 'aadhaar', 'pan', 'password', 'token'];
// Amounts: never log raw INR amounts — use buckets: '<5k', '5k-20k', '20k-50k', '>50k'
// Student IDs: hash before sending if needed as identifier
// School domain: OK to send (not PII)
// User role: OK to send
// Class name: OK to send
```

---

## PHASE 3: Technical Planning

### Observability Stack

```
Crash / Error      → Sentry React Native SDK
Performance APM    → Sentry Performance (transactions + spans)
Product Analytics  → Amplitude React Native SDK
Source Maps        → @sentry/cli in CI (GitHub Actions)
```

### Error Boundary Placement

```
app/_layout.tsx (root error boundary — catches anything)
  └── (parent)/_layout.tsx (FeatureErrorBoundary: "Parent Portal")
  │   ├── fees screens     (FeatureErrorBoundary: "Fees")
  │   ├── results screens  (FeatureErrorBoundary: "Results")
  │   └── attendance       (FeatureErrorBoundary: "Attendance")
  └── (teacher)/_layout.tsx (FeatureErrorBoundary: "Teacher Portal")
      ├── attendance screens (FeatureErrorBoundary: "Attendance Marking")
      └── marks screens     (FeatureErrorBoundary: "Marks Entry")
```

---

## PHASE 4: Database Design

> No database changes. Analytics data goes to Amplitude + Sentry cloud services.

---

## PHASE 5: Backend Implementation

> No backend changes. This prompt is purely mobile-side observability.

---

## PHASE 6: Mobile Implementation

### 6.1 Install Amplitude

```bash
cd mobile
pnpm add @amplitude/analytics-react-native
```

### 6.2 Analytics Module

```typescript
// mobile/src/lib/analytics.ts
import * as amplitude from '@amplitude/analytics-react-native';
import { Identify } from '@amplitude/analytics-react-native';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import type { UserRole } from '@vitana/shared-types';

// PII sanitization
const FORBIDDEN_KEYS = ['name', 'email', 'phone', 'aadhaar', 'pan', 'password', 'token', 'refreshToken'];

function sanitize(props?: Record<string, unknown>): Record<string, unknown> {
  if (!props) return {};
  return Object.fromEntries(
    Object.entries(props).filter(([k]) =>
      !FORBIDDEN_KEYS.some(fk => k.toLowerCase().includes(fk))
    )
  );
}

// Amount bucket — never log raw INR amounts
export function getAmountBucket(amount: number): '<5k' | '5k-20k' | '20k-50k' | '>50k' {
  if (amount < 5000)  return '<5k';
  if (amount < 20000) return '5k-20k';
  if (amount < 50000) return '20k-50k';
  return '>50k';
}

export async function initAnalytics() {
  if (!process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY) return;
  await amplitude.init(process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY, undefined, {
    trackingOptions: {
      ipAddress: false,      // No IP tracking
      carrier: false,
      deviceManufacturer: true,
      deviceModel: true,
      osVersion: true,
      platform: true,
      versionName: true,
    },
  });
}

export function identifyUser(userId: string, role: UserRole, schoolId: string) {
  amplitude.setUserId(userId);  // UUID only, never email
  const identify = new Identify();
  identify.set('role', role);
  identify.set('schoolId', schoolId);  // OK — not PII
  identify.set('appVersion', Application.nativeApplicationVersion ?? '1.0.0');
  identify.set('platform', Platform.OS);
  amplitude.identify(identify);
}

export function resetAnalyticsUser() {
  amplitude.reset();
}

export type AnalyticsEvent =
  | 'login_success' | 'login_failed' | 'logout' | 'biometric_unlock'
  | 'attendance_viewed' | 'attendance_submitted' | 'attendance_offline_queued'
  | 'fee_payment_initiated' | 'fee_payment_completed' | 'fee_payment_failed'
  | 'result_viewed' | 'report_card_viewed'
  | 'assignment_viewed' | 'assignment_submitted' | 'assignment_graded'
  | 'marks_entry_submitted' | 'marks_entry_offline_queued'
  | 'leave_applied' | 'leave_approved' | 'leave_rejected'
  | 'announcement_opened' | 'announcement_published'
  | 'message_sent'
  | 'push_notification_tapped'
  | 'offline_queue_synced' | 'offline_conflict_resolved'
  | 'feature_unavailable_shown'
  | 'force_update_shown' | 'maintenance_mode_shown';

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  amplitude.track(event, sanitize(properties));
}
```

### 6.3 Screen Tracking Hook

```typescript
// mobile/src/hooks/useScreenTracking.ts
import { useSegments } from 'expo-router';
import { useEffect } from 'react';
import { track } from '../lib/analytics';

export function useScreenTracking() {
  const segments = useSegments();
  useEffect(() => {
    const screenName = segments.length > 0 ? segments.join('/') : 'home';
    // Don't log sensitive screen names
    const safeSegments = segments.filter(s => !s.startsWith('['));
    const safeName = safeSegments.length > 0 ? safeSegments.join('/') : 'dashboard';
    amplitude.track('screen_viewed', { screenName: safeName });
  }, [segments]);
}

import * as amplitude from '@amplitude/analytics-react-native';
```

### 6.4 Feature Error Boundary

```typescript
// mobile/src/components/common/FeatureErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { Feather } from '@expo/vector-icons';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

interface Props { featureName: string; children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.withScope(scope => {
      scope.setTag('feature', this.props.featureName);
      scope.setExtra('componentStack', info.componentStack);
      Sentry.captureException(error);
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center px-6 py-12">
          <Feather name="alert-circle" size={40} color={VITANA_DESIGN_TOKENS.colors.danger} />
          <Text className="font-heading text-base text-text-primary mt-4 text-center">
            {this.props.featureName} failed to load
          </Text>
          <Text className="font-body text-text-secondary text-center mt-2 text-sm">
            We've been notified. Please try again.
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            className="mt-6 px-6 py-3 rounded-xl"
            style={{ backgroundColor: VITANA_DESIGN_TOKENS.colors.primary }}
          >
            <Text className="font-body-semibold text-white">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
```

### 6.5 Wrap Feature Layouts

```typescript
// Add to every role _layout.tsx:
import { FeatureErrorBoundary } from '../../src/components/common/FeatureErrorBoundary';

// Wrap Tabs:
<FeatureErrorBoundary featureName="Parent Portal">
  <Tabs ...>
    ...
  </Tabs>
</FeatureErrorBoundary>
```

### 6.6 API Error Capture in Axios

```typescript
// mobile/src/api/client.ts — in error interceptor, ADD:
import * as Sentry from '@sentry/react-native';

// After 401/refresh handling, before throwing:
if (error.response?.status && error.response.status >= 500) {
  Sentry.withScope(scope => {
    scope.setTag('endpoint', error.config?.url ?? 'unknown');
    scope.setTag('httpMethod', error.config?.method?.toUpperCase() ?? 'UNKNOWN');
    scope.setTag('httpStatus', String(error.response!.status));
    scope.setExtra('correlationId', error.response?.headers?.['x-correlation-id']);
    // NEVER log request body (may contain passwords)
    Sentry.captureMessage(
      `API Error ${error.response.status}: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
      'error'
    );
  });
}
```

### 6.7 Post-Login Tracking

```typescript
// In useLogin hook (mobile/src/features/auth/hooks/useLogin.ts) — after setAuth():
import { identifyUser, track } from '../../../lib/analytics';
import * as Sentry from '@sentry/react-native';

// After successful login:
identifyUser(response.user.id, response.user.role, response.user.schoolId);
Sentry.setUser({ id: response.user.id });   // UUID only
Sentry.setTag('schoolId', response.user.schoolId);
Sentry.setTag('role', response.user.role);
track('login_success', { role: response.user.role, method: 'password' });
```

### 6.8 Key Event Implementations

Add these `track()` calls throughout the app:

```typescript
// In attendance marking (PROMPT-04):
track('attendance_submitted', {
  class_size: records.length,
  absent_count: records.filter(r => r.status === 'Absent').length,
  was_offline: !isConnected,
});

// In fee payment (PROMPT-03):
track('fee_payment_initiated', {
  amount_bucket: getAmountBucket(amount),  // NEVER log raw amount
  school_id: user.schoolId,               // OK — not PII
});
track('fee_payment_completed', {
  amount_bucket: getAmountBucket(amount),
  payment_method: 'upi',
  success: true,
});

// In logout (useLogout hook):
resetAnalyticsUser();
Sentry.setUser(null);

// In results view (parent):
track('result_viewed', { grade: result.grade, exam_type: result.examType });
// NEVER: track('result_viewed', { student_name: ... })

// In offline sync:
track('offline_queue_synced', {
  operation_type: item.operationType,
  wait_minutes: Math.round((Date.now() - item.createdAt) / 60000),
});

// In force update / maintenance:
track('force_update_shown', { current_version: Application.nativeApplicationVersion });
track('maintenance_mode_shown');
```

### 6.9 Performance Measurement Helper

```typescript
// mobile/src/lib/performance.ts
import * as Sentry from '@sentry/react-native';

export function measureScreenLoad(screenName: string) {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({ name: `screen_load_${screenName}` });
  Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction));

  return {
    complete: () => {
      const duration = Date.now() - startTime;
      transaction.finish();
      if (duration > 2000) {
        Sentry.captureMessage(`Slow screen load: ${screenName} (${duration}ms)`, 'warning');
      }
    },
  };
}
```

### 6.10 Root Layout Integration

```typescript
// mobile/app/_layout.tsx — UPDATE existing Sentry init:
import { initAnalytics } from '../src/lib/analytics';
import { useScreenTracking } from '../src/hooks/useScreenTracking';

// In RootLayout:
useEffect(() => {
  initAnalytics();
}, []);

// Inside a child component that uses the router:
function AppAnalytics() {
  useScreenTracking();
  return null;
}
// Add <AppAnalytics /> inside QueryClientProvider
```

### 6.11 CI: Source Maps Upload

```yaml
# .github/workflows/mobile-eas-production.yml — ADD after EAS build:
- name: Upload source maps to Sentry
  run: |
    npx @sentry/cli releases new "${{ steps.version.outputs.version }}+${{ needs.checks.outputs.build_number }}"
    npx @sentry/cli sourcemaps inject --org vitana-technologies --project vitana-mobile .expo/
    npx @sentry/cli sourcemaps upload \
      --org vitana-technologies \
      --project vitana-mobile \
      --release "${{ steps.version.outputs.version }}+${{ needs.checks.outputs.build_number }}" \
      .expo/
    npx @sentry/cli releases finalize "${{ steps.version.outputs.version }}+${{ needs.checks.outputs.build_number }}"
  working-directory: mobile
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
```

---

## PHASE 9: Testing & Validation

### 9.1 Tests

```typescript
// mobile/src/lib/__tests__/analytics.test.ts
import { sanitize, getAmountBucket } from '../analytics';

describe('sanitize', () => {
  it('removes forbidden keys', () => {
    const result = sanitize({ name: 'Aarav', role: 'Student', email: 'a@b.com' });
    expect(result).toEqual({ role: 'Student' });
    expect(result.name).toBeUndefined();
    expect(result.email).toBeUndefined();
  });

  it('keeps allowed keys', () => {
    const result = sanitize({ role: 'Parent', schoolId: 'abc', was_offline: true });
    expect(result).toEqual({ role: 'Parent', schoolId: 'abc', was_offline: true });
  });
});

describe('getAmountBucket', () => {
  it('buckets correctly', () => {
    expect(getAmountBucket(3000)).toBe('<5k');
    expect(getAmountBucket(10000)).toBe('5k-20k');
    expect(getAmountBucket(30000)).toBe('20k-50k');
    expect(getAmountBucket(100000)).toBe('>50k');
  });
});
```

### 9.2 Validation Checklist

- [ ] Throw an error intentionally in ParentDashboard → Sentry event within 30s
- [ ] Check Sentry event: no `Authorization` header visible
- [ ] Check Sentry event: user.id is a UUID (not an email address)
- [ ] Login with demo parent → check Amplitude user stream: `login_success` event with `role: "Parent"`
- [ ] Pay fee → `fee_payment_initiated` event has `amount_bucket` (not raw amount)
- [ ] Navigate 5 screens → 5 `screen_viewed` events in Amplitude
- [ ] Crash in fees screen → Error boundary shows fallback; Attendance still works
- [ ] Production build: check Sentry stack trace shows TypeScript filenames
- [ ] `sanitize({ name: 'Aarav', role: 'Student' })` returns `{ role: 'Student' }`

---

## PHASE 10: Documentation & Verification

### Verification Commands

```bash
# Install Amplitude
pnpm --filter @vitana/mobile add @amplitude/analytics-react-native

# Type check
pnpm --filter @vitana/mobile typecheck

# Run analytics tests
pnpm --filter @vitana/mobile test -- --testPathPattern=analytics

# Verify no PII in 10 sample events (manual review in Amplitude dashboard)
```

### Git Commit

```bash
git add .
git commit -m "feat(mobile/analytics): Sentry crash reporting + Amplitude analytics

- Sentry: full initialization with PII scrubbing (no auth tokens in events)
- Sentry Performance: screen load transactions, API error capture
- FeatureErrorBoundary: wraps all role portals and feature modules
- Error boundary: module crash doesn't crash other modules
- Amplitude: 25+ typed events with PII sanitization layer
- getAmountBucket: never log raw INR amounts
- sanitize(): removes forbidden keys (name, email, phone, aadhaar, etc.)
- useScreenTracking hook: auto screen view on every navigation
- identifyUser: UUID only, role, schoolId, appVersion
- Post-logout: reset analytics user + clear Sentry context
- Source maps upload in production CI workflow
- measureScreenLoad performance helper
- analytics.test.ts with PII enforcement tests

PRIVACY: Zero PII in any analytics event — enforced at sanitize() layer"
```

---

**END OF PROMPT-15**
