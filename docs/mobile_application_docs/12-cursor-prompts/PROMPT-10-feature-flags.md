# PROMPT-10: Feature Flag Platform

> **Version**: 2.0 — Full 10-Phase Anatomy  
> **Epic**: EP-09 — Feature Flag Platform  
> **Sprint**: 7–10 (backend Sprint 2, mobile Sprint 7)  
> **Story Points**: 18  
> **Prerequisites**: PROMPT-01 ✓, PROMPT-02 ✓ (auth complete); backend PROMPT-11A runs parallel  
> **Delivers**: `FeatureGuard`, `useFeatureFlag`, dynamic navigation, version gates — used by ALL subsequent prompts

---

## PHASE 1: Context & Scope

### What We're Building

The built-in feature flag system that controls which modules each school sees, gates features by plan tier, enforces minimum app versions, and enables gradual rollouts — all without any external SaaS dependency.

**Capabilities:**
- `GET /api/mobile/app-config` — single endpoint returns branding + modules + flags + version requirements
- `useFeatureFlag(key)` hook — reactive boolean for any feature key
- `FeatureGuard` component — wraps optional features
- Dynamic navigation — tabs and "More" menu generated from flags
- Force update screen — blocking when app version < minimum
- Maintenance mode screen — blocking when backend is in maintenance
- Soft update banner — dismissible when `recommendedVersion > current`
- Remote config values (grace periods, sync intervals, support email)

### Current State

- ✅ `schoolStore` has `moduleFlags` and `mobileFeatureFlags` fields
- ✅ `setAppConfig()` action exists on schoolStore
- ❌ `GET /api/mobile/app-config` not yet called anywhere
- ❌ `FeatureGuard` component not implemented
- ❌ Dynamic navigation not implemented (tabs are hardcoded)
- ❌ Force update / maintenance screens not implemented

### Success Criteria

- [ ] `GET /api/mobile/app-config` is called on first authenticated render
- [ ] Response cached in TanStack Query (30-min stale) + AsyncStorage (for offline cold start)
- [ ] Disabling `library` in Super Admin → library disappears in app within 30 minutes
- [ ] `forceUpdateVersion: "99.0.0"` → blocking force-update screen shown
- [ ] `maintenanceMode: true` → maintenance screen shown
- [ ] Feature flags resolve correctly for all 8 resolution levels
- [ ] On API failure: last cached config used (no crash)
- [ ] LockedModuleCard shown for disabled modules in More tab
- [ ] All tab navigators dynamically built from enabled features

---

## PHASE 2: Analysis Phase

### Read First

```bash
docs/mobile_application_docs/07-feature-flag-architecture.md
docs/mobile_application_docs/epics/EP-09-feature-flags.md
```

### Existing Code Audit

```bash
# Check schoolStore has the right fields
grep "moduleFlags\|mobileFeatureFlags\|setAppConfig" mobile/src/stores/schoolStore.ts

# Check that app _layout.tsx hydrates before screens render
grep "isHydrated\|setHydrated" mobile/src/stores/authStore.ts

# MOCK_APP_CONFIG should exist from PROMPT-01
grep "MOCK_APP_CONFIG" mobile/src/__mocks__/appConfig.ts
```

### App Config API Contract

```typescript
// GET /api/mobile/app-config — full response shape
interface AppConfig {
  schoolId: string;
  academicYear: string;
  branding: SchoolBranding;
  modules: {
    library: boolean;
    transport: boolean;
    hostel: boolean;
    onlineExams: boolean;
    whatsapp: boolean;
    alumni: boolean;
    healthRecords: boolean;
  };
  mobileFeatures: {
    'mobile.attendance.offline': boolean;
    'mobile.attendance.biometric': boolean;
    'mobile.fees.online_payment': boolean;
    'mobile.fees.wallet': boolean;
    'mobile.parent.multi_child': boolean;
    'mobile.exams.online_exam_portal': boolean;
    'mobile.communication.whatsapp_trigger': boolean;
    // ... any string key
  };
  rolePermissions: RolePermissions;
  remoteConfig: RemoteConfig;
  versionRequirements: VersionRequirements;
}
```

