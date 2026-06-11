# Vitana Mobile Platform — Feature Flag Architecture

> **Classification:** Internal Architecture Document  
> **Version:** 1.0  
> **Date:** June 2026  
> **Related Docs:** [06-mobile-architecture](./06-mobile-architecture.md) · [08-white-label-architecture](./08-white-label-architecture.md)

---

## 1. Guiding Principle

Feature management is built **inside Vitana** — not delegated to Flagsmith, LaunchDarkly, Unleash, or any third-party SaaS. This keeps:
- Tenant data sovereign.
- Configuration in the same audit trail as all other school data.
- Zero external dependency for a core platform function.
- Full control over schema, caching, and delivery mechanism.

---

## 2. Feature Flag Taxonomy

Vitana's feature flags exist at multiple levels. Higher-level flags override lower ones.

```
Platform Level (SuperAdmin)
    └── SchoolFeaturePermissions (per-school module on/off)
            └── PlanFeatureMatrix (feature tier → plan mapping)
                    └── RoleFeatureAccess (which roles can use enabled features)
                            └── EnvironmentFeatures (dev/staging overrides)
                                    └── VersionFeatures (min app version gates)
                                            └── UserFeatureOverrides (per-user beta)
```

---

## 3. Database Schema Design

### 3.1 AppDbContext Tables (Per-School)

```sql
-- Already exists: module-level flags
SchoolFeaturePermissions
  SchoolId          UNIQUEIDENTIFIER
  FeatureKey        NVARCHAR(100)     -- e.g. "library", "transport", "hostel"
  IsEnabled         BIT
  EnabledAt         DATETIME2
  EnabledBy         UNIQUEIDENTIFIER

-- NEW: Fine-grained mobile feature flags
MobileFeatureFlags
  Id                UNIQUEIDENTIFIER  PRIMARY KEY
  SchoolId          UNIQUEIDENTIFIER
  FeatureKey        NVARCHAR(100)     -- e.g. "mobile.attendance.biometric"
  IsEnabled         BIT
  Scope             NVARCHAR(50)      -- 'global' | 'role' | 'user'
  RoleTarget        NVARCHAR(50)      -- null | 'Teacher' | 'Parent' | ...
  UserTarget        UNIQUEIDENTIFIER  -- null | specific userId
  MinAppVersion     NVARCHAR(20)      -- null | "1.2.0" (semver)
  MaxAppVersion     NVARCHAR(20)      -- null | "2.0.0"
  Metadata          NVARCHAR(MAX)     -- JSON: {"rolloutPercentage": 20}
  CreatedAt         DATETIME2
  UpdatedAt         DATETIME2
  CreatedBy         UNIQUEIDENTIFIER
  
-- NEW: Mobile app configuration
MobileAppConfiguration
  Id                UNIQUEIDENTIFIER  PRIMARY KEY
  SchoolId          UNIQUEIDENTIFIER
  ConfigKey         NVARCHAR(100)
  ConfigValue       NVARCHAR(MAX)     -- JSON or scalar
  Environment       NVARCHAR(20)      -- 'production' | 'staging' | 'development'
  UpdatedAt         DATETIME2
  UpdatedBy         UNIQUEIDENTIFIER

-- NEW: Feature audit log
MobileFeatureFlagAuditLog
  Id                UNIQUEIDENTIFIER  PRIMARY KEY
  SchoolId          UNIQUEIDENTIFIER
  FeatureKey        NVARCHAR(100)
  OldValue          BIT
  NewValue          BIT
  ChangedBy         UNIQUEIDENTIFIER
  ChangedAt         DATETIME2
  Reason            NVARCHAR(500)
```

### 3.2 CrmDbContext Tables (Platform-Level)

```sql
-- NEW: Plan-to-feature matrix
PlanFeatureMatrix
  Id                INT               PRIMARY KEY
  PlanName          NVARCHAR(50)      -- 'Standard' | 'Pro' | 'Enterprise'
  FeatureKey        NVARCHAR(100)
  IsIncluded        BIT
  LimitValue        INT               -- null | quota (e.g. 5000 WhatsApp messages/month)

-- NEW: Platform-level feature kill switches
PlatformFeatureKillSwitches
  FeatureKey        NVARCHAR(100)     PRIMARY KEY
  IsKilled          BIT
  Reason            NVARCHAR(500)
  KilledAt          DATETIME2
  KilledBy          NVARCHAR(100)     -- SuperAdmin username
```

---

## 4. Feature Key Convention

Feature keys are hierarchical, dot-separated strings:

```
module.submodule.feature
```

