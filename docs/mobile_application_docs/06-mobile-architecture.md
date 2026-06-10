# Vitana Mobile Platform — Mobile Architecture

> **Classification:** Internal Architecture Document  
> **Version:** 1.0  
> **Date:** June 2026  
> **Related Docs:** [04-technology-recommendation](./04-technology-recommendation.md) · [07-feature-flag-architecture](./07-feature-flag-architecture.md) · [10-offline-architecture](./10-offline-architecture.md)

---

## 1. Architecture Overview

The Vitana mobile app is a **React Native (Expo SDK 52)** application using **Expo Router v4** for navigation. It follows a **feature-sliced architecture** where every domain (attendance, fees, exams, etc.) is a self-contained module with its own screens, components, hooks, and API bindings.

```
┌────────────────────────────────────────────────┐
│               Expo Router Shell                 │
│  (auth layout · role-based layout · tabs)       │
├────────────────────────────────────────────────┤
│                 Feature Modules                  │
│  auth · attendance · fees · exams · comms · ... │
├────────────────────────────────────────────────┤
│            Shared Infrastructure                 │
│  API Client · TanStack Query · Zustand Stores   │
│  Notifications · Offline Engine · Theme         │
├────────────────────────────────────────────────┤
│              Platform Bridges                    │
│  SecureStore · SQLite · FileSystem · Camera     │
│  PushNotifications · Biometrics · Payments      │
└────────────────────────────────────────────────┘
        │                      │
   ASP.NET Core API       Expo EAS / OTA
   (existing backend)
```

---

## 2. Folder Structure

