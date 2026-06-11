# EP-09: Feature Flag Platform

> **Epic ID:** EP-09  
> **Priority:** P1  
> **Estimated Sprints:** 2  
> **Phase:** 1–2 — Sprints 2 & 7  
> **Related Docs:** [07-feature-flag-architecture](../07-feature-flag-architecture.md) · [PROMPT-10](../12-cursor-prompts/PROMPT-10-feature-flags.md)

---

## Business Objective

Different schools purchase different tiers of Vitana SMS. A school on the Standard plan doesn't need — and shouldn't see — the Hostel or Transport modules they haven't paid for. Feature flags enable Vitana to: (1) control which modules each school can access, (2) roll out new features gradually, (3) A/B test features with pilot schools, (4) emergency-kill broken features without a code deploy, and (5) enforce plan-based access.

This is a platform-level capability, not a user-facing feature. Everything else in the mobile app depends on it.

## Technical Objective

Build the in-house feature flag system: backend service with plan-matrix + school + role + version resolution, `GET /api/mobile/app-config` endpoint, mobile `FeatureGuard` component, dynamic navigation generation, and version gates for force update and maintenance mode.

---

## Current State Analysis

The backend already has:
- `SchoolFeaturePermissions` table — module-level on/off per school.
- `GET /api/school-feature-permissions/my-school` — returns enabled modules.
- `SchoolFeatureAccessMiddleware` — blocks requests to disabled modules.

What's missing:
- Fine-grained `MobileFeatureFlags` table for mobile-specific features.
- `MobileAppConfiguration` table for remote config.
- `PlatformFeatureKillSwitches` table in CRM DB.
- `PlanFeatureMatrix` table in CRM DB.
- Unified `/api/mobile/app-config` aggregation endpoint.
- Version requirement enforcement.

---

## Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | `GET /api/mobile/app-config` returns all flags + branding + version requirements in one call |
| FR-2 | Module-level flags (library, transport, hostel) control navigation visibility |
| FR-3 | Mobile-specific flags (`mobile.attendance.offline`) control feature behavior |
| FR-4 | Version gate: if app < `forceUpdateVersion` → blocking upgrade screen |
| FR-5 | Maintenance mode: if `maintenanceMode=true` → blocking maintenance screen |
| FR-6 | Feature flags cached in TanStack Query (30-min stale) + AsyncStorage fallback |
| FR-7 | `FeatureGuard` component wraps all optional features |
| FR-8 | Dynamic navigation rendered from feature flags (no hardcoded menus) |
| FR-9 | Super Admin can toggle module flags per school (web UI, existing) |
| FR-10 | Platform kill switch disables a feature for ALL schools immediately |
| FR-11 | Percentage rollout for gradual feature releases |
| FR-12 | Audit log on every flag change (who, what, when, reason) |
| FR-13 | App-config endpoint cached in Redis (5 min, per schoolId+userId) |

---

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | `/api/mobile/app-config` responds in < 200ms (Redis cached) |
| NFR-2 | Feature flag resolution deterministic (no flicker on re-render) |
| NFR-3 | Cold-start with no connectivity uses AsyncStorage cached config |
| NFR-4 | Flag changes propagate to mobile within 30 minutes (cache TTL) |

---

## Flag Resolution Priority

```
1. Platform kill switch (CRM DB — overrides everything)
        ↓
2. Version gate (appVersion check)
        ↓
3. User-specific override (beta testers, Vitana staff accounts)
        ↓
4. Role-specific flag (e.g., enable for Teacher only)
        ↓
5. School-level flag (SchoolFeaturePermissions or MobileFeatureFlags)
        ↓
6. Plan matrix (does school's plan include this feature?)
        ↓
7. Default value (false for optional, true for core features)
```

---

## `GET /api/mobile/app-config` Response Structure

