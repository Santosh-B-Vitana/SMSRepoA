# PROMPT-02: Authentication & Authorization

> **Version**: 2.0 — Full 10-Phase Anatomy  
> **Epic**: EP-01 — Authentication & Authorization  
> **Sprint**: 2 (Weeks 3–4)  
> **Story Points**: 18  
> **Prerequisites**: PROMPT-01 complete ✓ (monorepo, API client, stores, navigation skeleton)  
> **Next Prompt**: PROMPT-03 (Parent Portal)  
> **Parallel**: PROMPT-11 Part A (backend: app-config endpoint) runs simultaneously

---

## PHASE 1: Context & Scope

> **ONE APP REMINDER:** Authentication is the entry point for ALL roles in the same binary. After a successful login, the app reads the JWT `role` claim and navigates to the correct portal inside the same app (`/(parent)`, `/(teacher)`, `/(student)`, `/(admin)`). There is no separate login per role — one login screen handles every user type.

### What We're Building

The complete authentication experience for the Vitana SMS mobile app:
- School domain entry screen (shared app only — skipped in white-label)
- Login form with branding loaded from `GET /api/settings/public-branding`
- Token refresh queue (silent, transparent to user)
- Biometric unlock (Face ID / Fingerprint) after first login
- TOTP 2FA flow
- Logout (clears all state)
- Change password

### Current State

- ✅ `authStore` exists with `setAuth`, `clearAuth`, `updateTokens`, `isHydrated`
- ✅ `schoolStore` exists with `branding`, `setAppConfig`
- ✅ API client exists with refresh interceptor skeleton
- ✅ Root layout redirects unauthenticated user to `/(auth)/login`
- ✅ Vitana design tokens: primary `#1a6fd8`, fonts Inter + Poppins
- ❌ Login screen — not implemented
- ❌ School domain entry screen — not implemented
- ❌ Biometric unlock — not implemented
- ❌ 2FA screen — not implemented

### Success Criteria

- [ ] Login with valid credentials navigates to role-appropriate dashboard
- [ ] Login with wrong credentials shows specific error message (not generic)
- [ ] After 5 failed attempts, "Account locked. Try again in 15 minutes." shown
- [ ] JWT expiry → silent refresh → original request retried (transparent)
- [ ] Refresh failure → cleared auth → login screen with "Session expired"
- [ ] School branding (logo + primary color) displayed on login screen
- [ ] Biometric unlock prompt shown after first successful login
- [ ] Biometric unlock restores session without re-entering password
- [ ] Logout clears SecureStore tokens, TanStack Query cache, and school store
- [ ] TOTP 2FA: invalid code shows error; valid code navigates to dashboard
- [ ] Auth tokens NEVER appear in Sentry events, console logs, or analytics
- [ ] Cold start to login screen < 1.5 seconds

---

## PHASE 2: Analysis Phase

### Read First

```bash
docs/mobile_application_docs/epics/EP-01-authentication.md
docs/mobile_application_docs/06-mobile-architecture.md  # Section 6 (Auth Flow)
docs/mobile_application_docs/02-erp-analysis.md          # Section 3 (Auth & RBAC)
```

### Existing Code Audit

```bash
# Verify PROMPT-01 deliverables exist
ls mobile/src/stores/authStore.ts       # Must exist
ls mobile/src/api/client.ts              # Must exist
ls mobile/app/\(auth\)/_layout.tsx       # Must exist
cat mobile/app/_layout.tsx               # Verify RoleRouter function

# Check backend auth endpoints are reachable
curl -X POST https://api.vitanasms.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo.parent@demo.vitanasms.com","password":"Demo@12345"}'
# Expected: { success: true, data: { token, refreshToken, expiration, user } }

# Check public branding endpoint
curl https://api.vitanasms.com/api/settings/public-branding \
  -H "Host: demo.vitanasms.com"
# Expected: { success: true, data: { schoolName, logoUrl, primaryColor } }
```

### Backend API Contract

