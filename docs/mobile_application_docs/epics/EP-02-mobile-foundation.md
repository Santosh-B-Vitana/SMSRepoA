# EP-02: Mobile Foundation & Architecture

> **Epic ID:** EP-02  
> **Priority:** P0  
> **Estimated Sprints:** 2  
> **Phase:** 1 — Sprints 1–2  
> **Related Docs:** [06-mobile-architecture](../06-mobile-architecture.md) · [05-repository-strategy](../05-repository-strategy.md) · [PROMPT-01](../12-cursor-prompts/PROMPT-01-project-setup.md)

---

## Business Objective

Every subsequent mobile feature depends on a correctly-built foundation. Rushing past the architecture phase creates compound debt across every screen built afterward. This epic has zero user-facing output but is the highest-leverage investment in the entire mobile program.

## Technical Objective

Establish the `mobile/` workspace in the monorepo; create `@vitana/shared-types` and `@vitana/shared-utils` packages; implement the Expo Router navigation skeleton; build the API client with auth interceptors, token refresh queue, and envelope unwrapping; configure Zustand stores with SecureStore persistence; set up NativeWind theming; and integrate Sentry crash reporting.

---

## Current State Analysis

- The existing `SMSRepoA` monorepo has a `ui/` pnpm workspace package.
- `pnpm-workspace.yaml` declares only `ui`.
- No mobile directory exists.
- No shared type definitions exist between web and mobile.
- The backend API returns a standard `{ success, data, message, correlationId }` envelope on every response.
- JWT tokens contain: `userId`, `schoolId`, `role`, `linkedEntityId`, `email`.
- Token lifetime: 60 minutes. Refresh token is single-use, rotated on every refresh.

---

## Future State Design

```
SMSRepoA/
├── mobile/                    ← NEW Expo SDK 52 app
├── packages/
│   ├── shared-types/          ← NEW @vitana/shared-types
│   └── shared-utils/          ← NEW @vitana/shared-utils
├── ui/                        ← existing (unchanged)
└── pnpm-workspace.yaml        ← UPDATED to include new packages
```

---

## Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | `mobile/` Expo SDK 52 project initialized in monorepo |
| FR-2 | `@vitana/shared-types` package with all API response types |
| FR-3 | `@vitana/shared-utils` package with formatters, validators, constants |
| FR-4 | Expo Router v4 file-based navigation with role groups |
| FR-5 | API client unwraps `{ success, data }` envelope automatically |
| FR-6 | API client injects `Authorization`, `X-Academic-Year`, `X-Correlation-ID` headers |
| FR-7 | 401 responses trigger queued token refresh (no duplicate refresh calls) |
| FR-8 | Auth store persists tokens to Expo SecureStore |
| FR-9 | School store holds branding, feature flags, academic year |
| FR-10 | Root layout routes authenticated users to correct role group |
| FR-11 | NativeWind + school theme tokens configured |
| FR-12 | Sentry SDK initialized with school context in user scope |
| FR-13 | TanStack Query client configured with sensible defaults |
| FR-14 | Empty placeholder screens for all 5 role groups |
| FR-15 | `pnpm install` from workspace root resolves all dependencies |

---

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | Cold start to auth screen: < 1.5 seconds (Hermes engine) |
| NFR-2 | TypeScript strict mode, zero `any` types across all foundation files |
| NFR-3 | All foundation files ≥ 80% unit test coverage |
| NFR-4 | Works on Android API 24+ and iOS 16.0+ |
| NFR-5 | Bundle size < 2 MB for the navigation skeleton (before any screens) |

---

## Technical Stack Decisions

| Component | Choice | Rationale |
|---|---|---|
| Framework | Expo SDK 52, New Architecture | Fabric + JSI; official recommendation |
| Navigation | Expo Router v4 | File-based routing mirrors Next.js; deep links auto-generated |
| Server state | TanStack Query v5 | Matches existing web stack; no context boilerplate |
| Local state | Zustand v5 | Minimal boilerplate; devtools support |
| Styling | NativeWind v4 | Share Tailwind config with `ui/`; class-based styling |
| HTTP | Axios 1.7 | Interceptor pattern; already used in web |
| Secure storage | expo-secure-store | Keychain (iOS) / Keystore (Android) |
| Crash reporting | @sentry/react-native | Matches backend Sentry integration; correlates via `X-Correlation-ID` |
| Analytics | Amplitude | Usage tracking |
| Lists | @shopify/flash-list | 10× faster than FlatList for large lists |
| Forms | react-hook-form + zod | Matches web form stack |

---

## Shared Packages Design

### `@vitana/shared-types`

All TypeScript interfaces for API request/response contracts. Consumed by both `ui/` and `mobile/`.

