# PROMPT-01: Mobile Project Setup & Foundation

> **Prompt ID:** PROMPT-01  
> **Epic:** EP-02 — Mobile Foundation & Architecture  
> **Phase:** 1 — Sprint 1–2  
> **Estimated Story Points:** 27  
> **Prerequisites:** None  
> **Related Architecture Docs:** [06-mobile-architecture](../06-mobile-architecture.md) · [05-repository-strategy](../05-repository-strategy.md) · [04-technology-recommendation](../04-technology-recommendation.md)

---

## Context

You are building the mobile application foundation for **Vitana SMS**, a production-grade School ERP serving Indian K-12 schools. The existing system has:

- **Backend:** ASP.NET Core 8, JWT auth, multi-tenant (database-per-tenant), all APIs at `https://api.vitanasms.com/api`
- **Web frontend:** React 19 + Vite 6 at `ui/` in the monorepo
- **Repository:** `SMSRepoA` — a pnpm monorepo
- **Existing `pnpm-workspace.yaml`** declares `ui` as a workspace package

You are creating the `mobile/` directory as a new workspace package within this existing monorepo, plus shared `packages/` for types and utilities.

---

## Architecture References

Before implementing, read and understand:
- `docs/mobile_application_docs/06-mobile-architecture.md` — full folder structure, state management, networking
- `docs/mobile_application_docs/05-repository-strategy.md` — monorepo structure, shared packages
- `docs/mobile_application_docs/04-technology-recommendation.md` — tech stack choices

---

## Requirements

### 1. Shared Packages (create `packages/` directory)

Create `packages/shared-types/` with:
- `package.json`: name `@vitana/shared-types`, TypeScript library
- `src/api/auth.ts`: `LoginRequest`, `LoginResponse`, `UserProfile`, `UserRole` type
- `src/api/attendance.ts`: `StudentAttendanceRecord`, `AttendanceStatus` type
- `src/api/fees.ts`: `FeeRecord`, `PaymentRecord` types
- `src/api/examinations.ts`: `ExamResult`, `ReportCard` types
- `src/api/announcements.ts`: `Announcement` type
- `src/api/notifications.ts`: `AppNotification` type
- `src/api/mobile.ts`: `AppConfig`, `SchoolBranding`, `FeatureFlags`, `ModuleFlags` types
- `src/index.ts`: barrel export all types
- `tsconfig.json`: strict TypeScript config
- `build` script using `tsc`

Create `packages/shared-utils/` with:
- `package.json`: name `@vitana/shared-utils`
- `src/formatters.ts`: `formatINR(amount)`, `formatDate(iso)`, `formatDateIST(iso)`, `formatAttendancePercent(present, total)`, `maskAadhaar(number)`, `formatAcademicYear(year)`
- `src/validators.ts`: `isValidPhone(phone)`, `isValidEmail(email)`, `isValidAadhaar(number)`
- `src/constants.ts`: `UserRole` enum values, `AttendanceStatus` values, `ACADEMIC_YEAR_HEADER`, `IST_TIMEZONE`
- `src/index.ts`: barrel export
- Tests for formatters (Jest)

Update `pnpm-workspace.yaml` to include `packages/*` and `mobile`.

### 2. Mobile App (`mobile/`)

#### 2.1 Expo Project Initialization

Initialize with Expo SDK 52, TypeScript template, Expo Router v4 (file-based routing).

Required `package.json` dependencies:
```json
{
  "expo": "~52.0.0",
  "expo-router": "~4.0.0",
  "react": "18.3.2",
  "react-native": "0.76.0",
  "@tanstack/react-query": "^5.60.0",
  "zustand": "^5.0.0",
  "axios": "^1.7.0",
  "nativewind": "^4.1.0",
  "tailwindcss": "^3.4.0",
  "expo-secure-store": "~14.0.0",
  "expo-local-authentication": "~15.0.0",
  "expo-image": "~2.0.0",
  "expo-file-system": "~18.0.0",
  "expo-web-browser": "~14.0.0",
  "@shopify/flash-list": "^1.7.0",
  "react-hook-form": "^7.54.0",
  "zod": "^3.23.0",
  "@vitana/shared-types": "workspace:*",
  "@vitana/shared-utils": "workspace:*"
}
```