```
POST /api/auth/login
  Body: { username: string, password: string }
  200: { token, refreshToken, expiration, user: UserProfile }
  200 (2FA): { requiresTwoFactor: true, email: string }
  401: { message: "Invalid credentials" }
  429: { message: "Account locked..." }

POST /api/auth/refresh
  Body: { accessToken: string, refreshToken: string }
  200: { token, refreshToken, expiration }
  401: Refresh token invalid/expired

POST /api/auth/logout
  Header: Authorization: Bearer <token>
  Body: { refreshToken: string }
  200: {}

POST /api/auth/2fa/login
  Body: { email: string, totp: string }
  200: { token, refreshToken, expiration, user: UserProfile }
  401: { message: "Invalid or expired code" }

GET /api/settings/public-branding
  (No auth) Query: ?domain=school.vitanasms.com
  200: { schoolName, logoUrl, primaryColor }

POST /api/auth/change-password
  Header: Authorization: Bearer <token>
  Body: { currentPassword, newPassword }
  200: {}
  400: { message: "Current password is incorrect" }
```

### Technology Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| **Biometric** | `expo-local-authentication` | Already installed in PROMPT-01; Keychain/Keystore backed |
| **Form validation** | `react-hook-form` + `zod` | Same as web; already installed |
| **Secure storage** | `expo-secure-store` | Tokens MUST be in Keychain/Keystore, never AsyncStorage |
| **Forgot password** | `expo-web-browser` → web portal | No mobile password reset flow needed (handled on web) |

---

## PHASE 3: Technical Planning

### 3.1 Auth Screens & Navigation

```
/(auth)/
├── _layout.tsx         ← Stack navigator (no tab bar)
├── index.tsx           ← School domain entry (shared app)
│                         OR auto-redirect to /login (white-label)
└── login.tsx           ← Login form + 2FA redirect
    └── 2fa.tsx         ← TOTP code entry

/(profile)/             ← Nested inside role groups
└── change-password.tsx ← Available post-login
```

### 3.2 Biometric Flow State Machine

```
App Open
   │
   ▼
SecureStore: tokens exist?
   ├── No  → /login screen
   └── Yes → biometric_enabled flag in SecureStore?
               ├── No  → Validate token expiry → /dashboard
               └── Yes → Show biometric prompt
                           ├── Success → /dashboard
                           ├── Cancel  → /login screen (show password form)
                           └── 3 failures → /login + clear biometric flag
```

### 3.3 Login Screen Design (Matches Web)

```
┌─────────────────────────────────────┐
│                                     │
│  [School Logo 80×80]                │
│  Delhi Public School                │  ← from public-branding API
│                                     │
│  ─────────────────────────          │
│                                     │
│  Username                           │
│  [____________________________]     │
│                                     │
│  Password                    [👁]   │
│  [____________________________]     │
│                                     │
│  [       Sign In      ]             │  ← primary color background
│                                     │
│  Forgot password? → (web browser)   │
│                                     │
│  ─────────────────────────          │
│  Powered by Vitana SMS              │
└─────────────────────────────────────┘
```

---

## PHASE 4: Database Design

> No database changes. All auth data stored in:
> - JWT (stateless, server-issued)
> - `expo-secure-store` (tokens, biometric flag)
> - `authStore` Zustand (in-memory session, synced to SecureStore)

SQLite is not used for auth data. Never store tokens in SQLite.

---

## PHASE 5: Backend Implementation

> No backend changes required for this prompt.  
> All backend auth endpoints already exist.  
> The only backend prerequisite is `GET /api/mobile/app-config` (delivered by PROMPT-11 Part A in Sprint 2).

---

## PHASE 6: Mobile Implementation

### 6.1 Auth API Endpoints

```typescript
// mobile/src/api/endpoints/auth.ts
import apiClient, { ApiError } from '../client';
import type {
  LoginRequest, LoginResponse, RefreshTokenResponse, UserProfile
} from '@vitana/shared-types';

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    return apiClient.post('/auth/login', data);
  },

  refresh: async (accessToken: string, refreshToken: string): Promise<RefreshTokenResponse> => {
    return apiClient.post('/auth/refresh', { accessToken, refreshToken });
  },

  logout: async (refreshToken: string): Promise<void> => {
    return apiClient.post('/auth/logout', { refreshToken });
  },

  twoFactorLogin: async (email: string, totp: string): Promise<LoginResponse> => {
    return apiClient.post('/auth/2fa/login', { email, totp });
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    return apiClient.post('/auth/change-password', { currentPassword, newPassword });
  },

  getPublicBranding: async (domain: string) => {
    // Public endpoint — no auth header needed
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_BASE_URL}/settings/public-branding?domain=${encodeURIComponent(domain)}`
    );
    const json = await response.json();
    if (!json.success) throw new ApiError(json.message, response.status);
    return json.data as { schoolName: string; logoUrl: string | null; primaryColor: string };
  },
};
```

### 6.2 School Domain Entry Screen

```typescript
// mobile/app/(auth)/index.tsx
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { authApi } from '../../src/api/endpoints/auth';
import { useSchoolStore } from '../../src/stores/schoolStore';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