---

## PHASE 3: Technical Planning

### Flag Resolution Priority

```
1. Platform kill switch (CRM DB)          — highest priority
2. Version gate                            — appVersion < minVersion
3. User-specific override                  — beta testers
4. Role-specific flag                      — e.g., Teacher-only feature
5. School-level flag (SchoolFeaturePermissions + MobileFeatureFlags)
6. Plan matrix                             — Standard / Pro / Enterprise
7. Default value                           — false for optional, true for core
```

### Module Key Taxonomy

```
Module-level (SchoolFeaturePermissions):
  library, transport, hostel, onlineExams, whatsapp, alumni, healthRecords

Mobile-specific (MobileFeatureFlags):
  mobile.attendance.offline
  mobile.attendance.biometric
  mobile.fees.online_payment
  mobile.fees.wallet
  mobile.parent.multi_child
  mobile.exams.online_exam_portal
  mobile.communication.whatsapp_trigger
  mobile.documents.id_card_viewer
```

---

## PHASE 4: Database Design

### Backend — New Tables

```sql
-- Migration: AddMobileFeatureFlags
CREATE TABLE MobileFeatureFlags (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SchoolId UNIQUEIDENTIFIER NOT NULL,
    FeatureKey NVARCHAR(100) NOT NULL,
    IsEnabled BIT NOT NULL DEFAULT 0,
    Scope NVARCHAR(50) NOT NULL DEFAULT 'global',
    RoleTarget NVARCHAR(50) NULL,
    UserTarget UNIQUEIDENTIFIER NULL,
    MinAppVersion NVARCHAR(20) NULL,
    MaxAppVersion NVARCHAR(20) NULL,
    Metadata NVARCHAR(MAX) NULL,  -- JSON: { rolloutPercentage: 20 }
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UNIQUE (SchoolId, FeatureKey, Scope, RoleTarget, UserTarget)
);

CREATE TABLE MobileAppConfiguration (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SchoolId UNIQUEIDENTIFIER NOT NULL UNIQUE,
    ForceUpdateVersion NVARCHAR(20) NULL,
    MinVersion NVARCHAR(20) NOT NULL DEFAULT '1.0.0',
    RecommendedVersion NVARCHAR(20) NOT NULL DEFAULT '1.0.0',
    MaintenanceMode BIT NOT NULL DEFAULT 0,
    MaintenanceMessage NVARCHAR(1000) NULL,
    AndroidStoreUrl NVARCHAR(500) NULL,
    IosStoreUrl NVARCHAR(500) NULL,
    SupportEmail NVARCHAR(200) NULL,
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
```

---

## PHASE 5: Backend Implementation

### App Config Service

```csharp
// Services/Mobile/MobileAppConfigService.cs
public async Task<AppConfig> GetAppConfigAsync(Guid userId, Guid schoolId, string appVersion)
{
    var cacheKey = $"mobile_app_config:{schoolId}:{userId}";
    var cached = await _cacheService.GetAsync<AppConfig>(cacheKey);
    if (cached != null) return cached;

    var (school, permissions, mobileFlags, appConfig) = await (
        _schoolService.GetSchoolAsync(schoolId),
        _schoolFeaturePermissionService.GetEnabledModulesAsync(schoolId),
        GetMobileFeaturesAsync(schoolId, userId, appVersion),
        GetVersionConfigAsync(schoolId)
    );

    var config = new AppConfig
    {
        SchoolId = schoolId.ToString(),
        AcademicYear = await _academicsService.GetCurrentAcademicYearAsync(schoolId),
        Branding = await GetBrandingAsync(schoolId),
        Modules = BuildModuleFlags(permissions),
        MobileFeatures = mobileFlags,
        RolePermissions = BuildRolePermissions(await _userRoleService.GetUserPermissionsAsync(userId)),
        RemoteConfig = BuildRemoteConfig(appConfig),
        VersionRequirements = BuildVersionRequirements(appConfig),
    };

    await _cacheService.SetAsync(cacheKey, config, TimeSpan.FromMinutes(5));
    return config;
}
```