**Examples:**
```
library                          -- Module-level: Library module enabled
transport                        -- Module-level: Transport module enabled
hostel                           -- Module-level: Hostel module enabled
online_exams                     -- Module-level: Online exams enabled

mobile.attendance.offline        -- Offline attendance marking
mobile.attendance.biometric      -- Biometric attendance sync
mobile.fees.online_payment       -- Cashfree payment on mobile
mobile.fees.wallet               -- School wallet on mobile
mobile.exams.online_exam_portal  -- Student online exam taking on mobile
mobile.communication.whatsapp    -- WhatsApp campaign trigger on mobile
mobile.documents.id_card_viewer  -- ID card digital display
mobile.analytics.advanced        -- Advanced analytics for admin
mobile.parent.multi_child        -- Multi-child switching for parents
```

---

## 5. App Configuration Endpoint

The mobile app fetches all required configuration in a single call at boot:

```
GET /api/mobile/app-config
Authorization: Bearer <token>

Response:
{
  "data": {
    "schoolId": "...",
    "academicYear": "2025-2026",
    
    "branding": {
      "schoolName": "Delhi Public School",
      "logoUrl": "https://cdn.vitanasms.com/...",
      "primaryColor": "#1a6fd8",
      "accentColor": "#17a2b8",
      "splashScreenUrl": "...",
      "appIconUrl": "..."
    },
    
    "modules": {
      "library": true,
      "transport": false,
      "hostel": true,
      "onlineExams": true,
      "whatsapp": false
    },
    
    "mobileFeatures": {
      "mobile.attendance.offline": true,
      "mobile.attendance.biometric": false,
      "mobile.fees.online_payment": true,
      "mobile.fees.wallet": true,
      "mobile.exams.online_exam_portal": false,
      "mobile.parent.multi_child": true
    },
    
    "rolePermissions": {
      "canMarkAttendance": true,
      "canEnterMarks": true,
      "canViewFinance": false,
      "canApproveLeave": true
    },
    
    "remoteConfig": {
      "attendanceGracePeriodMinutes": 15,
      "maxOfflineQueueSize": 200,
      "syncIntervalMinutes": 5,
      "featureAnnouncements": []
    },
    
    "versionRequirements": {
      "minVersion": "1.0.0",
      "recommendedVersion": "1.2.0",
      "forceUpdateVersion": null,
      "maintenanceMode": false,
      "maintenanceMessage": null
    }
  }
}
```

This single endpoint replaces 5+ separate calls that would otherwise be needed on app boot.

---

## 6. Mobile Feature Flag Service (Backend)

```csharp
// Services/Mobile/IMobileAppConfigService.cs
public interface IMobileAppConfigService
{
    Task<MobileAppConfig> GetAppConfigAsync(Guid userId, string appVersion);
    Task<bool> IsFeatureEnabledAsync(string featureKey, Guid userId, string? appVersion = null);
    Task SetFeatureFlagAsync(string featureKey, bool isEnabled, string scope, Guid? roleTarget, Guid? userTarget);
    Task<IReadOnlyList<FeatureFlag>> GetAllFlagsAsync(Guid schoolId);
    Task RecordFeatureFlagChangeAsync(string featureKey, bool oldValue, bool newValue, Guid changedBy, string reason);
}
```