```
mobile/
├── app/                          # Expo Router screens (file = route)
│   ├── _layout.tsx               # Root: SchoolContextProvider, QueryClient
│   ├── +not-found.tsx            # 404 screen
│   │
│   ├── (auth)/                   # Auth group (no tab bar)
│   │   ├── _layout.tsx           # Stack navigator
│   │   ├── index.tsx             # School selection / domain entry
│   │   ├── login.tsx             # Login form
│   │   ├── forgot-password.tsx
│   │   └── 2fa.tsx               # TOTP verification
│   │
│   ├── (parent)/                 # Parent portal (tab navigator)
│   │   ├── _layout.tsx           # Tab bar: Home, Fees, Results, More
│   │   ├── index.tsx             # Parent dashboard
│   │   ├── attendance/
│   │   │   └── [studentId].tsx   # Child attendance detail
│   │   ├── fees/
│   │   │   ├── index.tsx         # Fee summary
│   │   │   ├── pay.tsx           # Payment screen
│   │   │   └── receipt/[id].tsx  # Receipt viewer
│   │   ├── results/
│   │   │   └── [studentId].tsx   # Exam results
│   │   ├── announcements/
│   │   ├── diary/
│   │   ├── messages/
│   │   └── profile/
│   │
│   ├── (teacher)/                # Teacher portal
│   │   ├── _layout.tsx           # Tab bar: Home, Classes, Marks, More
│   │   ├── index.tsx             # Teacher dashboard
│   │   ├── attendance/
│   │   │   ├── index.tsx         # Select class
│   │   │   └── [classId].tsx     # Mark attendance
│   │   ├── marks/
│   │   │   ├── index.tsx         # Select exam
│   │   │   └── [examId]/[classId].tsx  # Marks entry grid
│   │   ├── timetable/
│   │   ├── assignments/
│   │   ├── diary/
│   │   └── leaves/
│   │
│   ├── (student)/                # Student portal
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Student dashboard
│   │   ├── timetable/
│   │   ├── results/
│   │   ├── assignments/
│   │   ├── attendance/
│   │   └── fees/
│   │
│   ├── (admin)/                  # Admin/Principal portal
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Admin dashboard
│   │   ├── approvals/            # Leave, admission approvals
│   │   ├── reports/              # Quick KPIs
│   │   ├── announcements/
│   │   └── settings/
│   │
│   └── (super-admin)/            # Super Admin portal (monitoring)
│       ├── _layout.tsx
│       └── schools/
│
├── src/
│   ├── api/
│   │   ├── client.ts             # Axios instance + interceptors
│   │   ├── queryClient.ts        # TanStack QueryClient config
│   │   └── endpoints/
│   │       ├── auth.ts
│   │       ├── attendance.ts
│   │       ├── fees.ts
│   │       ├── examinations.ts
│   │       ├── announcements.ts
│   │       ├── notifications.ts
│   │       ├── mobile.ts         # Aggregation endpoints
│   │       └── ...
│   │
│   ├── features/                 # Feature slices
│   │   ├── auth/
│   │   │   ├── hooks/
│   │   │   │   ├── useLogin.ts
│   │   │   │   └── useRefreshToken.ts
│   │   │   └── components/
│   │   │       └── LoginForm.tsx
│   │   ├── attendance/
│   │   │   ├── hooks/
│   │   │   │   ├── useStudentAttendance.ts
│   │   │   │   └── useMarkAttendance.ts
│   │   │   └── components/
│   │   │       ├── AttendanceGrid.tsx
│   │   │       └── AttendanceCalendar.tsx
│   │   ├── fees/
│   │   ├── examinations/
│   │   ├── announcements/
│   │   ├── notifications/
│   │   ├── assignments/
│   │   ├── timetable/
│   │   ├── diary/
│   │   ├── leave/
│   │   ├── messaging/
│   │   └── documents/
│   │
│   ├── components/               # Reusable UI components
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorState.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ConfirmSheet.tsx  # Bottom sheet confirm dialog
│   │   │   ├── SearchBar.tsx
│   │   │   └── RefreshableList.tsx
│   │   ├── navigation/
│   │   │   ├── TabBar.tsx        # Custom tab bar with school branding
│   │   │   └── Header.tsx        # School logo in header
│   │   └── charts/               # Lightweight chart components
│   │       ├── BarChart.tsx
│   │       └── AttendancePieChart.tsx
│   │
│   ├── stores/                   # Zustand stores
│   │   ├── authStore.ts          # User, tokens, logout action
│   │   ├── schoolStore.ts        # School branding, feature flags
│   │   ├── academicYearStore.ts  # Active academic year
│   │   └── offlineQueueStore.ts  # Pending offline operations
│   │
│   ├── offline/
│   │   ├── db.ts                 # expo-sqlite + Drizzle ORM setup
│   │   ├── schema.ts             # SQLite table definitions
│   │   ├── syncEngine.ts         # Online/offline state manager
│   │   └── queue.ts              # Offline write queue processor
│   │
│   ├── notifications/
│   │   ├── handler.ts            # Foreground/background notification handler
│   │   ├── deepLinks.ts          # Notification → route mapping
│   │   └── registration.ts       # FCM/APNS token registration
│   │
│   ├── lib/
│   │   ├── secureStorage.ts      # Expo SecureStore wrapper
│   │   ├── formatters.ts         # Re-export from @vitana/shared-utils
│   │   ├── validators.ts         # Re-export from @vitana/shared-utils
│   │   ├── constants.ts
│   │   └── analytics.ts          # Event tracking (Amplitude)
│   │
│   └── theme/
│       ├── index.ts              # Theme tokens
│       ├── useSchoolTheme.ts     # Dynamic school colors
│       └── tailwind.ts           # NativeWind theme extension
│
├── app.config.js                 # Dynamic config (reads SCHOOL_ID + SCHOOL_CONFIG)
├── eas.json                      # EAS build profiles
└── package.json
```

---

## 3. Navigation Architecture

### 3.1 Expo Router File Hierarchy

Expo Router maps the `app/` directory to URL routes. Groups `(parent)`, `(teacher)`, `(student)`, `(admin)` are **presentation-only** — they don't appear in the URL. This allows:

```
/login            → app/(auth)/login.tsx
/                 → app/(parent)/index.tsx   (after parent login)
/fees             → app/(parent)/fees/index.tsx
/fees/receipt/123 → app/(parent)/fees/receipt/[id].tsx
```