---

## PHASE 6: Mobile Implementation

### 6.1 App Config Hook

```typescript
// mobile/src/features/appConfig/hooks/useAppConfig.ts
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../../api/client';
import { useSchoolStore } from '../../../stores/schoolStore';
import type { AppConfig } from '@vitana/shared-types';

const APP_CONFIG_CACHE_KEY = 'cached_app_config';

export function useAppConfig() {
  const { setAppConfig } = useSchoolStore();

  return useQuery({
    queryKey: ['app-config'],
    queryFn: async (): Promise<AppConfig> => {
      try {
        const config = await apiClient.get('/mobile/app-config') as AppConfig;
        setAppConfig(config);
        // Persist to AsyncStorage for cold start with no internet
        await AsyncStorage.setItem(APP_CONFIG_CACHE_KEY, JSON.stringify(config));
        return config;
      } catch (error) {
        // Fallback to AsyncStorage cache
        const cached = await AsyncStorage.getItem(APP_CONFIG_CACHE_KEY);
        if (cached) {
          const config = JSON.parse(cached) as AppConfig;
          setAppConfig(config);
          return config;
        }
        throw error;
      }
    },
    staleTime: 30 * 60 * 1000,       // 30 minutes
    gcTime: 24 * 60 * 60 * 1000,      // 24 hours
    placeholderData: (prev) => prev,   // stale-while-revalidate
    retry: 1,
  });
}
```

### 6.2 Feature Flag Hook

```typescript
// mobile/src/hooks/useFeatureFlag.ts
import { useSchoolStore } from '../stores/schoolStore';

/**
 * Returns true if the given feature flag is enabled for the current school.
 * Checks both module-level flags and mobile-specific flags.
 *
 * @param featureKey - e.g. 'library', 'mobile.fees.online_payment'
 * @param defaultValue - fallback if config not loaded yet (default: false)
 */
export function useFeatureFlag(featureKey: string, defaultValue = false): boolean {
  const { moduleFlags, mobileFeatureFlags, isConfigLoaded } = useSchoolStore();

  if (!isConfigLoaded) return defaultValue;

  // Check mobile-specific flags first (more granular)
  if (featureKey in (mobileFeatureFlags ?? {})) {
    return mobileFeatureFlags![featureKey as keyof typeof mobileFeatureFlags] ?? defaultValue;
  }

  // Check module-level flags
  if (featureKey in (moduleFlags ?? {})) {
    return moduleFlags![featureKey as keyof typeof moduleFlags] ?? defaultValue;
  }

  return defaultValue;
}

/**
 * Returns feature flag value synchronously from store (no hook — use in non-React code)
 */
export function getFeatureFlag(featureKey: string, defaultValue = false): boolean {
  const { moduleFlags, mobileFeatureFlags } = useSchoolStore.getState();

  if (featureKey in (mobileFeatureFlags ?? {})) {
    return (mobileFeatureFlags as any)?.[featureKey] ?? defaultValue;
  }
  if (featureKey in (moduleFlags ?? {})) {
    return (moduleFlags as any)?.[featureKey] ?? defaultValue;
  }
  return defaultValue;
}
```

### 6.3 Feature Guard Component

```typescript
// mobile/src/components/common/FeatureGuard.tsx
import { ReactNode } from 'react';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

interface FeatureGuardProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children if feature is enabled, fallback otherwise.
 *
 * @example
 * <FeatureGuard feature="library">
 *   <LibrarySection />
 * </FeatureGuard>
 *
 * <FeatureGuard feature="transport" fallback={<LockedModuleCard name="Transport" />}>
 *   <TransportSection />
 * </FeatureGuard>
 */
export function FeatureGuard({ feature, children, fallback = null }: FeatureGuardProps) {
  const isEnabled = useFeatureFlag(feature);
  return isEnabled ? <>{children}</> : <>{fallback}</>;
}
```