```json
{
  "data": {
    "schoolId": "...",
    "academicYear": "2025-2026",
    
    "branding": {
      "schoolName": "string",
      "logoUrl": "string",
      "primaryColor": "#hex",
      "accentColor": "#hex"
    },
    
    "modules": {
      "library": true,
      "transport": false,
      "hostel": true,
      "onlineExams": false,
      "whatsapp": false,
      "alumni": false,
      "healthRecords": false
    },
    
    "mobileFeatures": {
      "mobile.attendance.offline": true,
      "mobile.attendance.biometric": false,
      "mobile.fees.online_payment": true,
      "mobile.fees.wallet": true,
      "mobile.parent.multi_child": true,
      "mobile.exams.online_exam_portal": false,
      "mobile.communication.whatsapp_trigger": false,
      "mobile.documents.id_card_viewer": false
    },
    
    "rolePermissions": {
      "canMarkAttendance": true,
      "canEnterMarks": true,
      "canViewFinance": false,
      "canApproveLeave": true,
      "canCreateAnnouncement": false
    },
    
    "remoteConfig": {
      "attendanceGracePeriodMinutes": 15,
      "maxOfflineQueueSize": 200,
      "syncIntervalMinutes": 5,
      "supportEmail": "support@vitanasms.com",
      "feedbackFormUrl": "https://forms.vitanasms.com/feedback",
      "featureAnnouncements": []
    },
    
    "versionRequirements": {
      "minVersion": "1.0.0",
      "recommendedVersion": "1.2.0",
      "forceUpdateVersion": null,
      "maintenanceMode": false,
      "maintenanceMessage": null,
      "androidStoreUrl": "https://play.google.com/store/apps/details?id=com.vitana.sms",
      "iosStoreUrl": "https://apps.apple.com/app/vitana-sms/id123456789"
    }
  }
}
```

---

## Mobile Feature Guards

### `FeatureGuard` Component

```tsx
// Hides children when feature is disabled
<FeatureGuard feature="library">
  <LibrarySection />
</FeatureGuard>

// Shows fallback when disabled
<FeatureGuard feature="transport" fallback={<LockedModuleCard name="Transport" />}>
  <TransportSection />
</FeatureGuard>
```

### `useFeatureFlag` Hook

```typescript
const hasLibrary = useFeatureFlag('library');
const hasOfflineAttendance = useFeatureFlag('mobile.attendance.offline');
```

### `LockedModuleCard` Component

Displayed in the "More" tab for disabled modules:
- Module icon (greyed out).
- Module name.
- "Not available on your plan" text.
- Optional "Learn More" link (upgrades to Enterprise).

---

## Version Gate Screens

### Force Update Screen

- Full-screen, cannot be dismissed.
- "A newer version is required" heading.
- "Update Now" button → store URL from `versionRequirements`.
- No way to bypass.

### Maintenance Screen

- Full-screen, cannot be dismissed.
- Wrench illustration.
- "We're performing maintenance" heading.
- `maintenanceMessage` body text (localized).
- "Check Again" button → re-fetches `/api/mobile/app-config`.

---

## Remote Config Usage

| Config Key | Used In |
|---|---|
| `attendanceGracePeriodMinutes` | Teacher attendance screen: warning if marking past grace period |
| `maxOfflineQueueSize` | Offline queue: warn user when approaching limit |
| `syncIntervalMinutes` | Sync engine: background sync interval |
| `supportEmail` | Error screens: "Contact support at {supportEmail}" |
| `featureAnnouncements` | In-app banner: announce new features to users |
| `feedbackFormUrl` | Settings screen: "Send Feedback" button |

---

## User Stories

| ID | Story | SP |
|---|---|---|
| EP-09-US-01 | Module-aware dynamic navigation | 3 |
| EP-09-US-02 | FeatureGuard component + useFeatureFlag hook | 3 |
| EP-09-US-03 | Force update screen | 2 |
| EP-09-US-04 | Maintenance mode screen | 2 |
| EP-09-US-05 | Remote config consumption | 2 |
| EP-09-US-06 | Backend: app-config endpoint + Redis cache | 5 |
| EP-09-US-07 | Backend: MobileFeatureFlags table + service | 5 |
| EP-09-US-08 | Platform kill switch (CRM DB) | 3 |
| EP-09-US-09 | Percentage rollout via metadata field | 3 |

**Total:** 28 story points / 2 sprints

---

## Acceptance Criteria

- [ ] `GET /api/mobile/app-config` returns correct flags for a given school/role.
- [ ] Disabling `library` in Super Admin → library disappears in app within 30 min.
- [ ] `forceUpdateVersion: "99.0.0"` → app shows force update screen.
- [ ] `maintenanceMode: true` → maintenance screen shown.
- [ ] App starts correctly with no internet using AsyncStorage cached config.
- [ ] `LockedModuleCard` shown for disabled modules in More tab.
- [ ] Feature flag audit log records every change.
- [ ] Redis cache hit verified: second call < 50ms.

---

## Sprint Breakdown

| Sprint | Scope |
|---|---|
| Sprint 2 (backend) | MobileFeatureFlags table, app-config endpoint, Redis caching |
| Sprint 7 (mobile) | useFeatureFlag, FeatureGuard, dynamic nav, version screens, remote config |