#### 2.2 File Structure

Create the exact folder structure defined in `docs/mobile_application_docs/06-mobile-architecture.md` Section 2:

```
mobile/
├── app/
│   ├── _layout.tsx
│   ├── +not-found.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx          ← school domain entry (placeholder)
│   │   └── login.tsx          ← placeholder
│   ├── (parent)/
│   │   ├── _layout.tsx        ← parent tab navigator
│   │   └── index.tsx          ← placeholder dashboard
│   ├── (teacher)/
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   ├── (student)/
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   └── (admin)/
│       ├── _layout.tsx
│       └── index.tsx
├── src/
│   ├── api/
│   │   ├── client.ts          ← Axios instance (auth interceptors)
│   │   ├── queryClient.ts     ← TanStack QueryClient config
│   │   └── endpoints/
│   │       └── auth.ts        ← login, refresh, logout calls
│   ├── stores/
│   │   ├── authStore.ts       ← Zustand auth store
│   │   ├── schoolStore.ts     ← Zustand school/branding store
│   │   └── academicYearStore.ts
│   ├── lib/
│   │   ├── secureStorage.ts   ← Expo SecureStore wrapper
│   │   └── constants.ts
│   └── theme/
│       ├── index.ts
│       └── tokens.ts
├── app.config.js
├── eas.json
├── tailwind.config.js
├── metro.config.js
├── babel.config.js
├── tsconfig.json
└── package.json
```

#### 2.3 Root Layout (`app/_layout.tsx`)

Must:
- Wrap the entire app in `QueryClientProvider` (TanStack Query).
- Wrap in `SchoolThemeProvider` (reads branding from schoolStore).
- Check authentication state from `authStore`.
- If unauthenticated → redirect to `/(auth)/`.
- If authenticated → redirect to role-appropriate group based on `user.role`.
- Load fonts: Inter, Poppins (via `expo-font` or Google Fonts).

#### 2.4 API Client (`src/api/client.ts`)

Implement exactly as described in `docs/mobile_application_docs/06-mobile-architecture.md` Section 5:
- Axios instance with `EXPO_PUBLIC_API_BASE_URL` base.
- Request interceptor: inject `Authorization: Bearer <token>` from `authStore`.
- Request interceptor: inject `X-Academic-Year` from `academicYearStore`.
- Request interceptor: inject `X-Correlation-ID` (UUID v4).
- Response interceptor: unwrap `response.data.data` (the API envelope).
- Response interceptor: handle 401 with the queue-based refresh pattern.
- On refresh failure: call `authStore.clearAuth()` + navigate to login.

The refresh interceptor must use the queue pattern to avoid multiple simultaneous refresh calls.

#### 2.5 Auth Store (`src/stores/authStore.ts`)

Implement with Zustand + `persist` middleware using `createSecureStorage()` adapter (Expo SecureStore):

```typescript
interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  // Actions
  setAuth: (user: UserProfile, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
}
```

#### 2.6 School Store (`src/stores/schoolStore.ts`)

```typescript
interface SchoolState {
  branding: SchoolBranding | null;
  featureFlags: FeatureFlags | null;
  moduleFlags: ModuleFlags | null;
  academicYear: string | null;
  isConfigLoaded: boolean;
  setAppConfig: (config: AppConfig) => void;
  resetBranding: () => void;
}
```

#### 2.7 Dynamic App Config (`app.config.js`)

Implement dynamic Expo config reading `SCHOOL_ID` environment variable. When `SCHOOL_ID=vitana` (default), use Vitana branding. Structure as shown in `docs/mobile_application_docs/08-white-label-architecture.md` Section 5.1.