### 6.4 Locked Module Card

```typescript
// mobile/src/components/common/LockedModuleCard.tsx
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

interface Props { name: string; description?: string; }

export function LockedModuleCard({ name, description }: Props) {
  return (
    <View className="bg-surface border border-border rounded-xl p-4 flex-row items-center opacity-60">
      <View className="w-10 h-10 rounded-xl bg-border items-center justify-center mr-3">
        <Feather name="lock" size={18} color={VITANA_DESIGN_TOKENS.colors.textSecondary} />
      </View>
      <View className="flex-1">
        <Text className="font-body-medium text-text-secondary">{name}</Text>
        <Text className="font-body text-text-secondary text-xs">
          {description ?? 'Not available on your current plan'}
        </Text>
      </View>
    </View>
  );
}
```

### 6.5 Dynamic Navigation Hook

```typescript
// mobile/src/features/navigation/hooks/useParentMoreItems.ts
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';

export interface MoreMenuItem {
  key: string;
  label: string;
  icon: string;
  route: string;
  isLocked?: boolean;
}

export function useParentMoreItems(): MoreMenuItem[] {
  const hasLibrary = useFeatureFlag('library');
  const hasTransport = useFeatureFlag('transport');
  const hasHostel = useFeatureFlag('hostel');

  const items: MoreMenuItem[] = [
    { key: 'announcements', label: 'Announcements', icon: 'bell', route: '/(parent)/announcements/' },
    { key: 'diary', label: 'Class Diary', icon: 'book', route: '/(parent)/diary/' },
    { key: 'leaves', label: 'Leave Requests', icon: 'calendar', route: '/(parent)/leaves/' },
    { key: 'notifications', label: 'Notifications', icon: 'inbox', route: '/(parent)/notifications/' },
  ];

  // Conditionally add feature-flagged items (show locked state if disabled)
  items.push(
    hasLibrary
      ? { key: 'library', label: 'Library', icon: 'book-open', route: '/(parent)/library/' }
      : { key: 'library', label: 'Library', icon: 'book-open', route: '', isLocked: true },
  );

  if (hasTransport) {
    items.push({ key: 'transport', label: 'Transport', icon: 'truck', route: '/(parent)/transport/' });
  }
  if (hasHostel) {
    items.push({ key: 'hostel', label: 'Hostel', icon: 'home', route: '/(parent)/hostel/' });
  }

  items.push(
    { key: 'profile', label: 'Profile', icon: 'user', route: '/(parent)/profile/' },
    { key: 'settings', label: 'Settings', icon: 'settings', route: '/(parent)/profile/settings/' },
  );

  return items;
}
```

### 6.6 Root Layout — Load App Config + Version Check

```typescript
// mobile/app/_layout.tsx — ADD this after authentication confirmed

import { useAppConfig } from '../src/features/appConfig/hooks/useAppConfig';
import { semverLt } from '@vitana/shared-utils';
import * as Application from 'expo-application';

function AppConfigLoader() {
  const { data: config } = useAppConfig();

  useEffect(() => {
    if (!config) return;

    const currentVersion = Application.nativeApplicationVersion ?? '1.0.0';
    const { versionRequirements } = config;

    // Maintenance mode — blocks all navigation
    if (versionRequirements.maintenanceMode) {
      router.replace('/maintenance');
      return;
    }

    // Force update — blocks all navigation
    if (versionRequirements.forceUpdateVersion &&
        semverLt(currentVersion, versionRequirements.forceUpdateVersion)) {
      router.replace('/force-update');
      return;
    }

    // Soft update banner (handled in UI, not navigation)
  }, [config]);

  return null;
}

// Use in RootLayout — render inside QueryClientProvider and after auth check
<AppConfigLoader />
```