Deep links from push notifications use these URL paths directly.

### 3.2 Role-Based Root Layout

```
_layout.tsx (root)
├── Checks auth state from authStore
├── If unauthenticated → redirect to /(auth)/login
├── If authenticated → redirect based on role:
│   ├── Parent    → /(parent)
│   ├── Teacher   → /(teacher)
│   ├── Student   → /(student)
│   ├── Admin     → /(admin)
│   └── SuperAdmin → /(super-admin)
```

The root layout also:
- Loads app configuration (`GET /api/mobile/app-config`) on first render.
- Applies school branding theme via `SchoolThemeProvider`.
- Registers FCM/APNS device token.
- Initializes the offline database.

### 3.3 Tab Structures

**Parent Tabs:**
```
🏠 Home | 📋 Attendance | 💰 Fees | 📝 Results | ☰ More
```

**Teacher Tabs:**
```
🏠 Home | ✅ Classes | 📊 Marks | 📅 Timetable | ☰ More
```

**Student Tabs:**
```
🏠 Home | 📅 Schedule | 📝 Results | 📚 Assignments | ☰ More
```

**Admin Tabs:**
```
🏠 Dashboard | ✅ Approvals | 📢 Announcements | 📊 Reports | ☰ More
```

---

## 4. State Management

### 4.1 TanStack Query v5 (Server State)

All API data is managed by TanStack Query. No Redux or useState for server data.

```typescript
// src/features/attendance/hooks/useStudentAttendance.ts
export function useStudentAttendance(studentId: string, month: string) {
  return useQuery({
    queryKey: ['attendance', 'student', studentId, month],
    queryFn: () => attendanceApi.getStudentMonthly(studentId, month),
    staleTime: 5 * 60 * 1000,    // 5 minutes
    gcTime: 30 * 60 * 1000,      // 30 minutes in cache
    enabled: !!studentId,
  });
}
```

**Query key conventions:**
```typescript
['attendance', 'student', studentId, month]   // student attendance
['fees', 'records', studentId]                 // fee records
['announcements', schoolId]                    // announcements
['notifications', userId]                      // notifications
['timetable', classId, academicYear]           // timetable
```

**Optimistic updates for attendance marking:**
```typescript
const markAttendance = useMutation({
  mutationFn: attendanceApi.bulkMark,
  onMutate: async (newRecords) => {
    await queryClient.cancelQueries({ queryKey: ['attendance', 'class', classId, today] });
    const previous = queryClient.getQueryData(['attendance', 'class', classId, today]);
    queryClient.setQueryData(['attendance', 'class', classId, today], (old) =>
      mergeAttendanceRecords(old, newRecords)
    );
    return { previous };
  },
  onError: (err, variables, context) => {
    queryClient.setQueryData(['attendance', 'class', classId, today], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['attendance', 'class', classId] });
  },
});
```

### 4.2 Zustand Stores (Local/Session State)

```typescript
// src/stores/authStore.ts
interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: UserProfile, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
      updateTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
    }),
    {
      name: 'auth-storage',
      storage: createSecureStorage(),  // Expo SecureStore adapter
    }
  )
);
```

```typescript
// src/stores/schoolStore.ts
interface SchoolState {
  branding: SchoolBranding | null;
  featureFlags: FeatureFlags | null;
  academicYear: string | null;
  isConfigLoaded: boolean;
  setAppConfig: (config: AppConfig) => void;
}
```

### 4.3 State Layers Summary

| Data Type | Storage | Why |
|---|---|---|
| JWT tokens | Zustand + SecureStore | Persisted across sessions, secure |
| User profile | Zustand + SecureStore | Fast access, persisted |
| School branding | Zustand + AsyncStorage | Needs to survive cold start |
| Feature flags | TanStack Query + AsyncStorage | Refreshes from server, cached |
| API list data | TanStack Query in-memory | Auto-managed, garbage collected |
| Offline queue | expo-sqlite | Durable, survives app kill |
| Form state | React Hook Form | Ephemeral, component-local |