const isWhiteLabel = Constants.expoConfig?.extra?.isWhiteLabel ?? false;
const hardcodedDomain = Constants.expoConfig?.extra?.schoolDomain ?? null;

export default function SchoolDomainEntry() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setBranding } = useSchoolStore();

  useEffect(() => {
    // White-label app: skip this screen entirely
    if (isWhiteLabel && hardcodedDomain) {
      router.replace('/(auth)/login');
      return;
    }
    // Restore last-used domain
    SecureStore.getItemAsync('last_school_domain').then((saved) => {
      if (saved) setDomain(saved);
    });
  }, []);

  async function handleContinue() {
    const trimmed = domain.trim().toLowerCase();
    if (!trimmed) { setError('Please enter your school domain'); return; }

    setLoading(true);
    setError('');

    try {
      const branding = await authApi.getPublicBranding(trimmed);
      setBranding({
        schoolName: branding.schoolName,
        logoUrl: branding.logoUrl,
        primaryColor: branding.primaryColor,
        accentColor: VITANA_DESIGN_TOKENS.colors.accent,
      });
      await SecureStore.setItemAsync('last_school_domain', trimmed);
      await SecureStore.setItemAsync('school_domain', trimmed);
      router.push('/(auth)/login');
    } catch {
      setError('School not found. Please check the domain and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6">
          {/* Vitana Logo */}
          <View className="items-center mb-10">
            <View
              className="w-20 h-20 rounded-2xl items-center justify-center mb-4"
              style={{ backgroundColor: VITANA_DESIGN_TOKENS.colors.primary }}
            >
              <Text className="text-white font-heading text-3xl">V</Text>
            </View>
            <Text className="font-heading text-2xl text-text-primary">Vitana SMS</Text>
            <Text className="font-body text-text-secondary mt-1">School Management System</Text>
          </View>

          {/* Domain Input */}
          <View className="mb-6">
            <Text className="font-body-medium text-text-primary mb-2">School Domain</Text>
            <TextInput
              value={domain}
              onChangeText={(t) => { setDomain(t); setError(''); }}
              placeholder="yourschool.vitanasms.com"
              placeholderTextColor={VITANA_DESIGN_TOKENS.colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleContinue}
              className="border border-border rounded-xl px-4 py-3.5 font-body text-text-primary bg-surface text-base"
            />
            {error ? (
              <Text className="font-body text-danger text-sm mt-2">{error}</Text>
            ) : null}
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            onPress={handleContinue}
            disabled={loading}
            className="rounded-xl py-4 items-center justify-center"
            style={{ backgroundColor: VITANA_DESIGN_TOKENS.colors.primary, opacity: loading ? 0.7 : 1 }}
            accessibilityLabel="Continue to login"
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-body-semibold text-white text-base">Continue</Text>
            )}
          </TouchableOpacity>

          <Text className="font-body text-text-secondary text-center text-xs mt-8">
            Contact your school administrator for your school domain
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

### 6.3 Login Screen (Full Implementation)

```typescript
// mobile/app/(auth)/login.tsx
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Constants from 'expo-constants';
import { authApi } from '../../src/api/endpoints/auth';
import { useAuthStore } from '../../src/stores/authStore';
import { useSchoolStore } from '../../src/stores/schoolStore';
import { queryClient } from '../../src/api/queryClient';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  const { setAuth, isAuthenticated } = useAuthStore();
  const { branding } = useSchoolStore();
  const isWhiteLabel = Constants.expoConfig?.extra?.isWhiteLabel ?? false;

  const primaryColor = branding?.primaryColor ?? VITANA_DESIGN_TOKENS.colors.primary;

  const {
    control, handleSubmit, formState: { errors, isSubmitting }
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  // On mount: check if biometric unlock is available
  useEffect(() => {
    checkBiometricUnlock();
  }, []);

  async function checkBiometricUnlock() {
    const biometricEnabled = await SecureStore.getItemAsync('biometric_enabled');
    if (biometricEnabled !== 'true') return;
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (hasHardware && isEnrolled) {
      setShowBiometricPrompt(true);
      attemptBiometricUnlock();
    }
  }

  async function attemptBiometricUnlock() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sign in to Vitana SMS',
      fallbackLabel: 'Use Password',
      cancelLabel: 'Cancel',
    });

    if (result.success) {
      // Tokens already in authStore (persisted) — just navigate
      const { user } = useAuthStore.getState();
      if (user) {
        router.replace(getRoleRoute(user.role));
      }
    }
    // On failure/cancel: show normal login form (setShowBiometricPrompt stays true for UI hint)
  }

  async function onSubmit(data: LoginForm) {
    setApiError('');
    try {
      const response = await authApi.login(data);

      if (response.requiresTwoFactor) {
        // Navigate to 2FA screen with email
        router.push({ pathname: '/(auth)/2fa', params: { email: response.user?.email ?? data.username } });
        return;
      }

      setAuth(response.user, response.token, response.refreshToken);

      // Offer biometric setup if not already configured
      await offerBiometricSetup();

      router.replace(getRoleRoute(response.user.role));
    } catch (error: any) {
      if (error?.status === 429) {
        setApiError('Too many attempts. Account locked for 15 minutes.');
      } else if (error?.status === 401) {
        setApiError('Incorrect username or password.');
      } else if (error?.status === 0) {
        setApiError('No internet connection. Check your network.');
      } else {
        setApiError('Something went wrong. Please try again.');
      }
    }
  }

  async function offerBiometricSetup() {
    const alreadySetUp = await SecureStore.getItemAsync('biometric_prompt_shown');
    if (alreadySetUp) return;

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) return;

    const biometricType = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const isFaceID = biometricType.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const label = isFaceID ? 'Face ID' : 'Fingerprint';

    Alert.alert(
      `Enable ${label}?`,
      `Sign in faster with ${label} next time.`,
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: `Enable ${label}`,
          onPress: async () => {
            await SecureStore.setItemAsync('biometric_enabled', 'true');
          },
        },
      ],
    );
    await SecureStore.setItemAsync('biometric_prompt_shown', 'true');
  }

  function getRoleRoute(role: string): string {
    switch (role) {
      case 'Parent': return '/(parent)';
      case 'Student': return '/(student)';
      case 'SuperAdmin': return '/(super-admin)';
      case 'Admin': case 'Principal': case 'HRManager': case 'Accountant': return '/(admin)';
      default: return '/(teacher)';
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center px-6 py-8">
            {/* School Branding */}
            <View className="items-center mb-8">
              {branding?.logoUrl ? (
                <Image
                  source={{ uri: branding.logoUrl }}
                  style={{ width: 80, height: 80, borderRadius: 12 }}
                  contentFit="contain"
                  accessibilityLabel={`${branding.schoolName} logo`}
                />
              ) : (
                <View
                  className="w-20 h-20 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Text className="text-white font-heading text-2xl">
                    {branding?.schoolName?.[0] ?? 'V'}
                  </Text>
                </View>
              )}
              <Text className="font-heading text-xl text-text-primary mt-3">
                {branding?.schoolName ?? 'Vitana SMS'}
              </Text>
              <Text className="font-body text-text-secondary text-sm mt-1">
                Sign in to your account
              </Text>
            </View>

            {/* Login Form */}
            <View className="space-y-4">
              {/* Username Field */}
              <View>
                <Text className="font-body-medium text-text-primary mb-1.5">Username</Text>
                <Controller
                  control={control}
                  name="username"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Enter your username"
                      placeholderTextColor={VITANA_DESIGN_TOKENS.colors.textSecondary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      returnKeyType="next"
                      accessibilityLabel="Username"
                      className={`border rounded-xl px-4 py-3.5 font-body text-text-primary bg-surface text-base ${
                        errors.username ? 'border-danger' : 'border-border'
                      }`}
                    />
                  )}
                />
                {errors.username && (
                  <Text className="font-body text-danger text-sm mt-1">{errors.username.message}</Text>
                )}
              </View>

              {/* Password Field */}
              <View>
                <Text className="font-body-medium text-text-primary mb-1.5">Password</Text>
                <View className="relative">
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Enter your password"
                        placeholderTextColor={VITANA_DESIGN_TOKENS.colors.textSecondary}
                        secureTextEntry={!showPassword}
                        returnKeyType="go"
                        onSubmitEditing={handleSubmit(onSubmit)}
                        accessibilityLabel="Password"
                        className={`border rounded-xl px-4 py-3.5 pr-12 font-body text-text-primary bg-surface text-base ${
                          errors.password ? 'border-danger' : 'border-border'
                        }`}
                      />
                    )}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Feather
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={VITANA_DESIGN_TOKENS.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Text className="font-body text-danger text-sm mt-1">{errors.password.message}</Text>
                )}
              </View>

              {/* API Error */}
              {apiError ? (
                <View className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3">
                  <Text className="font-body text-danger text-sm">{apiError}</Text>
                </View>
              ) : null}

              {/* Sign In Button */}
              <TouchableOpacity
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="rounded-xl py-4 items-center justify-center mt-2"
                style={{ backgroundColor: primaryColor, opacity: isSubmitting ? 0.7 : 1 }}
                accessibilityLabel="Sign In"
                accessibilityRole="button"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-body-semibold text-white text-base">Sign In</Text>
                )}
              </TouchableOpacity>

              {/* Biometric Unlock Hint */}
              {showBiometricPrompt && (
                <TouchableOpacity
                  onPress={attemptBiometricUnlock}
                  className="flex-row items-center justify-center py-3"
                >
                  <Feather name="lock" size={16} color={primaryColor} />
                  <Text className="font-body-medium ml-2" style={{ color: primaryColor }}>
                    Use Biometric Unlock
                  </Text>
                </TouchableOpacity>
              )}

              {/* Forgot Password */}
              <TouchableOpacity
                onPress={() => WebBrowser.openBrowserAsync('https://app.vitanasms.com/forgot-password')}
                className="items-center py-2"
                accessibilityLabel="Forgot password"
              >
                <Text className="font-body text-text-secondary text-sm underline">Forgot password?</Text>
              </TouchableOpacity>

              {/* Back to domain entry (shared app only) */}
              {!isWhiteLabel && (
                <TouchableOpacity
                  onPress={() => router.replace('/(auth)/')}
                  className="items-center py-2"
                >
                  <Text className="font-body text-text-secondary text-sm">← Use a different school</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View className="pb-6 items-center">
        <Text className="font-body text-text-secondary text-xs">Powered by Vitana SMS</Text>
      </View>
    </SafeAreaView>
  );
}
```

### 6.4 TOTP 2FA Screen

```typescript
// mobile/app/(auth)/2fa.tsx
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../../src/api/endpoints/auth';
import { useAuthStore } from '../../src/stores/authStore';
import { useSchoolStore } from '../../src/stores/schoolStore';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

export default function TwoFAScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { setAuth } = useAuthStore();
  const { branding } = useSchoolStore();
  const primaryColor = branding?.primaryColor ?? VITANA_DESIGN_TOKENS.colors.primary;

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  async function handleCodeChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError('');
    if (digits.length === 6) {
      await verifyCode(digits);
    }
  }

  async function verifyCode(digits: string) {
    setLoading(true);
    try {
      const response = await authApi.twoFactorLogin(email, digits);
      setAuth(response.user, response.token, response.refreshToken);
      const route = response.user.role === 'Parent' ? '/(parent)'
        : response.user.role === 'Student' ? '/(student)'
        : ['Admin', 'Principal'].includes(response.user.role) ? '/(admin)'
        : '/(teacher)';
      router.replace(route);
    } catch {
      setError('Invalid code. Please check your authenticator app and try again.');
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-8">
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
            style={{ backgroundColor: primaryColor + '20' }}
          >
            <Text className="text-3xl">🔐</Text>
          </View>
          <Text className="font-heading text-2xl text-text-primary">Two-Factor Auth</Text>
          <Text className="font-body text-text-secondary text-center mt-2">
            Enter the 6-digit code from{'\n'}your authenticator app
          </Text>
        </View>

        {/* Code Input */}
        <View className="items-center mb-6">
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={VITANA_DESIGN_TOKENS.colors.textSecondary}
            className="border-2 border-border rounded-xl px-6 py-4 text-center text-3xl font-body-bold text-text-primary tracking-widest"
            style={{ borderColor: error ? VITANA_DESIGN_TOKENS.colors.danger : (code.length > 0 ? primaryColor : VITANA_DESIGN_TOKENS.colors.border) }}
            accessibilityLabel="6-digit authentication code"
          />
          {error ? (
            <Text className="font-body text-danger text-sm mt-2 text-center">{error}</Text>
          ) : null}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          onPress={() => verifyCode(code)}
          disabled={code.length !== 6 || loading}
          className="rounded-xl py-4 items-center"
          style={{
            backgroundColor: code.length === 6 ? primaryColor : VITANA_DESIGN_TOKENS.colors.border,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-body-semibold text-white text-base">Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          className="items-center py-4 mt-2"
        >
          <Text className="font-body text-text-secondary">← Back to login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

### 6.5 useLogout Hook

```typescript
// mobile/src/features/auth/hooks/useLogout.ts
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../../stores/authStore';
import { useSchoolStore } from '../../../stores/schoolStore';
import { queryClient } from '../../../api/queryClient';
import { authApi } from '../../../api/endpoints/auth';

export function useLogout() {
  const { clearAuth, refreshToken } = useAuthStore();
  const { resetBranding } = useSchoolStore();

  async function logout() {
    // 1. Tell server to invalidate refresh token (best-effort, don't block on failure)
    if (refreshToken) {
      authApi.logout(refreshToken).catch(() => {
        // Server-side logout failed — tokens will expire naturally
      });
    }

    // 2. Clear all client state immediately
    clearAuth();
    resetBranding();
    queryClient.clear();

    // 3. Clear biometric flag (user must re-enable after re-login)
    await SecureStore.deleteItemAsync('biometric_enabled');
    await SecureStore.deleteItemAsync('biometric_prompt_shown');
    await SecureStore.deleteItemAsync('school_domain');

    // 4. Navigate to login
    router.replace('/(auth)/login');
  }

  return { logout };
}
```

### 6.6 Change Password Screen

```typescript
// mobile/src/features/auth/screens/ChangePasswordScreen.tsx
// Route: accessible from /(role)/profile/change-password
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../../../api/endpoints/auth';
import { useSchoolStore } from '../../../stores/schoolStore';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';
import { useState } from 'react';

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function ChangePasswordScreen() {
  const { branding } = useSchoolStore();
  const primaryColor = branding?.primaryColor ?? VITANA_DESIGN_TOKENS.colors.primary;
  const [apiError, setApiError] = useState('');

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setApiError('');
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword);
      Alert.alert('Password Changed', 'Your password has been updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      if (error?.status === 400) {
        setApiError('Current password is incorrect.');
      } else {
        setApiError('Failed to change password. Please try again.');
      }
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 py-4">
        <Text className="font-heading text-xl text-text-primary mb-6">Change Password</Text>

        {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
          <View key={field} className="mb-4">
            <Text className="font-body-medium text-text-primary mb-1.5">
              {field === 'currentPassword' ? 'Current Password'
               : field === 'newPassword' ? 'New Password'
               : 'Confirm New Password'}
            </Text>
            <Controller
              control={control}
              name={field as keyof FormData}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  className={`border rounded-xl px-4 py-3.5 font-body text-text-primary bg-surface ${
                    errors[field as keyof FormData] ? 'border-danger' : 'border-border'
                  }`}
                />
              )}
            />
            {errors[field as keyof FormData] && (
              <Text className="font-body text-danger text-sm mt-1">
                {errors[field as keyof FormData]?.message}
              </Text>
            )}
          </View>
        ))}

        {apiError ? (
          <View className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 mb-4">
            <Text className="font-body text-danger text-sm">{apiError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="rounded-xl py-4 items-center"
          style={{ backgroundColor: primaryColor }}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" /> : (
            <Text className="font-body-semibold text-white text-base">Update Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

---

## PHASE 7: AI/ML Integration

> Not applicable for authentication flows.

---

## PHASE 8: External Integrations

### 8.1 Expo Local Authentication

`expo-local-authentication` is already installed. Ensure the `NSFaceIDUsageDescription` plist key is set in `app.config.js` (done in PROMPT-01).

### 8.2 Expo Web Browser (Forgot Password)

```bash
# expo-web-browser is already installed
# It opens the system browser (not in-app webview) for forgot-password
# This is intentional — security and no additional dependencies
```

---

## PHASE 9: Testing & Validation

### 9.1 Unit Tests

```typescript
// mobile/src/features/auth/__tests__/useLogout.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useLogout } from '../hooks/useLogout';
import { useAuthStore } from '../../../stores/authStore';
import { queryClient } from '../../../api/queryClient';

jest.mock('../../../api/endpoints/auth', () => ({
  authApi: { logout: jest.fn().mockResolvedValue(undefined) },
}));

describe('useLogout', () => {
  it('clears auth store and query cache', async () => {
    useAuthStore.getState().setAuth(
      { id: '1', username: 'test', email: 'test@test.com', role: 'Parent', schoolId: 's1', fullName: 'Test', linkedEntityId: 'g1' },
      'token', 'refresh'
    );

    const { result } = renderHook(() => useLogout());
    await act(async () => { await result.current.logout(); });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
```

```typescript
// packages/shared-utils/src/__tests__/validators.test.ts
import { isValidPhone, isValidEmail, isValidAadhaar, isValidPAN, isValidIFSC } from '../validators';

describe('validators', () => {
  describe('isValidPhone', () => {
    it('accepts valid Indian mobile numbers', () => {
      expect(isValidPhone('9876543210')).toBe(true);
      expect(isValidPhone('6789012345')).toBe(true);
    });
    it('rejects landline and invalid numbers', () => {
      expect(isValidPhone('1234567890')).toBe(false);
      expect(isValidPhone('98765')).toBe(false);
    });
  });
  describe('isValidAadhaar', () => {
    it('accepts 12-digit number', () => expect(isValidAadhaar('123456789012')).toBe(true));
    it('rejects 11-digit number', () => expect(isValidAadhaar('12345678901')).toBe(false));
  });
});
```

### 9.2 Maestro E2E Tests

```yaml
# mobile/maestro/tests/login_parent.yaml
appId: com.vitana.sms
---
- launchApp
- assertVisible: "Vitana SMS"
- tapOn: "yourschool.vitanasms.com"  # placeholder text
- inputText: "demo.vitanasms.com"
- tapOn: "Continue"
- assertVisible: "Sign in to your account"
- tapOn: "Username"
- inputText: "demo.parent@demo.vitanasms.com"
- tapOn: "Password"
- inputText: "Demo@12345"
- tapOn: "Sign In"
- assertVisible: "Parent Dashboard"
```

```yaml
# mobile/maestro/tests/logout.yaml
appId: com.vitana.sms
---
- launchApp
- # assume already logged in
- tapOn: "More"
- tapOn: "Sign Out"
- assertVisible: "Sign in to your account"
```

### 9.3 Validation Checklist

- [ ] Login with `demo.parent@demo.vitanasms.com` / `Demo@12345` → Parent Dashboard
- [ ] Login with wrong password → "Incorrect username or password"
- [ ] School domain `demo.vitanasms.com` → branding logo loads on login screen
- [ ] Biometric prompt offered after first login (on device with biometric enrolled)
- [ ] Biometric unlock works on second app open
- [ ] Logout → Login screen shown, tokens cleared
- [ ] Token expiry simulation: clear access token from SecureStore → next API call triggers refresh transparently
- [ ] Auth header NEVER appears in Sentry → verify in Sentry test project

---

## PHASE 10: Documentation & Verification

### Verification Commands

```bash
# 1. Type check
pnpm --filter @vitana/mobile typecheck

# 2. Lint
pnpm --filter @vitana/mobile lint

# 3. Tests
pnpm --filter @vitana/mobile test

# 4. Start app and test login manually
pnpm --filter @vitana/mobile start
# Press 'a' to open Android emulator
# Navigate to login, use demo credentials

# 5. Maestro E2E (requires Maestro installed: brew tap mobile-dev-inc/tap && brew install maestro)
maestro test mobile/maestro/tests/login_parent.yaml
```

### Git Commit

```bash
git add .
git commit -m "feat(mobile/auth): implement authentication screens

- School domain entry screen with branding fetch
- Login form (react-hook-form + zod) with error states
- TOTP 2FA screen with auto-submit on 6 digits
- Biometric unlock (Face ID / fingerprint) after first login
- useLogout hook: clears SecureStore, Zustand, QueryClient
- Change password screen
- Auth tokens never logged (Sentry filter applied)
- Maestro E2E: login_parent.yaml, logout.yaml

Next: PROMPT-03 (Parent Portal)"
```

---

**END OF PROMPT-02**