#### 2.8 EAS Configuration (`eas.json`)

Implement as shown in `docs/mobile_application_docs/11-build-automation.md` Section 3, including:
- `development` profile (internal distribution)
- `preview` profile (APK for PR builds)
- `staging` profile
- `production` profile
- `school-production` profile

#### 2.9 NativeWind + Theme

Configure NativeWind v4 with:
- `tailwind.config.js` extending default colors with Vitana tokens: `primary`, `accent`, `sidebar`.
- `metro.config.js` including NativeWind babel plugin.
- A `useSchoolTheme()` hook that returns the school's primary color from `schoolStore`.

---

## Constraints

- Do NOT implement any feature screens. This prompt creates ONLY the skeleton.
- Do NOT create database migrations or backend code.
- TypeScript strict mode — no `any` types anywhere.
- All components must have proper TypeScript types.
- No inline styles — use NativeWind classes or `StyleSheet.create()`.
- Follow the exact folder structure in the architecture doc.

---

## Implementation Tasks

1. Create `packages/shared-types/` with all type definitions.
2. Create `packages/shared-utils/` with formatters, validators, constants.
3. Update `pnpm-workspace.yaml` to include new packages.
4. Initialize `mobile/` Expo project with correct dependencies.
5. Create full folder structure.
6. Implement `app/_layout.tsx` with auth guard and role routing.
7. Implement `src/api/client.ts` with all interceptors.
8. Implement `src/stores/authStore.ts` with SecureStore persistence.
9. Implement `src/stores/schoolStore.ts`.
10. Implement `app.config.js` dynamic config.
11. Configure `eas.json`.
12. Configure NativeWind.
13. Implement placeholder tab navigators for each role group.
14. Run `pnpm install` from workspace root and confirm no errors.

---

## Acceptance Criteria

- [ ] `pnpm --filter @vitana/shared-types build` succeeds.
- [ ] `pnpm --filter @vitana/mobile start` launches Expo dev server without errors.
- [ ] App opens on Android emulator (API 30) to the auth screen.
- [ ] App opens on iOS simulator (iOS 17) to the auth screen.
- [ ] TypeScript: `pnpm --filter @vitana/mobile tsc --noEmit` reports 0 errors.
- [ ] Lint: `pnpm --filter @vitana/mobile lint` reports 0 errors.
- [ ] Root layout redirects unauthenticated user to `/(auth)/`.
- [ ] Auth store saves tokens to SecureStore (verified with manual Expo SecureStore inspector).
- [ ] API client injects `Authorization` header (verified in Expo DevTools network tab).
- [ ] `@vitana/shared-types` imported successfully in `mobile/src/api/client.ts`.

---

## Testing Requirements

- Unit test: `authStore.setAuth()` sets correct state.
- Unit test: `authStore.clearAuth()` clears all state.
- Unit test: `formatINR(1500)` returns `"₹1,500.00"`.
- Unit test: `maskAadhaar("123456789012")` returns `"XXXX-XXXX-9012"`.

---

## Documentation Requirements

- `mobile/README.md`: How to run the app locally, EAS build commands, environment variables.
- `packages/shared-types/README.md`: Package purpose and how to add new types.

---

## Deliverables

1. `packages/shared-types/` — complete TypeScript type library.
2. `packages/shared-utils/` — utility functions with tests.
3. `mobile/` — Expo app skeleton with all infrastructure.
4. Updated `pnpm-workspace.yaml`.
5. GitHub Actions workflow stub files (empty triggers, to be filled in PROMPT-11).
6. `mobile/README.md`.

---

## Definition of Done

- [ ] All acceptance criteria pass.
- [ ] No TypeScript errors.
- [ ] No ESLint errors.
- [ ] App runs on both Android and iOS without crashes.
- [ ] `pnpm install` from repo root resolves all workspace dependencies.
- [ ] Peer review by senior React Native engineer.