---

## 5. Networking

### 5.1 API Client

```typescript
// src/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: inject auth + academic year headers
apiClient.interceptors.request.use(async (config) => {
  const { accessToken, user } = useAuthStore.getState();
  const { academicYear } = useAcademicYearStore.getState();
  
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (academicYear) {
    config.headers['X-Academic-Year'] = academicYear;
  }
  config.headers['X-Correlation-ID'] = generateUUID();
  
  return config;
});

// Response interceptor: unwrap envelope + handle 401
apiClient.interceptors.response.use(
  (response) => response.data.data,   // unwrap { success, data }
  async (error) => {
    if (error.response?.status === 401) {
      return handleTokenRefresh(error);
    }
    throw normalizeApiError(error);
  }
);
```

### 5.2 Token Refresh Queue

Multiple concurrent requests can fail with 401. The refresh logic must queue them:

```typescript
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

function processQueue(error: Error | null, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

async function handleTokenRefresh(originalError: AxiosError) {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    }).then(token => {
      originalError.config!.headers.Authorization = `Bearer ${token}`;
      return apiClient(originalError.config!);
    });
  }

  isRefreshing = true;
  const { refreshToken, updateTokens, clearAuth } = useAuthStore.getState();

  try {
    const result = await authApi.refresh(refreshToken!);
    updateTokens(result.token, result.refreshToken);
    processQueue(null, result.token);
    originalError.config!.headers.Authorization = `Bearer ${result.token}`;
    return apiClient(originalError.config!);
  } catch (refreshError) {
    processQueue(refreshError as Error, null);
    clearAuth();
    router.replace('/(auth)/login');
    return Promise.reject(refreshError);
  } finally {
    isRefreshing = false;
  }
}
```

---

## 6. Authentication Flow

```
App Launch
    │
    ▼
Load SecureStore tokens
    │
    ├── No tokens → Login Screen
    │
    └── Tokens found
            │
            ▼
        Check token expiry (JWT decode)
            │
            ├── Valid → Load app config → Navigate to role dashboard
            │
            └── Expired → Call /api/auth/refresh
                        │
                        ├── Success → Store new tokens → Navigate
                        └── Failure → Clear tokens → Login Screen

Login Screen
    │
    ▼
(Dedicated app) → School pre-loaded
(Shared app) → User enters school domain/code
    │
    ▼
Load public branding (GET /api/settings/public-branding)
    │
    ▼
User enters credentials → POST /api/auth/login
    │
    ├── 2FA required → 2FA screen → POST /api/auth/2fa/login
    │
    └── Success → Store tokens → Load app config → Navigate to role dashboard
```

---

## 7. Secure Storage

All sensitive data stored in device secure enclave:

| Data | Storage Location | Encryption |
|---|---|---|
| Access token | Expo SecureStore | iOS Keychain / Android Keystore |
| Refresh token | Expo SecureStore | iOS Keychain / Android Keystore |
| User profile | Expo SecureStore | iOS Keychain / Android Keystore |
| School branding | AsyncStorage | Unencrypted (public data) |
| Feature flags | AsyncStorage | Unencrypted (public data) |
| Offline SQLite DB | expo-sqlite (encrypted) | SQLCipher encryption |

**SecureStore limits:** iOS Keychain items are limited to ~2KB. The user profile and tokens fit well within this. Larger cached data goes to AsyncStorage or SQLite.

---

## 8. Biometric Authentication

After initial password login, users can enable biometric unlock:

1. First login: password authentication. Store token in SecureStore.
2. User enables biometrics in settings.
3. Subsequent app opens: biometric challenge (`expo-local-authentication`).
4. On success: read token from SecureStore directly.
5. Token refresh happens transparently in background if expired.

This does not replace server-side authentication — the server token is always required. Biometrics only controls access to the stored token.

---

## 9. Deep Linking

Expo Router generates deep link scheme from file structure:

**URL Scheme (Shared App):** `vitanasms://`  
**Universal Link Domain:** `app.vitanasms.com`