### 6.7 Force Update Screen

```typescript
// mobile/app/force-update.tsx
import { View, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSchoolStore } from '../src/stores/schoolStore';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';
import Constants from 'expo-constants';

export default function ForceUpdateScreen() {
  const { isConfigLoaded } = useSchoolStore();

  const storeUrl = Platform.OS === 'ios'
    ? 'https://apps.apple.com/app/vitana-sms/id0000000000'  // replace with real App Store ID
    : 'https://play.google.com/store/apps/details?id=com.vitana.sms';

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
      <View className="w-24 h-24 rounded-2xl bg-primary/10 items-center justify-center mb-6">
        <Text className="text-5xl">🔄</Text>
      </View>
      <Text className="font-heading text-2xl text-text-primary text-center mb-3">
        Update Required
      </Text>
      <Text className="font-body text-text-secondary text-center mb-8 leading-6">
        A newer version of Vitana SMS is required to continue. Please update the app to access all features.
      </Text>
      <TouchableOpacity
        onPress={() => Linking.openURL(storeUrl)}
        className="rounded-xl px-8 py-4 items-center w-full"
        style={{ backgroundColor: VITANA_DESIGN_TOKENS.colors.primary }}
      >
        <Text className="font-body-semibold text-white text-base">
          {Platform.OS === 'ios' ? 'Update on App Store' : 'Update on Play Store'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
```

### 6.8 Maintenance Screen

```typescript
// mobile/app/maintenance.tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSchoolStore } from '../src/stores/schoolStore';
import apiClient from '../src/api/client';
import { queryClient } from '../src/api/queryClient';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';
import { router } from 'expo-router';

export default function MaintenanceScreen() {
  const { isConfigLoaded } = useSchoolStore();

  async function checkAgain() {
    try {
      await queryClient.invalidateQueries({ queryKey: ['app-config'] });
      const config = await apiClient.get('/mobile/app-config') as any;
      if (!config.versionRequirements.maintenanceMode) {
        router.replace('/');
      }
    } catch {
      // still in maintenance
    }
  }

  const message = useSchoolStore.getState().isConfigLoaded
    ? (useSchoolStore.getState() as any).remoteConfig?.maintenanceMessage
    : null;

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
      <Text className="text-6xl mb-6">🔧</Text>
      <Text className="font-heading text-2xl text-text-primary text-center mb-3">
        Under Maintenance
      </Text>
      <Text className="font-body text-text-secondary text-center mb-8 leading-6">
        {message ?? "We're performing scheduled maintenance. The app will be back shortly."}
      </Text>
      <TouchableOpacity
        onPress={checkAgain}
        className="rounded-xl px-8 py-4 items-center w-full"
        style={{ backgroundColor: VITANA_DESIGN_TOKENS.colors.primary }}
      >
        <Text className="font-body-semibold text-white text-base">Check Again</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
```

### 6.9 More Tab — Dynamic Menu

```typescript
// mobile/app/(parent)/more.tsx
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useParentMoreItems } from '../../src/features/navigation/hooks/useParentMoreItems';
import { LockedModuleCard } from '../../src/components/common/LockedModuleCard';
import { useLogout } from '../../src/features/auth/hooks/useLogout';
import { useAppTheme } from '../../src/theme/SchoolThemeProvider';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

export default function ParentMore() {
  const items = useParentMoreItems();
  const { colors } = useAppTheme();
  const { logout } = useLogout();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        <Text className="font-heading text-xl text-text-primary mb-4">More</Text>

        {items.map((item) =>
          item.isLocked ? (
            <View key={item.key} className="mb-2">
              <LockedModuleCard name={item.label} />
            </View>
          ) : (
            <TouchableOpacity
              key={item.key}
              onPress={() => router.push(item.route as any)}
              className="flex-row items-center bg-white border border-border rounded-xl px-4 py-4 mb-2"
              activeOpacity={0.7}
            >
              <View
                className="w-9 h-9 rounded-lg items-center justify-center mr-3"
                style={{ backgroundColor: colors.primaryLight }}
              >
                <Feather name={item.icon as any} size={18} color={colors.primary} />
              </View>
              <Text className="font-body-medium text-text-primary flex-1">{item.label}</Text>
              <Feather name="chevron-right" size={16} color={VITANA_DESIGN_TOKENS.colors.textSecondary} />
            </TouchableOpacity>
          )
        )}

        {/* Sign Out */}
        <TouchableOpacity
          onPress={logout}
          className="flex-row items-center bg-danger/5 border border-danger/20 rounded-xl px-4 py-4 mt-4 mb-8"
        >
          <View className="w-9 h-9 rounded-lg bg-danger/10 items-center justify-center mr-3">
            <Feather name="log-out" size={18} color={VITANA_DESIGN_TOKENS.colors.danger} />
          </View>
          <Text className="font-body-medium text-danger">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
```