**Critical types to define in Sprint 1:**
- `UserProfile`, `UserRole`, `LoginResponse`, `RefreshTokenResponse`
- `AppConfig`, `SchoolBranding`, `FeatureFlags`, `ModuleFlags`, `VersionRequirements`
- `StudentAttendanceRecord`, `AttendanceStatus`
- `FeeRecord`, `FeeHeadRecord`, `PaymentRecord`
- `ExamResult`, `SubjectResult`, `ReportCardSummary`
- `Announcement`, `DiaryEntry`
- `AppNotification`, `NotificationType`
- `ApiResponse<T>` envelope type
- `PaginatedResponse<T>` for list endpoints

### `@vitana/shared-utils`

Pure functions, no React/RN dependencies. Testable in Node.js.

**Critical utilities:**
- `formatINR(amount: number): string` — Indian Rupee formatting
- `formatDateIST(iso: string): string` — display in UTC+5:30
- `formatRelativeTime(iso: string): string` — "2 hours ago", "Yesterday"
- `formatAttendancePercent(present: number, total: number): string`
- `maskAadhaar(aadhaar: string): string` — "XXXX-XXXX-1234"
- `maskPAN(pan: string): string`
- `getAttendanceColor(percent: number): 'green' | 'amber' | 'red'`
- `getGradeBadgeColor(grade: string): string`
- `isValidPhone(phone: string): boolean`
- `isValidEmail(email: string): boolean`
- `generateUUID(): string`
- `semverLt(a: string, b: string): boolean`

---

## Navigation Architecture

```
app/
├── _layout.tsx          ← Root: QueryProvider + ThemeProvider + auth guard
├── +not-found.tsx       ← 404
├── maintenance.tsx      ← Maintenance mode full-screen
├── force-update.tsx     ← Force update blocking screen
│
├── (auth)/
│   ├── _layout.tsx      ← Stack navigator
│   ├── index.tsx        ← School domain entry (shared app) / redirect (white-label)
│   └── login.tsx        ← Login form
│
├── (parent)/
│   ├── _layout.tsx      ← Tab navigator: Home | Attendance | Fees | Results | More
│   └── index.tsx        ← Placeholder
│
├── (teacher)/
│   ├── _layout.tsx      ← Tab navigator: Home | Classes | Marks | Timetable | More
│   └── index.tsx        ← Placeholder
│
├── (student)/
│   ├── _layout.tsx      ← Tab navigator: Home | Schedule | Results | Assignments | More
│   └── index.tsx        ← Placeholder
│
├── (admin)/
│   ├── _layout.tsx      ← Tab navigator: Dashboard | Approvals | Post | Reports | More
│   └── index.tsx        ← Placeholder
│
└── (super-admin)/
    ├── _layout.tsx      ← Stack navigator
    └── index.tsx        ← Placeholder
```

**Root layout role routing logic:**

| JWT Role | Redirects To |
|---|---|
| `Parent` | `/(parent)` |
| `Student` | `/(student)` |
| `Teacher`, `Staff`, `Librarian`, `TransportManager`, `HostelWarden`, `Receptionist` | `/(teacher)` |
| `Admin`, `Principal`, `HRManager`, `Accountant` | `/(admin)` |
| `SuperAdmin` | `/(super-admin)` |

---

## API Client Configuration

### Request interceptor chain

```
1. Read accessToken from authStore (Zustand)
2. Inject: Authorization: Bearer <token>
3. Read academicYear from academicYearStore
4. Inject: X-Academic-Year: <year>   (if academicYear set)
5. Generate UUID → inject: X-Correlation-ID: <uuid>
6. Forward request
```

### Response interceptor chain

```
Success (2xx):
  → Unwrap response.data.data  (removes the { success, data } envelope)
  → Return raw data object

Error (non-2xx):
  → If 401:
      If already refreshing → queue request, await refresh
      Else → trigger refresh queue
        On refresh success → retry original request with new token
        On refresh failure → clearAuth() → router.replace('/(auth)/login')
  → Otherwise → normalizeApiError(error) → throw ApiError
```

### TanStack QueryClient defaults

```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 minutes
      gcTime: 30 * 60 * 1000,           // 30 minutes
      retry: (count, error) => {
        if ((error as ApiError).status === 401) return false;
        if ((error as ApiError).status === 403) return false;
        return count < 2;
      },
      refetchOnWindowFocus: true,
      placeholderData: (prev) => prev,   // stale-while-revalidate
    },
    mutations: {
      retry: 0,
    },
  },
});
```

---

## Zustand Store Structure

### `authStore`

```typescript
{
  user: UserProfile | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  // Actions
  setAuth(user, accessToken, refreshToken): void
  clearAuth(): void
  updateTokens(accessToken, refreshToken): void
}
// Persistence: Expo SecureStore via custom storage adapter
// Key: 'vitana-auth-storage'
```

### `schoolStore`

