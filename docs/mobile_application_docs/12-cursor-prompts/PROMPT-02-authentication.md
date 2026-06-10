# PROMPT-02: Authentication & Authorization Implementation

> **Prompt ID:** PROMPT-02  
> **Epic:** EP-01 — Authentication & Authorization  
> **Phase:** 1 — Sprint 2  
> **Estimated Story Points:** 18  
> **Prerequisites:** PROMPT-01 complete (project setup)  
> **Related Architecture Docs:** [epics/EP-01-authentication](../epics/EP-01-authentication.md) · [06-mobile-architecture](../06-mobile-architecture.md)

---

## Context

The mobile app project skeleton is in place (PROMPT-01 done). The `authStore`, API client with refresh interceptor, and role-based root layout exist. Now implement the actual authentication screens and the full authentication flow.

**Backend API available at:** `https://api.vitanasms.com/api` (or `EXPO_PUBLIC_API_BASE_URL`).

**Key backend behavior:**
- `POST /api/auth/login` returns `{ token, refreshToken, expiration, user: { id, username, email, role, schoolId, linkedEntityId, fullName } }`.
- `POST /api/auth/refresh` requires `{ accessToken, refreshToken }`, returns `{ token, refreshToken }`.
- `GET /api/settings/public-branding` is anonymous; returns `{ schoolName, logoUrl, primaryColor }`.
- After 5 failed logins, backend returns 429 with "Account locked" message.
- If 2FA is required, login returns 200 with `{ requiresTwoFactor: true }`.

---

## Requirements

### Screen 1: School Domain Entry (`app/(auth)/index.tsx`)

Shown ONLY in the Shared Vitana App (`isWhiteLabel === false`).

**UI:**
- Vitana logo (large, centered).
- Title: "Enter your school's domain".
- Text input: placeholder "school.vitanasms.com" or "School code".
- "Continue" button (calls `GET /api/settings/public-branding`).
- If last-used domain exists in SecureStore → pre-fill.

**Behavior:**
1. User enters domain and taps Continue.
2. Call `GET /api/settings/public-branding` with the domain.
3. On success: store domain in SecureStore, navigate to `/(auth)/login` with branding data.
4. On error: "School not found. Please check with your administrator."

In dedicated/white-label apps: this screen is skipped entirely (domain is hardcoded in `app.config.js` `extra.schoolDomain`).

### Screen 2: Login (`app/(auth)/login.tsx`)

**UI:**
- School logo (from branding, or Vitana logo as fallback).
- School name (from branding).
- Username field (keyboard: email, autocomplete: username).
- Password field (secure, show/hide toggle).
- "Sign In" button (primary, disabled while loading).
- "Forgot Password?" link (opens `expo-web-browser` to web portal).
- Loading state: button shows spinner.
- Error state: inline error message below form.

**Behavior:**
1. Validate: both fields required.
2. Call `POST /api/auth/login`.
3. On 200:
   - If `requiresTwoFactor: true` → navigate to `/(auth)/2fa` with user data.
   - Else → call `authStore.setAuth(user, token, refreshToken)` → navigate to role dashboard.
4. On 401: "Invalid username or password."
5. On 429: "Too many attempts. Please try again in 15 minutes."
6. On network error: "No connection. Check your internet."
7. On success, check if biometric offer should be shown (first login + biometric available).

**Accessibility:**
- Username field: `accessibilityLabel="Username"`.
- Password field: `accessibilityLabel="Password"`.
- Button: `accessibilityLabel="Sign In"`.
- Form submits on keyboard "Return" from password field.

### Screen 3: 2FA Verification (`app/(auth)/2fa.tsx`)

**UI:**
- "Enter your 6-digit code" title.
- TOTP input (6 digit code, numeric keyboard, auto-submits at 6 digits).
- "Verify" button.
- Error message on wrong code.

**Behavior:**
1. Call `POST /api/auth/2fa/login` with `{ email, totp }`.
2. On success → `authStore.setAuth()` → navigate to dashboard.
3. On error: "Invalid code. Please try again."

### Biometric Unlock Flow

