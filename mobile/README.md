# Vitana SMS — Mobile App

> React Native (Expo SDK 52) mobile app for Vitana SMS School ERP.  
> Supports Parent, Teacher, Student, and Admin role portals.

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | v22+ |
| pnpm | v11+ |
| Expo CLI | Latest |
| EAS CLI | v10+ (`npm install -g eas-cli`) |
| Xcode | 16+ (iOS simulator, macOS only) |
| Android Studio | Latest (Android emulator) |

---

## Quick Start

### 1. Install dependencies (from repo root)

```bash
cd /path/to/SMSRepoA
pnpm install
```

### 2. Build shared packages

```bash
pnpm --filter @vitana/shared-types build
pnpm --filter @vitana/shared-utils build
```

### 3. Create your local .env

```bash
cp mobile/.env.example mobile/.env
# Edit mobile/.env and set EXPO_PUBLIC_API_BASE_URL
```

### 4. Start the Expo dev server

```bash
pnpm --filter @vitana/mobile start
# or:
cd mobile && npx expo start
```

### 5. Run on a device / emulator

```bash
# Android emulator (API 30+)
pnpm --filter @vitana/mobile android

# iOS simulator (macOS, Xcode required)
pnpm --filter @vitana/mobile ios

# Physical device — scan QR in terminal with Expo Go app
```

---

## Environment Variables

All variables live in `mobile/.env` (gitignored). Copy from `mobile/.env.example`.

| Variable | Description | Example |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Backend API base URL | `https://api.vitanasms.com/api` |
| `EXPO_PUBLIC_ENV` | Environment name | `development` / `production` |
| `SCHOOL_ID` | White-label school ID (optional) | `dps-rohini` |
| `EAS_PROJECT_ID` | Expo Application Services project ID | from expo.dev |
| `EXPO_TOKEN` | EAS access token (CI only) | from expo.dev/accounts |

---

## Scripts

| Command | Description |
|---|---|
| `pnpm --filter @vitana/mobile start` | Start Metro bundler |
| `pnpm --filter @vitana/mobile android` | Open on Android emulator |
| `pnpm --filter @vitana/mobile ios` | Open on iOS simulator |
| `pnpm --filter @vitana/mobile lint` | ESLint check |
| `pnpm --filter @vitana/mobile typecheck` | TypeScript type check |
| `pnpm --filter @vitana/mobile test` | Run Jest unit tests |

---

## EAS Build Commands

Run from the `mobile/` directory:

```bash
# Development build (full Expo dev client)
eas build --profile development --platform all

# Preview APK for QA (no store, direct install)
eas build --profile preview --platform android

# Staging (AAB, internal testing track)
eas build --profile staging --platform all

# Production (both stores)
eas build --profile production --platform all

# White-label school app
SCHOOL_ID=dps-rohini eas build --profile school-production --platform all
```

---

## OTA Updates

```bash
# Push a JS-only OTA update (no store review needed)
eas update --channel production --message "fix: attendance bug"

# Rollback OTA
eas update --channel production --rollback-to-embedded
```

---

## Project Structure

```
mobile/
├── app/                    # Expo Router file-based routes
│   ├── _layout.tsx         # Root: QueryClient + SchoolTheme + auth guard
│   ├── (auth)/             # Login, school selection
│   ├── (parent)/           # Parent tab navigator + screens
│   ├── (teacher)/          # Teacher tab navigator + screens
│   ├── (student)/          # Student tab navigator + screens
│   └── (admin)/            # Admin tab navigator + screens
├── src/
│   ├── api/                # Axios client + TanStack Query setup + endpoint functions
│   ├── stores/             # Zustand stores (auth, school, academicYear)
│   ├── lib/                # SecureStore adapter, constants
│   └── theme/              # NativeWind + school branding theme
├── scripts/
│   └── school-configs.json # White-label school config registry
├── app.config.js           # Dynamic Expo config (reads SCHOOL_ID)
├── eas.json                # EAS build profiles
├── tailwind.config.js      # NativeWind theme
└── tsconfig.json           # TypeScript config
```

---

## White Label

To build a dedicated school app:

1. Add school entry to `scripts/school-configs.json`
2. Place school assets (icon, splash) in `assets/school-assets/{schoolId}/`
3. Build with:

```bash
SCHOOL_ID=your-school-id eas build --profile school-production --platform all
```

---

## Architecture

See [`docs/mobile_application_docs/06-mobile-architecture.md`](../docs/mobile_application_docs/06-mobile-architecture.md) for full architecture documentation.

---

## CI/CD Pipelines

All mobile builds run through GitHub Actions + EAS Build. No local Xcode or Android Studio is needed for CI.

| Trigger | Workflow | Result |
|---|---|---|
| PR touching `mobile/**` or `packages/**` | `mobile-eas-preview.yml` | Preview APK + IPA, links posted on PR |
| Push to `develop` (mobile paths) | `mobile-eas-staging.yml` | Staging AAB + iOS → internal testing tracks |
| Tag `mobile-v*.*.*` | `mobile-eas-production.yml` | Production build + store submit (requires approval) |
| `workflow_dispatch` | `mobile-school-build.yml` | Dedicated school app build |
| `workflow_dispatch` | `mobile-ota-update.yml` | JS-only OTA update to any channel (~5 min) |

### Releasing a New Version

```bash
# 1. Bump version in mobile/package.json
# 2. Push the release tag
git tag mobile-v1.2.0 && git push origin mobile-v1.2.0
# 3. Approve the workflow in GitHub Actions → "Mobile — Production Release"
```

### Emergency OTA Rollback

```bash
cd mobile

# Roll back production to embedded bundle
./scripts/ota-rollback.sh production

# Roll back to a specific previous update group
eas update:list --channel production --limit 5   # find the group ID
./scripts/ota-rollback.sh production <group-id>
```

---

## Deployment

See [`docs/DEPLOYMENT_CHECKLIST.md`](../docs/DEPLOYMENT_CHECKLIST.md) EP-11 section for the full list of required GitHub secrets, EAS one-time setup steps, and the `mobile-production` GitHub Environment configuration.