---

## PHASE 7–8: AI/ML & External Integrations

> Not applicable.

---

## PHASE 9: Testing & Validation

```typescript
// mobile/src/hooks/__tests__/useFeatureFlag.test.ts
import { useFeatureFlag } from '../useFeatureFlag';
import { useSchoolStore } from '../../stores/schoolStore';
import { renderHook } from '@testing-library/react-native';

describe('useFeatureFlag', () => {
  it('returns false for unknown key when config loaded', () => {
    useSchoolStore.setState({ isConfigLoaded: true, moduleFlags: {}, mobileFeatureFlags: {} } as any);
    const { result } = renderHook(() => useFeatureFlag('unknown.key'));
    expect(result.current).toBe(false);
  });

  it('returns module flag value', () => {
    useSchoolStore.setState({ isConfigLoaded: true, moduleFlags: { library: true }, mobileFeatureFlags: {} } as any);
    const { result } = renderHook(() => useFeatureFlag('library'));
    expect(result.current).toBe(true);
  });

  it('mobile feature flag overrides module flag', () => {
    useSchoolStore.setState({
      isConfigLoaded: true,
      moduleFlags: { 'mobile.fees.online_payment': false },
      mobileFeatureFlags: { 'mobile.fees.online_payment': true },
    } as any);
    const { result } = renderHook(() => useFeatureFlag('mobile.fees.online_payment'));
    expect(result.current).toBe(true);
  });
});
```

### Validation Checklist

- [ ] `GET /api/mobile/app-config` called on first authenticated render (check network tab)
- [ ] Config persisted to AsyncStorage (verify via Expo AsyncStorage viewer)
- [ ] `library: false` in config → library items hidden in More tab
- [ ] `library: false` → `LockedModuleCard` shows for library
- [ ] `forceUpdateVersion: "99.0.0"` → force-update screen blocks navigation
- [ ] `maintenanceMode: true` → maintenance screen shown
- [ ] "Check Again" on maintenance screen re-fetches config
- [ ] App starts offline → AsyncStorage config used → no crash

---

## PHASE 10: Documentation & Verification

### Git Commit

```bash
git add .
git commit -m "feat(mobile/flags): feature flag platform

- useAppConfig() hook: fetches + caches in TanStack Query + AsyncStorage
- useFeatureFlag(key) hook: reactive boolean, module + mobile flag resolution
- FeatureGuard component: wraps optional features
- LockedModuleCard: greyed-out card for disabled modules
- useParentMoreItems() hook: dynamic More menu from feature flags
- Dynamic More tab screens rendered from flag state
- Force update screen (blocking, no bypass)
- Maintenance mode screen with 'Check Again'
- AppConfigLoader: integrates version check into root layout
- Backend: MobileFeatureFlags + MobileAppConfiguration tables
- Backend: GET /api/mobile/app-config endpoint with Redis cache

Used by: PROMPT-03, 04, 05, 06, 08, 09 (all feature-guarded content)"
```

---

**END OF PROMPT-10**
