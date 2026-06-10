# EP-01: Authentication & Authorization

> **Epic ID:** EP-01  
> **Priority:** P0  
> **Estimated Sprints:** 2  
> **Phase:** 1  
> **Related Docs:** [06-mobile-architecture](../06-mobile-architecture.md) · [03-api-analysis](../03-api-analysis.md) · [PROMPT-02](../12-cursor-prompts/PROMPT-02-authentication.md)

---

## Business Objective

Every user of the Vitana mobile platform must be able to securely authenticate with their school credentials and have their identity, role, and school context established before accessing any data. Auth is the critical gateway — if it fails or is insecure, the entire platform fails.

## Technical Objective

Implement JWT-based authentication with silent token refresh, SecureStore token persistence, role-based navigation routing, biometric unlock, and a school-domain selection mechanism for the shared app.

---

## Current State Analysis

The existing backend has:
- `POST /api/auth/login` — returns `{ token, refreshToken, expiration, user }` with role in JWT claims.
- `POST /api/auth/refresh` — rotates tokens.
- `POST /api/auth/logout` — invalidates refresh token.
- `POST /api/auth/2fa/login` — TOTP second factor.
- `GET /api/settings/public-branding` — anonymous, returns school name/logo/color.
- JWT contains: `userId`, `schoolId`, `role`, `linkedEntityId`, `email`.
- Brute-force protection: 5 attempts → 15-minute lockout (Redis).

The web app uses `axios` with a request interceptor injecting `Authorization: Bearer`. On 401, it calls refresh and retries. This exact pattern must be replicated in mobile.

---

## Future State Design

```
Cold Start
    │
    ▼
Read tokens from Expo SecureStore
    │
    ├── No tokens → Show school domain entry (shared app) or login (dedicated)
    │
    └── Tokens found → Validate JWT expiry
                │
                ├── Valid → Load app config → Navigate to role dashboard
                └── Expired → Silent refresh → On failure → Login
```

---

## Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | User can log in with username + password |
| FR-2 | Access token and refresh token stored in Expo SecureStore (iOS Keychain / Android Keystore) |
| FR-3 | Expired access tokens are refreshed silently without user interaction |
| FR-4 | Multiple concurrent 401 responses trigger only one refresh call (queue pattern) |
| FR-5 | Users are navigated to their role-appropriate dashboard post-login |
| FR-6 | Logout clears all stored tokens, cache, and SQLite data |
| FR-7 | Shared app users enter their school domain before credentials |
| FR-8 | School branding (logo + color) is shown on the login screen |
| FR-9 | Users can enable biometric unlock after first login |
| FR-10 | 2FA (TOTP) screen shown if backend indicates 2FA required |
| FR-11 | Change password accessible from profile settings |
| FR-12 | Inactive session auto-logout after configurable period |

---

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | Login screen renders < 500ms after launch (Hermes cold start) |
| NFR-2 | Token refresh happens < 200ms (does not cause visible loading state) |
| NFR-3 | Biometric auth challenge completes in < 1 second |
| NFR-4 | Tokens must never appear in app logs, analytics events, or error reports |
| NFR-5 | App must work on Android API 24+ and iOS 16.0+ |

---

## API Requirements

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | None | Body: `{ username, password }` |
| POST | `/api/auth/refresh` | None | Body: `{ accessToken, refreshToken }` |
| POST | `/api/auth/logout` | Bearer | Body: `{ refreshToken }` |
| GET | `/api/settings/public-branding` | None | Returns `{ schoolName, logoUrl, primaryColor }` |
| POST | `/api/auth/2fa/login` | None | Body: `{ email, totp }` |
| POST | `/api/auth/change-password` | Bearer | Body: `{ currentPassword, newPassword }` |

---

## Mobile Screens

| Screen | Route | Role |
|---|---|---|
| School Domain Entry | `/(auth)/index` | All (shared app only) |
| Login | `/(auth)/login` | All |
| 2FA Verification | `/(auth)/2fa` | Admin, Staff |
| Forgot Password (web redirect) | — | All |
| Change Password | `/(parent)/profile/change-password` | All |

---

## Navigation Flow

```
App open
  → SecureStore check
  → (no tokens) → /(auth)/index (domain entry) → /(auth)/login
  → (tokens valid) → role dashboard
  → Login success:
      role=Parent    → /(parent)
      role=Teacher   → /(teacher)
      role=Student   → /(student)
      role=Admin     → /(admin)
      role=Principal → /(admin)
      role=SuperAdmin → /(super-admin)
```

---

## Offline Strategy

Authentication is online-only. No offline login. If no connectivity:
- Show "No internet connection. Login requires an internet connection."
- If session is already established (valid cached token), app continues to work offline.

---

## Security Requirements

| Requirement | Implementation |
|---|---|
| No tokens in AsyncStorage | Expo SecureStore only |
| No tokens in logs | `Authorization` header redacted in `apiClient` logging |
| Token rotation | Refresh token is single-use; each refresh returns a new refresh token |
| Screen recording protection | Payment screen adds `FLAG_SECURE` (Android) via `expo-screen-capture` |
| Biometric fallback | If biometric fails 3 times, fall back to password |

---

## User Stories

- EP-01-US-01: Login with credentials (SP: 5)
- EP-01-US-02: Automatic token refresh (SP: 3)
- EP-01-US-03: School domain entry / shared app (SP: 5)
- EP-01-US-04: Biometric unlock (SP: 3)
- EP-01-US-05: Logout (SP: 2)

**Total:** 18 story points / 2 sprints

---

## Acceptance Criteria (Sprint Definition of Done)

- [ ] Login works on Android 9 (physical) and iOS 16 (physical).
- [ ] Token refresh works when access token is manually expired.
- [ ] Biometric unlock works on iPhone (Face ID) and Android (fingerprint).
- [ ] Logout clears all tokens; fresh login is required after logout.
- [ ] No auth tokens appear in Sentry events.
- [ ] School branding loads on login screen within 500ms.
- [ ] 2FA flow completes successfully with TOTP app.
- [ ] `E2E` test: login → parent dashboard → logout → login with different user.

---

## Dependencies

| Dependency | Status | Owner |
|---|---|---|
| Expo SecureStore module | Available | Mobile team |
| `expo-local-authentication` | Available | Mobile team |
| Backend `/api/auth` endpoints | Exists | Backend team |
| Backend `/api/settings/public-branding` | Exists | Backend team |

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Biometric not available on device | Medium | Gracefully skip biometric offer if `LocalAuthentication.hasHardwareAsync() = false` |
| Keychain access denied (iOS background) | Low | Handle `SecureStore` exceptions, force re-login |

---

## Sprint Breakdown

| Sprint | Work |
|---|---|
| Sprint 1 | School domain entry, login screen, SecureStore, role routing |
| Sprint 2 | Token refresh queue, biometric unlock, logout, 2FA |

---

## Testing Strategy

- Unit: `useAuthStore` store actions, `handleTokenRefresh` function
- Integration: Mock API → login → token stored → refresh → retry
- E2E (Maestro): `login_parent.yaml`, `login_teacher.yaml`, `biometric_unlock.yaml`, `logout.yaml`

---

## Rollout Strategy

Auth is the foundation — it ships with every release. No feature flags needed. Must be stable before any other epic proceeds.

---

## Monitoring

- Sentry: Alert on 401 error rate > 5% (indicates refresh bug).
- Backend: Redis login attempt metrics (brute force monitoring).
- Analytics: Login success rate, login failure reason distribution.
