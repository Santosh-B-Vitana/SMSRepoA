# PROMPT-10: Feature Flag Platform Implementation

> **Prompt ID:** PROMPT-10  
> **Epic:** EP-09 — Feature Flag Platform  
> **Phase:** 2 — Sprint 10 (mobile), Sprint 7–8 (backend)  
> **Estimated Story Points:** 18  
> **Prerequisites:** PROMPT-01 complete; backend database migrations applied  
> **Related Architecture Docs:** [07-feature-flag-architecture](../07-feature-flag-architecture.md)

---

## Context

Implement the complete feature flag system that allows:
1. Super Admin to enable/disable modules per school.
2. Mobile app to receive all feature configuration in one call.
3. Navigation to be dynamically generated based on enabled features.
4. App version gates for forced updates.

Read `docs/mobile_application_docs/07-feature-flag-architecture.md` completely.

---

## Backend Requirements

### New Database Tables (AppDbContext migration)

```csharp
// Migration: Add mobile feature flag tables
// Tables: MobileFeatureFlags, MobileAppConfiguration, MobileFeatureFlagAuditLog
// Schema defined in 07-feature-flag-architecture.md Section 3.1
```

### New Service: `IMobileAppConfigService`

Implement as defined in architecture doc Section 6.

Resolution priority:
1. Platform kill switch (`PlatformFeatureKillSwitches` in CRM DB).
2. Version gate (`minVersion`, `maxVersion` on `MobileFeatureFlags`).
3. User-specific override (for beta testing).
4. Role-specific flag.
5. School-level flag.
6. Plan matrix (does school's plan include this feature?).
7. Default value.

### New Endpoint: `GET /api/mobile/app-config`

Response shape defined exactly in architecture doc Section 5. Must be:
- Role-aware (returns different `rolePermissions` per role).
- Cached in Redis for 5 minutes per `{schoolId}:{userId}`.
- `AllowAnonymous` is **NOT** appropriate — require valid JWT.

### Extend `SchoolFeaturePermissionController`

Add:
- `GET /api/mobile/feature-flags` — list all flags for current school (Admin+).
- `PUT /api/mobile/feature-flags/{key}` — enable/disable a flag (Admin+).
- Audit log write on every change.

---

## Mobile Requirements

### 1. App Config Loader

Implement `src/features/appConfig/hooks/useAppConfig.ts`:

```typescript
export function useAppConfig() {
  return useQuery({
    queryKey: ['app-config'],
    queryFn: () => mobileApi.getAppConfig(),
    staleTime: 30 * 60 * 1000,    // 30 minutes
    gcTime: 24 * 60 * 60 * 1000,   // 24 hours
    placeholderData: (prev) => prev,
    // On first load: persist to AsyncStorage for next cold start
  });
}
```

Persist app config to AsyncStorage on first successful load. On subsequent cold starts, AsyncStorage data is used immediately while fresh data loads in background.

### 2. Feature Flag Hook

```typescript
// src/hooks/useFeatureFlag.ts
export function useFeatureFlag(featureKey: string, defaultValue = false): boolean {
  const { data: config } = useAppConfig();
  return (
    config?.mobileFeatures?.[featureKey] ??
    config?.modules?.[featureKey] ??
    defaultValue
  );
}
```

### 3. Feature Guard Component

```typescript
// src/components/common/FeatureGuard.tsx
export function FeatureGuard({
  feature,
  children,
  fallback = null,
}: {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const isEnabled = useFeatureFlag(feature);
  return isEnabled ? <>{children}</> : <>{fallback}</>;
}
```

Usage example:
```tsx
// In parent More tab
<FeatureGuard feature="library" fallback={<LockedFeatureCard name="Library" />}>
  <LibrarySection />
</FeatureGuard>
```

### 4. Dynamic Navigation Configuration

Implement `src/features/navigation/hooks/useParentNavigation.ts` that returns:
- Fixed tabs: Home, Attendance, Fees, Results (always shown).
- Dynamic "More" items: Library, Transport, Hostel — shown only when feature flag enabled.

Same pattern for `useTeacherNavigation`, `useStudentNavigation`, `useAdminNavigation`.

### 5. Version Check

Implement `src/lib/versionCheck.ts`:

```typescript
export async function performVersionCheck(config: AppConfig) {
  const currentVersion = Application.nativeApplicationVersion!;
  
  if (config.versionRequirements.maintenanceMode) {
    router.replace('/maintenance');
    return;
  }
  
  if (config.versionRequirements.forceUpdateVersion &&
      semverLt(currentVersion, config.versionRequirements.forceUpdateVersion)) {
    router.replace('/force-update');
    return;
  }
}
```

### 6. Maintenance Screen (`app/maintenance.tsx`)

Full-screen screen shown when `maintenanceMode: true`.
- Wrench icon.
- "We're performing maintenance" heading.
- `config.versionRequirements.maintenanceMessage` body text.
- "Check again" button (re-fetches config).

### 7. Force Update Screen (`app/force-update.tsx`)

Full-screen blocking screen.
- "Update Required" heading.
- "A newer version of the app is required."
- "Update Now" button → opens Play Store / App Store URL.
- No way to bypass this screen.

---

## Implementation Tasks

Backend:
1. Database migration: `MobileFeatureFlags`, `MobileAppConfiguration`, `MobileFeatureFlagAuditLog`.
2. `IMobileAppConfigService` implementation.
3. `GET /api/mobile/app-config` endpoint with Redis caching.
4. `GET/PUT /api/mobile/feature-flags` endpoints.
5. Platform kill switch support (CRM DB).

Mobile:
6. Implement `useAppConfig()` hook with AsyncStorage persistence.
7. Implement `useFeatureFlag(key)` hook.
8. Implement `FeatureGuard` component.
9. Implement `LockedFeatureCard` component (greyed out, "Not available on your plan").
10. Implement dynamic navigation hooks for each role.
11. Apply `FeatureGuard` to: Library, Transport, Hostel, Online Exams, WhatsApp sections.
12. Implement `versionCheck.ts`.
13. Implement maintenance screen.
14. Implement force update screen.
15. Add version check to root `_layout.tsx` post-config-load.
16. Unit tests.

---

## Acceptance Criteria

- [ ] `GET /api/mobile/app-config` returns correct modules and features for a school.
- [ ] Disabling `library` in Super Admin panel → library section disappears in mobile app within 30 minutes.
- [ ] Enabling `transport` → transport card appears in More tab.
- [ ] Feature flag audit log records changes.
- [ ] `forceUpdateVersion: "99.0.0"` → force update screen shown, cannot be bypassed.
- [ ] `maintenanceMode: true` → maintenance screen shown.
- [ ] On API failure, last cached config is used (test with airplane mode).
- [ ] `useFeatureFlag('library')` returns `false` when flag is off.
- [ ] Dynamic navigation renders correct tabs/items based on flags.

---

## Testing Requirements

- Unit: `useFeatureFlag` with mock config returns correct values.
- Unit: `performVersionCheck` with `forceUpdateVersion < current` does nothing; `> current` redirects.
- Integration: Call `GET /api/mobile/app-config` with different school configs.
- Manual: Toggle library flag off → verify library disappears within cache TTL.

---

## Definition of Done

- [ ] All acceptance criteria pass.
- [ ] Redis caching verified (API response time < 50ms on repeated calls).
- [ ] No `any` types.
- [ ] Peer review complete.