**Deep Link Examples:**
```
vitanasms://fees/pay?studentId=abc123
vitanasms://attendance/class/Section-A
vitanasms://results/studentId/abc123/examId/xyz
vitanasms://announcements/id/456
```

Push notification payloads include the deep link URL. When notification is tapped:
```typescript
// src/notifications/deepLinks.ts
export const notificationDeepLinks: Record<string, (data: any) => string> = {
  'fee_due': (data) => `/fees?studentId=${data.studentId}`,
  'attendance_marked': (data) => `/attendance/${data.studentId}`,
  'result_published': (data) => `/results/${data.studentId}`,
  'new_announcement': (data) => `/announcements/${data.announcementId}`,
  'leave_approved': () => `/leaves`,
  'assignment_graded': (data) => `/assignments/${data.assignmentId}`,
};
```

---

## 10. Performance Architecture

### 10.1 List Performance

All long lists use `FlashList` (Shopify) for virtualized rendering:

```typescript
<FlashList
  data={students}
  renderItem={({ item }) => <StudentCard student={item} />}
  estimatedItemSize={72}
  keyExtractor={(item) => item.id}
/>
```

### 10.2 Image Optimization

- Use `expo-image` with `contentFit="cover"` and `placeholder` (blurhash).
- Student/staff photos are served from S3 with CloudFront CDN.
- Progressive loading for document previews.

### 10.3 Bundle Splitting

Expo Router performs automatic bundle splitting per route group. The parent group's bundle is not loaded until a parent logs in.

### 10.4 Memory Management

- TanStack Query `gcTime: 30 minutes` — cached data is garbage-collected.
- FlashList handles view recycling (not React Native FlatList).
- Image memory pressure: `expo-image` auto-evicts from memory on low-memory events.

### 10.5 Startup Performance Targets

| Metric | Target | Strategy |
|---|---|---|
| Time to login screen | < 1.5s (cold start) | Minimal root layout, deferred auth check |
| Time to dashboard | < 2s (warm start, cached data) | Stale-while-revalidate |
| Attendance grid load | < 800ms | Pagination (30 students), skeleton UI |
| Fee payment initiation | < 1s | Pre-fetch payment config |

---

## 11. Error Handling

All errors follow a unified pattern:

```typescript
// src/lib/errors.ts
export class ApiError extends Error {
  status: number;
  traceId?: string;

  constructor(message: string, status: number, traceId?: string) {
    super(message);
    this.status = status;
    this.traceId = traceId;
  }
}
```

UI error handling:
- Network errors → "No internet connection" banner + retry button.
- 401 errors → automatic token refresh (transparent to user).
- 403 errors → "You don't have permission for this" with back button.
- 404 errors → "Not found" empty state.
- 500 errors → "Something went wrong" + report button (triggers Sentry).

---

## 12. Analytics & Observability

| Event | Tool | Trigger |
|---|---|---|
| Screen view | Amplitude | Expo Router `useSegments()` hook |
| User login | Amplitude | Post-login |
| Feature usage | Amplitude | Key user actions (mark attendance, pay fee) |
| Crash | Sentry | Automatic via Sentry RN SDK |
| ANR / slow frame | Sentry Performance | Automatic |
| API error | Sentry | In API error interceptor |
| Custom events | Amplitude | Business-critical actions |

---

## 13. Testing Strategy

| Layer | Tool | Coverage Target |
|---|---|---|
| Unit (hooks, utils) | Jest + React Native Testing Library | 80%+ |
| Component | React Native Testing Library | Key components |
| Integration | Jest with MSW (mock service worker RN) | Critical flows |
| E2E | Maestro | Core user journeys |

**E2E Maestro test flows:**
1. Login → Parent Dashboard → View Attendance
2. Login → Teacher → Mark Attendance for Class
3. Login → Parent → Pay Fee via Cashfree
4. Login → Student → Submit Assignment
5. Login → Admin → Approve Staff Leave

---

*Next: [07-feature-flag-architecture.md](./07-feature-flag-architecture.md)*