After first successful login:
1. Check `LocalAuthentication.hasHardwareAsync()` and `LocalAuthentication.isEnrolledAsync()`.
2. If both true and biometric not yet enabled → show bottom sheet: "Enable Face ID / Fingerprint?"
3. On "Enable": store a flag `biometric_enabled: true` in SecureStore.
4. On subsequent app opens (token in SecureStore):
   - If `biometric_enabled === true` → show biometric challenge.
   - On success: restore session from stored tokens.
   - On failure (3 times): fall back to login screen.
   - On cancel: show login screen.

**Biometric UI:**
- Full-screen with school logo.
- "Sign in with Face ID" or "Use Fingerprint" (detect from hardware).
- "Use Password Instead" link.

### Logout

Implement `useLogout()` hook:
1. Call `POST /api/auth/logout` (fire-and-forget, don't block on failure).
2. Call `authStore.clearAuth()`.
3. Clear TanStack Query cache: `queryClient.clear()`.
4. Clear SQLite offline queue (CONFIRM this is the right behavior — see offline architecture).
5. Reset `biometric_enabled` preference if user explicitly logs out.
6. Navigate to `/(auth)/`.

### Change Password Screen (`app/(profile)/change-password.tsx`)

- Current password field.
- New password field + confirm.
- Validation: min 8 chars, must match.
- Call `POST /api/auth/change-password`.
- On success: show toast + navigate back.

---

## Constraints

- No `any` types.
- Form validation with React Hook Form + Zod.
- SecureStore for all credential-adjacent data (no AsyncStorage for tokens).
- Never log tokens to console, Sentry, or analytics.
- Sentry: scrub `Authorization` header from all captured events.

---

## Implementation Tasks

1. Implement `src/api/endpoints/auth.ts` with all auth API calls.
2. Implement `app/(auth)/index.tsx` — school domain entry screen.
3. Implement `app/(auth)/login.tsx` — login form.
4. Implement `app/(auth)/2fa.tsx` — TOTP verification.
5. Implement biometric prompt flow in `src/features/auth/hooks/useBiometricAuth.ts`.
6. Implement `useLogout()` hook in `src/features/auth/hooks/useLogout.ts`.
7. Implement change password screen.
8. Update `app/_layout.tsx` to integrate full auth check + biometric offer.
9. Write unit tests for auth hooks.
10. Write Maestro E2E tests for login and logout.

---

## Acceptance Criteria

- [ ] Login with valid credentials navigates to correct role dashboard.
- [ ] Login with invalid credentials shows error message (not generic).
- [ ] After 5 failed attempts, lockout message shown.
- [ ] Token refresh works: manually expire the access token → next API call refreshes silently.
- [ ] Biometric unlock prompt appears after first login on a device with biometrics.
- [ ] Biometric unlock successfully restores session without re-entering password.
- [ ] Logout clears SecureStore, cache, and redirects to login.
- [ ] 2FA flow: enter invalid TOTP → error; valid TOTP → dashboard.
- [ ] School branding appears on login screen (logo, color).
- [ ] No console.log of tokens anywhere in the codebase.

---

## Testing Requirements

```yaml
# E2E: maestro/tests/login_parent.yaml
appId: com.vitana.sms
---
- launchApp
- tapOn: "school.vitanasms.com"
- inputText: "demo.vitanasms.com"
- tapOn: "Continue"
- inputText:
    id: "username"
    text: "parent@demo.vitanasms.com"
- inputText:
    id: "password"
    text: "Demo@123"
- tapOn: "Sign In"
- assertVisible: "Welcome back"
```

Unit tests:
- `useBiometricAuth`: biometric available → offers biometric; not available → skips.
- `useLogout`: clears auth store + query cache.
- `authApi.login`: maps response correctly; throws `ApiError` on 401.

---

## Deliverables

1. `app/(auth)/index.tsx`, `login.tsx`, `2fa.tsx`.
2. `src/api/endpoints/auth.ts`.
3. `src/features/auth/hooks/useBiometricAuth.ts`.
4. `src/features/auth/hooks/useLogout.ts`.
5. `src/features/auth/hooks/useLogin.ts`.
6. `maestro/tests/login_parent.yaml`, `logout.yaml`.
7. Unit tests for all auth hooks.

---

## Definition of Done

- [ ] All acceptance criteria pass.
- [ ] E2E tests pass on Android emulator and iOS simulator.
- [ ] No `any` types.
- [ ] No tokens in Sentry events (verify in Sentry test project).
- [ ] Peer review complete.