**Resolution logic (priority order):**
1. Platform kill switch (if killed → disabled for all).
2. Version gate (if `appVersion < minVersion` → disabled).
3. User-specific override (beta users).
4. Role-specific flag.
5. School-level flag.
6. Plan matrix (does the school's plan include this feature?).
7. Default (enabled unless explicitly disabled).

---

## 7. Mobile Consumption Strategy

### 7.1 Startup Load

```typescript
// src/stores/schoolStore.ts
export function useAppConfig() {
  return useQuery({
    queryKey: ['app-config'],
    queryFn: () => mobileApi.getAppConfig(),
    staleTime: 30 * 60 * 1000,  // 30 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours in cache
    // On error: use cached version (graceful degradation)
    placeholderData: (prev) => prev,
  });
}
```

### 7.2 Feature Guard Component

```typescript
// src/components/common/FeatureGuard.tsx
interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGuard({ feature, children, fallback = null }: FeatureGuardProps) {
  const { data: config } = useAppConfig();
  
  const isEnabled = config?.mobileFeatures[feature] ?? 
                    config?.modules[feature] ?? 
                    false;
  
  if (!isEnabled) return <>{fallback}</>;
  return <>{children}</>;
}
```

**Usage:**
```tsx
<FeatureGuard feature="mobile.fees.online_payment">
  <PayFeeButton />
</FeatureGuard>

<FeatureGuard feature="transport" fallback={<ModuleUnavailableCard />}>
  <TransportCard />
</FeatureGuard>
```

### 7.3 Feature Hook

```typescript
// src/hooks/useFeatureFlag.ts
export function useFeatureFlag(featureKey: string): boolean {
  const { data: config } = useAppConfig();
  return (
    config?.mobileFeatures[featureKey] ?? 
    config?.modules[featureKey] ?? 
    false
  );
}
```

### 7.4 Dynamic Navigation Menu

The tab bar and "More" screen are dynamically rendered based on feature flags:

```typescript
// src/features/auth/hooks/useNavigationConfig.ts
export function useNavigationConfig(role: UserRole) {
  const config = useAppConfig();
  const hasLibrary = useFeatureFlag('library');
  const hasTransport = useFeatureFlag('transport');
  const hasHostel = useFeatureFlag('hostel');
  
  return useMemo(() => {
    const baseParentTabs = [
      { key: 'home', label: 'Home', icon: 'home', route: '/(parent)/' },
      { key: 'attendance', label: 'Attendance', icon: 'calendar', route: '/(parent)/attendance' },
      { key: 'fees', label: 'Fees', icon: 'credit-card', route: '/(parent)/fees' },
      { key: 'results', label: 'Results', icon: 'bar-chart', route: '/(parent)/results' },
    ];
    
    const moreItems = [
      hasLibrary && { key: 'library', label: 'Library', route: '/(parent)/library' },
      hasTransport && { key: 'transport', label: 'Transport', route: '/(parent)/transport' },
      hasHostel && { key: 'hostel', label: 'Hostel', route: '/(parent)/hostel' },
    ].filter(Boolean);
    
    return { tabs: baseParentTabs, moreItems };
  }, [config, role]);
}
```

---

## 8. Remote Configuration

Beyond feature flags, the `remoteConfig` block in app-config supports dynamic behavior control without app updates:

| Key | Type | Purpose |
|---|---|---|
| `attendanceGracePeriodMinutes` | int | How late a teacher can still mark today's attendance |
| `maxOfflineQueueSize` | int | Max pending operations before warning user |
| `syncIntervalMinutes` | int | How often offline sync runs in background |
| `featureAnnouncements` | array | In-app banners for new features (title, message, linkUrl) |
| `supportEmail` | string | Support email shown in error screens |
| `maintenanceMode` | bool | Full-screen maintenance message |
| `maintenanceMessage` | string | Message shown during maintenance |
| `forceUpdateVersion` | string | Minimum version before force-upgrade screen |
| `feedbackFormUrl` | string | URL for in-app feedback form |

---

## 9. Version Gates

The `versionRequirements` block enables:

```typescript
// src/lib/versionCheck.ts
export async function checkVersionRequirements(config: AppConfig) {
  const currentVersion = Application.nativeApplicationVersion!;
  
  if (config.versionRequirements.maintenanceMode) {
    router.replace('/maintenance');
    return;
  }
  
  if (config.versionRequirements.forceUpdateVersion) {
    if (semverLt(currentVersion, config.versionRequirements.forceUpdateVersion)) {
      router.replace('/force-update');
      return;
    }
  }
  
  if (semverLt(currentVersion, config.versionRequirements.recommendedVersion)) {
    // Show soft update banner (dismissible)
    setUpdateBanner(true);
  }
}
```

This allows Vitana to:
- Force old app versions to update when the API contract changes.
- Show recommended update banners without force-blocking users.
- Put the entire app in maintenance mode during deployments.

---

## 10. Super Admin Feature Management UI (Mobile Impact)

The existing Super Admin portal (`/api/school-feature-permissions`) already manages module-level flags. We need to extend it with:

1. **Mobile Feature Flags page** — grid of all `MobileFeatureFlags` per school.
2. **Plan Matrix editor** — which features are included in Standard/Pro/Enterprise.
3. **Kill Switch panel** — platform-wide emergency disables.
4. **Feature flag audit log** — who changed what and when.

These are web UI extensions, not mobile screens.

---

## 11. Caching Strategy

```
API Response (30-min stale time)
    │
    ▼
TanStack Query Cache (in-memory)
    │
    ▼
AsyncStorage (persisted between app restarts)
    │
    ▼
Last-known-good fallback (on API failure)
```

If the `/api/mobile/app-config` call fails (no internet):
1. TanStack Query serves the cached response.
2. If no cache (first install), use hardcoded defaults with all optional modules disabled.
3. Log the failure to Sentry for visibility.

---

## 12. Feature Rollout Strategy

Vitana uses **percentage-based rollout** via the `Metadata` JSON field on `MobileFeatureFlags`:

```json
{
  "rolloutPercentage": 20,
  "rolloutCohort": "userId-hash"
}
```

Server-side resolution:
```
hash(userId + featureKey) mod 100 < rolloutPercentage
    → enabled for this user
```

**Rollout stages:**
1. **Internal testing:** `rolloutPercentage: 0` + `userTarget` for Vitana team accounts.
2. **Beta schools:** `rolloutPercentage: 100` on 2–3 willing early-adopter schools.
3. **Gradual rollout:** 10% → 25% → 50% → 100% across all schools.
4. **Full availability:** Remove rollout condition; set `IsEnabled = true` globally.
5. **Kill switch:** If bugs are found, `PlatformFeatureKillSwitches.IsKilled = true` immediately halts all users.

---

*Next: [08-white-label-architecture.md](./08-white-label-architecture.md)*
