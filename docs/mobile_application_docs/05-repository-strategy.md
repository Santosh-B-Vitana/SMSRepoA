# Vitana Mobile Platform — Repository Strategy

> **Classification:** Internal Architecture Document  
> **Version:** 1.0  
> **Date:** June 2026  
> **Related Docs:** [04-technology-recommendation](./04-technology-recommendation.md) · [06-mobile-architecture](./06-mobile-architecture.md) · [11-build-automation](./11-build-automation.md)

---

## 1. Decision

> **Monorepo — `mobile/` directory within the existing `SMSRepoA` repository.**

This document explains the decision and details the proposed monorepo structure.

---

## 2. Options Evaluated

### Option A — Separate Repository (`SMSMobileApp`)

A completely new repository: `github.com/vitana/SMSMobileApp`.

**Pros:**
- Separate CI pipelines.
- No cross-contamination of backend + mobile changes.
- Separate GitHub permissions per team.

**Cons:**
- Cannot share TypeScript types, schemas, or utility functions between web and mobile.
- Duplicate type definitions diverge over time — a common source of bugs.
- Cross-repository PRs (e.g., "add a new API field + update mobile consumer") require coordinating two separate PRs, reviews, and merges.
- No unified changelog or release tag.
- Mobile engineers lose context on backend changes.
- Backend engineers lose context on mobile impact of their changes.
- The `mobile/` entry point in the monorepo becomes a first-class citizen in the same repo review workflow.

**When Separate Repo is Better:** Very large orgs (100+ engineers), needing strict access separation, with dedicated platform teams managing the repo. Not applicable to Vitana at this stage.

---

### Option B — Monorepo (Chosen)

`SMSRepoA/mobile/` — mobile app as a pnpm workspace package inside the existing repo.

**Pros:**
- Shared TypeScript types between backend contracts, web components, and mobile hooks — zero duplication.
- Atomic commits: "Add `X-Academic-Year` header + update mobile to send it" in one PR.
- Unified lint, prettier, and CI configuration (pnpm workspace + Turborepo tasks).
- One repository to clone, one PR workflow, one `docs/` folder.
- The existing `ui/` workspace package (the web app) provides a structural precedent — `mobile/` follows the same pattern.
- Backend devs can grep across the whole codebase to see all consumers of an API.

**Cons:**
- Mobile CI jobs must be scoped to run only on `mobile/` changes (path filters on GitHub Actions).
- `node_modules` can grow large — mitigated by pnpm's content-addressable store.

---

## 3. Repository Structure

```
SMSRepoA/
├── .github/
│   └── workflows/
│       ├── backend.yml           # .NET build + test (triggered on non-mobile changes)
│       ├── web-ui.yml            # React web build + test
│       ├── mobile-ci.yml         # RN lint + test (triggered on mobile/ changes)
│       ├── mobile-eas-preview.yml # EAS preview build for PRs
│       ├── mobile-eas-staging.yml # EAS staging build on merge to main
│       └── mobile-eas-production.yml # Production build + submit
│
├── docs/
│   ├── FEATURES_AND_MODULES.md   # Existing
│   └── mobile_application_docs/  # THIS DOCUMENT SET
│
├── mobile/                       # NEW — React Native workspace
│   ├── app/                      # Expo Router file-based routes
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── _layout.tsx
│   │   ├── (parent)/
│   │   │   ├── _layout.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── attendance/
│   │   │   ├── fees/
│   │   │   └── ...
│   │   ├── (teacher)/
│   │   ├── (student)/
│   │   ├── (admin)/
│   │   └── _layout.tsx           # Root layout
│   │
│   ├── src/
│   │   ├── api/                  # API client, interceptors, endpoints
│   │   │   ├── client.ts         # Axios instance with refresh interceptor
│   │   │   ├── endpoints/        # Grouped by domain
│   │   │   └── types/            # API response types (shared with web)
│   │   │
│   │   ├── components/           # Shared UI components
│   │   │   ├── common/           # Buttons, cards, modals, skeletons
│   │   │   ├── attendance/       # Attendance-specific components
│   │   │   ├── fees/             # Fee-specific components
│   │   │   └── ...
│   │   │
│   │   ├── features/             # Feature-based slices
│   │   │   ├── auth/
│   │   │   ├── attendance/
│   │   │   ├── fees/
│   │   │   └── ...
│   │   │
│   │   ├── hooks/                # Custom hooks (useAttendance, useFees, etc.)
│   │   ├── stores/               # Zustand stores
│   │   │   ├── authStore.ts
│   │   │   ├── schoolStore.ts
│   │   │   └── offlineQueueStore.ts
│   │   │
│   │   ├── lib/                  # Utilities: formatters, validators, constants
│   │   ├── offline/              # Offline queue, SQLite schema, sync engine
│   │   ├── notifications/        # Push notification handlers
│   │   └── theme/                # Theme tokens, NativeWind config
│   │
│   ├── assets/                   # Static assets
│   │   ├── fonts/                # Inter, Poppins, Space Grotesk
│   │   ├── images/               # Vitana logo, placeholders
│   │   └── school-assets/        # Per-school icons + splashes (injected at build)
│   │       └── default/
│   │
│   ├── scripts/
│   │   ├── inject-school-config.js  # Build-time school config injection
│   │   └── generate-app-icons.js    # Icon generation from source logo
│   │
│   ├── app.config.js             # Dynamic Expo config (reads SCHOOL_ID env)
│   ├── eas.json                  # EAS build profiles
│   ├── tailwind.config.js        # NativeWind config
│   ├── metro.config.js           # Metro bundler config
│   ├── babel.config.js
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example
│
├── packages/                     # Shared workspace packages (NEW)
│   ├── shared-types/             # TypeScript interfaces shared by web + mobile
│   │   ├── src/
│   │   │   ├── api/              # API request/response types
│   │   │   ├── models/           # Domain model types
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── shared-utils/             # Shared utility functions
│       ├── src/
│       │   ├── formatters.ts     # Date, currency, grade formatters
│       │   ├── validators.ts     # Aadhaar, PAN, phone validators
│       │   └── constants.ts     # Role names, status codes
│       └── package.json
│
├── ui/                           # Existing React web app (unchanged)
├── Controllers/                  # Existing .NET controllers (unchanged)
├── Services/                     # Existing .NET services (unchanged)
└── pnpm-workspace.yaml           # Updated to include mobile/ and packages/*
```