```typescript
{
  branding: SchoolBranding | null
  featureFlags: Record<string, boolean>
  moduleFlags: Record<string, boolean>
  academicYear: string | null
  schoolDomain: string | null
  isConfigLoaded: boolean
  // Actions
  setAppConfig(config: AppConfig): void
  setBranding(branding: SchoolBranding): void
  resetBranding(): void  // called on logout
  setAcademicYear(year: string): void
}
// Persistence: AsyncStorage (public data, OK to persist plaintext)
// Key: 'vitana-school-storage'
```

### `offlineQueueStore`

```typescript
{
  pendingCount: number
  isSyncing: boolean
  lastSyncAt: number | null
  failedCount: number
  // Actions
  setPendingCount(count: number): void
  setIsSyncing(syncing: boolean): void
  incrementFailed(): void
  recordSync(): void
}
// No persistence — reads from SQLite on mount
```

---

## Sentry Configuration

```typescript
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_ENV,
  tracesSampleRate: 0.2,
  beforeSend: (event) => {
    // Scrub Authorization header from all requests
    if (event.request?.headers?.Authorization) {
      event.request.headers.Authorization = '[Filtered]';
    }
    return event;
  },
});

// After login: set user context
Sentry.setUser({
  id: user.id,
  // Never set email or name — school data privacy
});

// Set school context tag
Sentry.setTag('schoolId', user.schoolId);
Sentry.setTag('role', user.role);

// Correlation ID: set on every API call as Sentry breadcrumb
```

---

## User Stories

| ID | Story | SP |
|---|---|---|
| EP-02-US-01 | As a developer, monorepo setup with shared packages | 8 |
| EP-02-US-02 | As a developer, API client with all interceptors | 5 |
| EP-02-US-03 | As a developer, app configuration loading with caching | 5 |
| EP-02-US-04 | As a developer, Sentry + analytics initialization | 3 |
| EP-02-US-05 | As a developer, NativeWind theme with school color tokens | 3 |
| EP-02-US-06 | As a developer, complete folder structure and navigation skeleton | 8 |

**Total:** 32 story points / 2 sprints

---

## Acceptance Criteria

- [ ] `pnpm install` from repo root resolves all workspace packages without errors.
- [ ] `pnpm --filter @vitana/shared-types build` succeeds in CI.
- [ ] `pnpm --filter @vitana/mobile tsc --noEmit` reports 0 errors.
- [ ] `pnpm --filter @vitana/mobile lint` reports 0 errors.
- [ ] App cold-starts to auth screen in < 1.5s on mid-range Android (Pixel 4a).
- [ ] API client injects `Authorization` header on every authenticated request.
- [ ] `X-Correlation-ID` header is a different UUID on every request.
- [ ] 401 response with multiple concurrent requests triggers exactly one refresh call.
- [ ] Auth store tokens survive app kill + restart (SecureStore persistence).
- [ ] School store branding survives app restart (AsyncStorage persistence).
- [ ] Sentry captures unhandled errors; `Authorization` header is filtered.
- [ ] Unauthenticated user navigating to `/(parent)/` is redirected to `/(auth)/`.

---

## Dependencies

| Dependency | Status | Owner |
|---|---|---|
| Expo SDK 52 | Available | Mobile team |
| `pnpm-workspace.yaml` | Requires update | Mobile team |
| TanStack Query v5 | Available | Mobile team |
| Zustand v5 | Available | Mobile team |
| Expo SecureStore | Available | Mobile team |
| NativeWind v4 | Available | Mobile team |
| Sentry account / DSN | Needs provisioning | DevOps |
| Expo EAS project ID | Needs provisioning | DevOps |

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| NativeWind v4 compatibility with Expo SDK 52 | Medium | Test NativeWind setup first (30 min spike in Sprint 1 Day 1) |
| SecureStore limits (2KB per item) | Low | UserProfile + tokens well under 2KB; test with realistic data |
| Expo Router v4 breaking changes from v3 | Low | Using latest stable; no existing codebase to migrate |

---

## Sprint Breakdown

| Sprint | Work |
|---|---|
| Sprint 1 | Shared packages, Expo project init, folder structure, API client, auth store, navigation skeleton |
| Sprint 2 | School store, NativeWind theme, Sentry setup, analytics init, app config loading, integration tests |

---

## Testing Strategy

- Unit: `authStore` actions (setAuth, clearAuth, updateTokens).
- Unit: `handleTokenRefresh` — queue pattern with 5 concurrent 401s → only 1 refresh call.
- Unit: `formatINR`, `formatDateIST`, `maskAadhaar`, `getAttendanceColor` from shared-utils.
- Unit: `getAttendanceColor(95)` → `'green'`; `(74)` → `'red'`.
- Integration: Mount root layout with no tokens → verify redirect to `/(auth)/`.
- Integration: Mount root layout with valid parent token → verify redirect to `/(parent)`.

---

## Monitoring

- Sentry: App startup errors, JS exceptions.
- Analytics: App launch event with `platform`, `appVersion`, `schoolId`.
- CI: TypeScript check + lint + unit tests run on every PR.