---

## 4. Shared Packages Design

### 4.1 `@vitana/shared-types`

Contains TypeScript interfaces that describe the API contract. Both the web (`ui/`) and mobile (`mobile/`) apps import from here.

```typescript
// packages/shared-types/src/api/auth.ts
export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiration: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  schoolId: string;
  fullName: string;
  linkedEntityId: string;
}

export type UserRole = 
  | 'SuperAdmin' | 'Admin' | 'Principal' | 'Teacher'
  | 'Staff' | 'HRManager' | 'Accountant' | 'Librarian'
  | 'TransportManager' | 'HostelWarden' | 'Receptionist'
  | 'Parent' | 'Student';
```

```typescript
// packages/shared-types/src/api/attendance.ts
export interface StudentAttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // ISO 8601
  status: 'Present' | 'Absent' | 'Late' | 'HalfDay';
  markedBy: string;
  remarks?: string;
}
```

### 4.2 `@vitana/shared-utils`

```typescript
// packages/shared-utils/src/formatters.ts
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', currency: 'INR' 
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
}

export function maskAadhaar(aadhaar: string): string {
  return 'XXXX-XXXX-' + aadhaar.slice(-4);
}
```

---

## 5. pnpm Workspace Configuration

```yaml
# pnpm-workspace.yaml (updated)
packages:
  - 'ui'
  - 'mobile'
  - 'packages/*'
```

The mobile package's `package.json` lists workspace dependencies:

```json
{
  "name": "@vitana/mobile",
  "dependencies": {
    "@vitana/shared-types": "workspace:*",
    "@vitana/shared-utils": "workspace:*"
  }
}
```

---

## 6. CI Path Filtering

GitHub Actions workflows use path filters to avoid running mobile CI on backend-only changes:

```yaml
# .github/workflows/mobile-ci.yml
on:
  push:
    paths:
      - 'mobile/**'
      - 'packages/**'
  pull_request:
    paths:
      - 'mobile/**'
      - 'packages/**'
```

```yaml
# .github/workflows/backend.yml
on:
  push:
    paths-ignore:
      - 'mobile/**'
      - 'ui/**'
      - 'packages/**'
      - 'docs/**'
```

This ensures:
- A backend-only PR does not trigger EAS builds.
- A mobile-only PR does not trigger .NET builds.
- A full-stack PR triggers all relevant checks.

---

## 7. Branching Strategy

```
main                    ← production-ready; protected branch
├── develop             ← integration branch for mobile + web
│   ├── mobile/feat/EP-01-auth        ← feature branches
│   ├── mobile/feat/EP-02-parent-app
│   ├── mobile/fix/attendace-crash
│   └── mobile/chore/upgrade-expo-sdk
│
└── release/mobile/v1.0.0   ← release stabilization branch
```

**Branch naming convention:**
- `mobile/feat/<epic-id>-<short-description>`
- `mobile/fix/<issue-id>-<short-description>`
- `mobile/chore/<description>`
- `mobile/release/v<semver>`

**Tag convention:**
- `mobile-v1.0.0` — triggers production EAS build + store submit

---

## 8. Version Strategy

| Version Component | Meaning | Who Bumps |
|---|---|---|
| **Major** (1.x.x) | Breaking change or major redesign | Product owner + tech lead |
| **Minor** (x.1.x) | New feature, new module | Engineering lead on each sprint merge |
| **Patch** (x.x.1) | Bug fix, OTA update | Engineer on fix PR merge |

OTA updates (JS-only changes) increment the OTA version, not the store version:
```json
// eas.json
{
  "updates": {
    "runtimeVersion": {
      "policy": "sdkVersion"    ← SDK change = new store build required
    }
  }
}
```

---

## 9. Comparison Summary

| Factor | Separate Repo | Monorepo (Chosen) |
|---|---|---|
| Type sharing | ✗ Duplicated | ✅ Single source of truth |
| Atomic commits | ✗ Cross-repo PRs | ✅ One PR |
| CI complexity | Low (isolated) | Medium (path filters needed) |
| Team onboarding | Requires cloning another repo | ✅ Clone once |
| Code search | ✗ grep doesn't cross repos | ✅ Single search scope |
| Dependency management | Separate lock files | ✅ pnpm workspace hoisting |
| Release coordination | Manual cross-repo tag | ✅ Mono-tag strategy |

---

*Next: [06-mobile-architecture.md](./06-mobile-architecture.md)*
