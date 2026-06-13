# Vitana SMS Mobile App — Deployment Guide

> **Version:** 1.0 — June 2026  
> **Covers:** Local development, EAS staging, EAS production, white-label school apps, OTA updates

---

## Table of Contents

1. [Local Development](#1-local-development)
2. [Staging Deployment](#2-staging-deployment)
3. [Production Deployment](#3-production-deployment)
4. [White-Label School App Deployment](#4-white-label-school-app-deployment)
5. [OTA Update Deployment](#5-ota-update-deployment)
6. [Rollback Procedures](#6-rollback-procedures)
7. [Environment Configuration Reference](#7-environment-configuration-reference)
8. [First-Time Setup Checklist](#8-first-time-setup-checklist)

---

## 1. Local Development

### 1.1 One-time Setup

```bash
# Clone the repo
git clone https://github.com/vitana/SMSRepoA.git
cd SMSRepoA

# Install all workspace packages
pnpm install

# Build shared packages
pnpm --filter @vitana/shared-types build
pnpm --filter @vitana/shared-utils build

# Create mobile environment file
cp mobile/.env.example mobile/.env
# Edit mobile/.env and set EXPO_PUBLIC_API_BASE_URL to your local backend
```

### 1.2 Start the backend

```bash
# From repo root — start the .NET backend
dotnet run --project SmsApi.csproj
# Backend should be available at http://localhost:5092
```

### 1.3 Start Expo dev server

```bash
pnpm --filter @vitana/mobile start
```

### 1.4 Open on emulator/device

```bash
# Android emulator (press 'a' in Expo terminal, or):
pnpm --filter @vitana/mobile android

# iOS simulator (press 'i' in Expo terminal, or):
pnpm --filter @vitana/mobile ios

# Physical device: scan QR code with Expo Go app
```

### 1.5 Development Build (recommended for testing native features)

A development build replaces Expo Go and includes all native modules:

```bash
cd mobile
eas build --profile development --platform android  # or ios
# Install the resulting APK/IPA on your device
# Then start Metro: cd mobile && npx expo start --dev-client
```

---

## 2. Staging Deployment

### 2.1 Prerequisites

- EAS account + project configured (`cd mobile && eas init` if first time)
- `EXPO_TOKEN` set in GitHub repository secrets
- Staging backend deployed at `https://api-staging.vitanasms.com`

### 2.2 Automated (via GitHub Actions)

Push to the `develop` branch with changes in `mobile/` or `packages/`:

```bash
git push origin develop
```

The `mobile-eas-staging.yml` workflow will:
1. Install dependencies
2. Build AAB (Android) + IPA (iOS) with `staging` profile
3. Auto-submit to internal testing tracks

### 2.3 Manual

```bash
cd mobile
eas build --profile staging --platform all --non-interactive
```

---

## 3. Production Deployment

### 3.1 Prerequisites

- All staging tests passed
- Version bumped in `mobile/package.json`
- `EXPO_TOKEN`, `ASC_APP_ID`, `APPLE_TEAM_ID` set in GitHub secrets
- Google Play service account JSON uploaded to EAS

### 3.2 Create a release tag

```bash
# Bump version in mobile/package.json first, then:
git tag mobile-v1.0.0
git push origin mobile-v1.0.0
```

The `mobile-eas-production.yml` workflow will:
1. Build production AAB + IPA
2. Submit to Google Play internal track and TestFlight
3. Notify the `mobile-builds` Slack channel

### 3.3 Manual production build

```bash
cd mobile
APP_VERSION=1.0.0 eas build --profile production --platform all --non-interactive
eas submit --platform all --latest --non-interactive
```

### 3.4 Promote in stores

After initial internal testing:
- **Google Play Console:** Promote from Internal → Production (staged rollout: 10% → 25% → 50% → 100%)
- **App Store Connect:** Submit for review → Release (or use phased release)

---

## 4. White-Label School App Deployment

### 4.1 Prerequisites

- School entry in `mobile/scripts/school-configs.json`
- School assets placed in `mobile/assets/school-assets/{schoolId}/`:
  - `app-icon-1024.png` (1024×1024 PNG)
  - `adaptive-icon.png` (Android adaptive icon foreground)
  - `splash-screen.png` (2048×2048 PNG)
- Separate EAS project created for the school

### 4.2 Add school to config registry

Edit `mobile/scripts/school-configs.json`:

```json
{
  "your-school-id": {
    "schoolId": "your-school-id",
    "appName": "School Name Connect",
    "slug": "school-name-connect",
    "androidPackage": "com.yourschool.sms",
    "iosBundleId": "com.yourschool.sms",
    "apiDomain": "https://api.vitanasms.com/api",
    "schoolDomain": "yourschool.vitanasms.com",
    "colors": {
      "primary": "#003366",
      "accent": "#ffd700"
    },
    "easProjectId": "eas-project-id-for-this-school"
  }
}
```

### 4.3 Build via GitHub Actions (recommended)

```
GitHub → Actions → "Build Dedicated School App"
  school_id: your-school-id
  platform: all
```

### 4.4 Manual build

```bash
cd mobile
SCHOOL_ID=your-school-id eas build --profile school-production --platform all
```

---

## 5. OTA Update Deployment

Use OTA updates for JS-only fixes (no native code changes). Takes effect within minutes for all active users.

### 5.1 Via GitHub Actions

```
GitHub → Actions → "Mobile OTA Update"
  channel: production          (or staging, or school-dps-rohini-production)
  message: "fix: attendance display bug"
```

### 5.2 Manual

```bash
cd mobile
eas update --channel production --message "fix: fee calculation rounding"
```

### 5.3 OTA Limitations

OTA updates **cannot** change:
- Native module code
- App icons or splash screens
- `app.config.js` settings
- Expo SDK version

If any of the above change, a full store build is required.

---

## 6. Rollback Procedures

### 6.1 OTA Rollback (< 5 minutes)

```bash
# Roll back to the embedded JS bundle (last full store build)
cd mobile
eas update --channel production --rollback-to-embedded

# Or republish a specific previous update group
eas update:republish --channel production --group <previous-group-id>
```

### 6.2 Store Rollback

**Google Play:** Use "Halt rollout" in Play Console → Internal Testing to stop a staged rollout immediately. Then re-submit the previous APK/AAB.

**App Store:** Apple does not support live rollbacks. Submit a new patch version (1.0.1) with the fix. Request expedited review if critical.

**Prevention:** Always use staged rollout on Play Store (10% → 25% → 50% → 100%) with 24-hour monitoring between stages.

---

## 7. Environment Configuration Reference

### 7.1 mobile/.env (local development)

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:5092/api
EXPO_PUBLIC_ENV=development
# Optional: web portal URL for "Forgot Password" link
# EXPO_PUBLIC_WEB_BASE_URL=http://localhost:3000
```

### 7.2 EAS build profile environments

| Profile | API URL | Purpose |
|---|---|---|
| `development` | `http://localhost:5092/api` | Local dev with dev client |
| `preview` | `https://api-staging.vitanasms.com/api` | QA APK, no store |
| `staging` | `https://api-staging.vitanasms.com/api` | Internal testing tracks |
| `production` | `https://api.vitanasms.com/api` | Live store builds |
| `school-production` | `https://api.vitanasms.com/api` | White-label school builds |

### 7.3 GitHub Secrets Required

| Secret | Used By | Description |
|---|---|---|
| `EXPO_TOKEN` | All EAS workflows | Personal access token from expo.dev/accounts |
| `SLACK_BOT_TOKEN` | Staging + production | Slack bot for build notifications |
| `AWS_ACCESS_KEY_ID` | School build | S3 access for school assets |
| `AWS_SECRET_ACCESS_KEY` | School build | S3 secret |
| `ASC_APP_ID` | Production submit | App Store Connect app ID |
| `APPLE_TEAM_ID` | Production submit | Apple Developer Team ID |

---

## 8. First-Time Setup Checklist

```
[ ] Node.js v22 installed (nvm install 22)
[ ] pnpm v11 installed (npm install -g pnpm@latest)
[ ] EAS CLI installed (npm install -g eas-cli)
[ ] Expo account created at expo.dev
[ ] Logged into EAS (eas login)
[ ] EAS project initialized (cd mobile && eas init)
[ ] mobile/scripts/school-configs.json updated with real EAS project IDs
[ ] mobile/.env created from mobile/.env.example
[ ] Android Studio installed with API 30+ emulator configured (for Android testing)
[ ] Xcode 16+ installed with iOS 17+ simulator configured (for iOS testing)
[ ] Apple Developer account enrolled ($99/year) — for iOS builds
[ ] Google Play Developer account created ($25 one-time) — for Android Play Store
[ ] EAS credentials configured (eas credentials)
[ ] GitHub repository secrets populated (EXPO_TOKEN, etc.)
[ ] pnpm install from repo root completes with exit code 0
[ ] pnpm --filter @vitana/shared-types build passes
[ ] pnpm --filter @vitana/shared-utils test passes (34 tests)
[ ] pnpm --filter @vitana/mobile typecheck passes (0 errors)
```

---

## 9. Phase 2 — Authentication & Authorization (PROMPT-02)

> EP-01 · Sprint 2 (Weeks 3–4). No migrations. Frontend-only changes.

### 9.1 New Files in This Phase

| File | Purpose |
|---|---|
| `mobile/app/(auth)/index.tsx` | School domain entry screen (rewritten) |
| `mobile/app/(auth)/login.tsx` | Full login form with branding, biometrics, error handling (rewritten) |
| `mobile/app/(auth)/2fa.tsx` | TOTP 6-digit code entry (new) |
| `mobile/app/(auth)/_layout.tsx` | Now registers `2fa` screen (updated) |
| `mobile/src/api/endpoints/auth.ts` | Full API contract including `getPublicBranding`, `changePassword` (rewritten) |
| `mobile/src/stores/schoolStore.ts` | Added `setBranding` action for public branding API (updated) |
| `mobile/src/features/auth/hooks/useLogout.ts` | Clears SecureStore, Zustand, QueryClient then navigates to login (new) |
| `mobile/src/features/auth/screens/ChangePasswordScreen.tsx` | react-hook-form + zod change password form (new) |
| `mobile/src/features/auth/__tests__/useLogout.test.ts` | 5 unit tests for logout hook (new) |
| `mobile/maestro/tests/login_parent.yaml` | E2E: parent login flow (new) |
| `mobile/maestro/tests/logout.yaml` | E2E: logout flow (new) |
| `mobile/.eslintrc.js` | ESLint config (new — was missing) |

### 9.2 Packages Added

```bash
# Production
@hookform/resolvers  ^3.10.0   # Zod adapter for react-hook-form
expo-constants       ^56.0.17  # app.config.js extra values at runtime

# Dev
@testing-library/react-native  ^14.0.0  # Testing utilities
```

Install: `pnpm install` from workspace root.

### 9.3 Local Development

```bash
# Prerequisites
nvm use 22   # Node.js 23+ breaks expo-image config plugin

# Install deps
pnpm install

# Quality gates (must all pass before building)
pnpm --filter @vitana/mobile typecheck    # TypeScript — 0 errors
pnpm --filter @vitana/mobile lint         # ESLint — 0 warnings
pnpm --filter @vitana/mobile test         # Jest — 5/5 pass

# Start Metro (requires Node.js ≤ 22)
cd mobile && pnpm start
```

### 9.4 Staging Deployment

```bash
# Build staging AAB + IPA via EAS
cd mobile
eas build --profile staging --platform android
eas build --profile staging --platform ios

# Install on test device via EAS internal distribution
eas update --branch staging --message "EP-01 Phase 2: auth screens"
```

**Validate on device:**
1. Open shared app → enter `demo.vitanasms.com` → tap Continue
2. Confirm school name/logo loads on login screen
3. Login with `demo.parent@demo.vitanasms.com` / `Demo@12345` → reaches Parent Dashboard
4. Login with wrong password → inline error (no Alert dialog)
5. Logout → login screen shown; reopen app → login screen again (tokens cleared)
6. On biometric-enrolled device: login → "Enable Face ID?" alert → accept → reopen → biometric prompt

**Maestro E2E (optional but recommended):**
```bash
maestro test maestro/tests/login_parent.yaml
maestro test maestro/tests/logout.yaml
```

### 9.5 Production Deployment

After staging sign-off:

```bash
cd mobile
eas build --profile production --platform all
# After build completes:
eas submit --platform android  # submits to Play Store internal track
eas submit --platform ios      # submits to TestFlight
```

Promote from internal → production via Play Console and App Store Connect dashboards.

### 9.6 OTA Update (Patch Flow)

For post-launch bug fixes that don't require a native rebuild:

```bash
cd mobile
eas update --branch production --message "fix(auth): <description>"
```

OTA updates are limited to JavaScript changes. A new native build is required if native modules change.

### 9.7 White-Label School Builds

White-label apps skip the school domain entry screen (domain is baked in). Build as:

```bash
SCHOOL_ID=dps-rohini eas build --profile school-production --platform all
```

The `schoolDomain` in `school-configs.json` is set in `app.config.js` `extra.schoolDomain`, which `(auth)/index.tsx` reads via `expo-constants` to auto-redirect to the login screen.

---

## Section 10 — Parent App (EP-03) Deployment Procedure

### 10.1 Pre-Deployment Validation

```bash
# From workspace root
pnpm install                               # install new packages
pnpm --filter @vitana/mobile typecheck     # must exit 0
pnpm --filter @vitana/mobile lint          # must exit 0 (max-warnings 0)
pnpm --filter @vitana/mobile test          # all tests must pass
```

Confirm all 17 parent screens exist:
```bash
ls mobile/app/\(parent\)/
# Expected directories: attendance/ fees/ results/ announcements/ diary/ leaves/ notifications/
# Expected files: index.tsx more.tsx _layout.tsx
```

### 10.2 Backend API Verification (before building)

Run these against the staging API (replace `BASE` with your staging URL):

```bash
BASE=https://api-staging.vitanaschools.in/api
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"parent@demo.com","password":"Demo@12345","schoolDomain":"demo.vitanasms.com"}' \
  | jq -r '.token')

# Dashboard — critical path
curl -s "$BASE/mobile/parent-dashboard" -H "Authorization: Bearer $TOKEN" | jq .children[0].studentName

# Fee records
curl -s "$BASE/fees/records?studentId=<student-id>" -H "Authorization: Bearer $TOKEN" | jq .pendingAmount

# Announcements (corrected route)
curl -s "$BASE/announcements/for-parent?page=1&pageSize=5" -H "Authorization: Bearer $TOKEN" | jq .totalCount

# Notifications (corrected route)
curl -s "$BASE/notifications/my?page=1&pageSize=5" -H "Authorization: Bearer $TOKEN" | jq .totalCount
```

All should return HTTP 200. A non-200 on any endpoint means the backend route needs verification before the app can be tested.

### 10.3 Cashfree Sandbox Setup

1. Create a Cashfree test account at [cashfree.com/merchants](https://merchant.cashfree.com).
2. Navigate to Developer → API Keys → Test Mode → copy `App Id` and `Secret Key`.
3. In Admin UI → Settings → Payment Gateway, enter these sandbox credentials.
4. Enable `enableCashfreePayments = true` in `MobileFeatureFlags` for the test school.
5. Test payment: open the app → Fees → Pay Online → use card `4111 1111 1111 1111` (any CVV, any future expiry).

### 10.4 Build Steps

```bash
cd mobile

# Staging build (for QA testing on physical devices)
eas build --profile staging --platform all

# After staging sign-off — production build
eas build --profile production --platform all
```

### 10.5 Post-Deployment Smoke Tests

Run each user journey after deploying to a physical device:

| Test | Steps | Expected |
|---|---|---|
| Dashboard loads | Login as parent → wait 2s | Dashboard renders with child name, fee balance, today's attendance |
| Child switcher | Tap alternate child avatar | All cards update to show selected child's data |
| Attendance calendar | Dashboard → attendance card | Calendar grid renders with color-coded days for current month |
| Attendance month nav | Tap ← to go to previous month | Previous month loads, future days greyed out |
| Fee summary | Tap Fees tab | Outstanding balance shown, fee head breakdown visible |
| Pay Online | Tap Pay Online | Cashfree hosted checkout opens in browser |
| Payment success | Complete ₹1 test payment | Success screen shown, fee balance refreshes |
| Receipt | Fees → Payment History → first record | PDF opens in system browser |
| Exam results | Dashboard → latest result | Exam list with subject rows and grade badges |
| Announcements | More → Announcements → scroll | Infinite scroll loads next page smoothly |
| Leave apply (online) | More → Leaves → Apply | Form submits, confirmation shown |
| Leave apply (offline) | Turn off WiFi → submit leave form | "Saved Offline" alert shown, item in AsyncStorage queue |
| Notifications | Dashboard bell icon | Notification center opens, unread count shown |
| Mark all read | More → Notifications → "Mark all read" | All items switch to read state, bell badge clears |
| Empty states | View any screen with no data | Helpful empty state message shown, no blank screen |
| Loading skeletons | Slow network → open any screen | Pulsing skeleton shown before data arrives |

### 10.6 Monitoring Checks After Deployment

- Check crash-free rate in Expo Dashboard → Monitoring.
- Confirm no unhandled promise rejections in logs.
- Verify Cashfree payment webhook reaches the backend (if webhook is configured).
- Monitor API response times: `parent-dashboard` should respond < 500ms (uses parallel queries).

### 10.7 Rollback Procedure

Phase 3 is purely JavaScript — no native code changes, no DB migrations.

**OTA rollback (fastest):**
```bash
cd mobile
eas update --branch production --message "rollback: revert parent app phase 3"
# This publishes the previous JS bundle; devices download on next launch.
```

**Full build rollback:**
1. In EAS dashboard → Production channel → select the prior build.
2. Click "Re-publish" to push the prior JS bundle as an OTA update.

No backend changes are needed for rollback. API endpoints are unchanged.

---

## Section 11 — EP-05: Student App + PROMPT-05: Push Notifications

> EP-05 · Sprints 9–10 (Weeks 17–20). No new DB migrations. Uses `AddMobileEntities` already applied.

### 11.1 Pre-Deployment Validation

```bash
# From workspace root
pnpm install                               # install dependencies
pnpm --filter @vitana/mobile typecheck     # must exit 0
pnpm --filter @vitana/mobile lint          # must exit 0 (max-warnings 0)
pnpm --filter @vitana/mobile test          # all 20+ tests must pass
```

Confirm all 19 student screens exist:
```bash
ls mobile/app/\(student\)/
# Expected: index.tsx more.tsx _layout.tsx timetable/ results/ assignments/ attendance/ fees/ leaves/ library/ announcements/ notifications/ profile/
```

### 11.2 Firebase Setup (PROMPT-05 prerequisite)

> **These steps must be completed by DevOps before the first push notification can be sent.**

**Step 1 — Create Firebase project**
```
1. Go to https://console.firebase.google.com
2. Create project: vitana-sms-mobile
3. Enable Firebase Cloud Messaging (FCM) in Project Settings
```

**Step 2 — Configure Android app**
```
1. Add Android app with package name: com.vitana.sms
2. Download google-services.json
3. Place at: mobile/google-services.json
4. Ensure mobile/.gitignore includes: google-services.json
```

**Step 3 — Configure iOS app**
```
1. Add iOS app with bundle ID: com.vitana.sms
2. Download GoogleService-Info.plist
3. Place at: mobile/GoogleService-Info.plist
4. Ensure mobile/.gitignore includes: GoogleService-Info.plist
5. Upload APNs Auth Key (.p8) to Firebase:
   Firebase Console → Project Settings → Cloud Messaging → iOS app → APNs Auth Key
```

**Step 4 — Configure backend**
```bash
# Download service account JSON
# Firebase Console → Project Settings → Service Accounts → Generate new private key

# Store in AWS Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id vitana/firebase/service-account-json \
  --secret-string "$(cat firebase-service-account.json)"

# Set backend env vars:
Firebase__ServiceAccountJson=<JSON content from Secrets Manager>
Firebase__ProjectId=vitana-sms-mobile
```

### 11.3 Backend API Verification (before building)

Run against staging API with a Student role token:

```bash
BASE=https://api-staging.vitanaschools.in/api
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@demo.com","password":"Demo@12345","schoolDomain":"demo.vitanasms.com"}' \
  | jq -r '.token')

# Critical path — student dashboard
curl -s "$BASE/mobile/student-dashboard" -H "Authorization: Bearer $TOKEN" \
  | jq '{todayScheduleCount: (.todaySchedule | length), unreadCount}'

# Own profile
curl -s "$BASE/students/me" -H "Authorization: Bearer $TOKEN" | jq '{name, rollNumber, className}'

# Attendance (current month)
MONTH=$(date +%-m) YEAR=$(date +%Y)
curl -s "$BASE/attendance/my-attendance?month=$MONTH&year=$YEAR" \
  -H "Authorization: Bearer $TOKEN" | jq .attendancePercent

# Assignments
curl -s "$BASE/assignments?studentId=me&pageSize=5" -H "Authorization: Bearer $TOKEN" | jq .totalCount

# Fee records
curl -s "$BASE/fees/records?studentId=me" -H "Authorization: Bearer $TOKEN" | jq .pendingAmount

# Push device registration
curl -X POST "$BASE/notifications/register-device" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nativeToken":"test-token","platform":"android","deviceId":"test-dev-1","appVersion":"1.0.0"}'
# Expected: 200 { isNew: true }
```

All should return HTTP 200. Non-200 responses indicate missing backend routes.

### 11.4 Build Steps

```bash
cd mobile

# Development build (required for push notifications — NOT Expo Go)
eas build --profile development --platform all

# Staging build for QA
eas build --profile staging --platform all

# After staging sign-off — production build
eas build --profile production --platform all
```

### 11.5 Post-Deployment Smoke Tests

| Test | Steps | Expected |
|---|---|---|
| Student dashboard loads | Login as student | Dashboard shows today's schedule, attendance %, pending assignments |
| Timetable renders | Dashboard → Schedule tab | Period cards with subject and teacher names |
| Timetable current period | Open at class time | Current period has left-border highlight + "Now" badge |
| Weekly navigation | Schedule tab → tap Mon/Tue/Wed | Correct periods for each day |
| Results list | Results tab | Exam list with grade badges |
| Subject breakdown | Tap result | All subjects with marks and pass/fail |
| Report card PDF | Results → Report Cards | Browser opens PDF |
| Assignments filter tabs | Assignments tab → Pending/Submitted/Graded | Filters correctly |
| Assignment detail | Tap assignment | Shows description, due date, status |
| Text submission (online) | Submit Assignment → write text → Submit | Success alert, status changes to Submitted |
| Text submission (offline) | Disable WiFi → submit text | "Saved Offline" alert, AsyncStorage queued |
| File upload tab | Assignments → [id] → Submit → Upload File | "File upload coming soon" message shown |
| Attendance calendar | More → Attendance | Color-coded calendar with P/A/L days |
| Attendance month nav | Tap ← to go to previous month | Previous month loads, future disabled |
| Shortage alert | Attendance below 75% | Red banner shown |
| Fee summary | More → Fee Summary | Outstanding balance + breakdown |
| Leave apply (online) | More → Leave → Apply | Form submits, success alert |
| Leave apply (offline) | Disable WiFi → submit form | "Saved Offline", AsyncStorage has entry |
| Leave history | More → Leave Applications | Status badges (Pending/Approved/Rejected) |
| Library issues | More → Library | Book list with issued/due dates |
| Overdue book | Library with overdue book | Red "Overdue" badge + fine if any |
| Announcements | More → Announcements | Infinite scroll loads smoothly |
| Notifications | Bell icon or More → Notifications | Notification list with unread dots |
| Mark all read | Notifications → "Mark all read" | All items read, bell badge clears |
| Notification preferences | Notifications → gear icon → Settings | Switch toggles load; toggling persists on restart |
| Teacher notifications | Teacher dashboard → bell → Notifications | List renders with teacher-type icons |
| Admin notifications | Admin dashboard → Notifications | Billing/announcement types shown correctly |
| Push registration | Login on physical device | MobileDeviceTokens row in DB |
| Push delivery | Backend event → wait 5s | Push notification appears on device |
| Push deep link | Tap push for assignment | Opens correct student assignment screen |
| Killed-app tap | Force-quit → tap push | App opens → navigates to correct screen |
| Permission rationale | First login on fresh install | Bottom-sheet shown, "Allow" → system dialog |
| Permission denied | Tap "Not Now" | No system dialog; no future prompts |
| Profile | More → My Profile | Name, roll number, class, admission no. |
| Sign out | More → Sign Out | Navigates to login, tokens cleared |
| Loading skeletons | Slow network → open any screen | Pulsing skeleton before data arrives |
| Empty states | Screen with no data | Helpful icon + text, no blank screen |

### 11.6 Monitoring Checks After Deployment

- Check crash-free rate in Expo Dashboard → Monitoring.
- Confirm no unhandled promise rejections in console logs.
- Verify `MobileDeviceTokens` table grows as students log in.
- Monitor student dashboard response time: should be < 500ms (parallel queries).
- Check Firebase Console → Messaging → Delivery for FCM delivery rates.
- Alert if FCM delivery rate drops below 90%.

### 11.7 Rollback Procedure

EP-05 and PROMPT-05 are frontend/mobile changes only — no migrations.

**OTA rollback (fastest — no store review required):**
```bash
cd mobile
eas update --branch production --message "rollback: revert student app ep-05 + push"
# Devices download on next app launch
```

**Full build rollback:**
1. EAS dashboard → Production channel → select prior build → Re-publish

**Push notification disable (emergency):**
```bash
# Remove Firebase env var from backend to silently disable push
unset Firebase__ServiceAccountJson
# Restart backend — push skips gracefully, all other features unaffected
```

---

## 12. Feature Flag Platform Deployment (EP-09 / PROMPT-10)

### 12.1 Pre-Deployment Checklist

- [ ] Migration `20260610221349_AddMobileEntities` applied to target environment
- [ ] `MobileAppConfigurations` seed row exists for each school
- [ ] `MobileFeatureFlags` default rows seeded for each school
- [ ] Redis is available and `REDIS__CONNECTIONSTRING` is configured
- [ ] `EXPO_PUBLIC_API_BASE_URL` is set in `mobile/.env` pointing to correct environment

### 12.2 Backend Migration

```bash
cd /path/to/SMSRepoA
dotnet ef database update --migration 20260610221349_AddMobileEntities
```

Verify:
```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME IN ('MobileFeatureFlags', 'MobileAppConfigurations', 'MobileDeviceTokens', 'UserNotificationPreferences', 'NotificationDeliveryLogs');
-- Must return 5 rows
```

### 12.3 Seed Data

Run the following per school (replace `<SchoolId>` with actual GUID):

```sql
-- App configuration
INSERT INTO MobileAppConfigurations
  (Id, SchoolId, MinVersion, RecommendedVersion, ForceUpdateVersion, MaintenanceMode, IsActive, CreatedAt, UpdatedAt)
VALUES
  (NEWID(), '<SchoolId>', '1.0.0', '1.0.0', NULL, 0, 1, GETUTCDATE(), GETUTCDATE());

-- Default mobile feature flags
INSERT INTO MobileFeatureFlags (Id, SchoolId, FlagKey, IsEnabled, Notes, CreatedAt)
VALUES
  (NEWID(), '<SchoolId>', 'mobile.attendance.offline',         1, 'Default on',  GETUTCDATE()),
  (NEWID(), '<SchoolId>', 'mobile.attendance.biometric',       0, 'Default off', GETUTCDATE()),
  (NEWID(), '<SchoolId>', 'mobile.fees.online_payment',        1, 'Default on',  GETUTCDATE()),
  (NEWID(), '<SchoolId>', 'mobile.fees.wallet',                0, 'Default off', GETUTCDATE()),
  (NEWID(), '<SchoolId>', 'mobile.parent.multi_child',         1, 'Default on',  GETUTCDATE()),
  (NEWID(), '<SchoolId>', 'mobile.exams.online_exam_portal',   0, 'Default off', GETUTCDATE()),
  (NEWID(), '<SchoolId>', 'mobile.communication.whatsapp_trigger', 0, 'Default off', GETUTCDATE());
```

### 12.4 Mobile Build

No new native dependencies were added in this feature. An OTA update is sufficient:

```bash
cd mobile
pnpm typecheck        # must pass with 0 errors
pnpm lint             # must pass with 0 warnings
pnpm test             # useFeatureFlag tests must pass
eas update --branch production --message "feat: feature flag platform EP-09"
```

### 12.5 Post-Deployment Verification

```bash
# 1. Verify app config endpoint
curl -H "Authorization: Bearer <token>" \
     -H "X-Academic-Year: 2025-2026" \
     https://api.yourdomain.com/api/mobile/app-config

# Expected: JSON with modules, mobileFeatures, versionRequirements, branding

# 2. Verify Redis cache (second call should be < 50ms)
# 3. Open mobile app → More tab → confirm items render from flags
# 4. Test force-update: temporarily set ForceUpdateVersion="99.0.0" for a test school
# 5. Test maintenance: temporarily set MaintenanceMode=1 for a test school
# 6. Restore both after testing
```

### 12.6 Smoke Tests

| Check | Expected Result |
|---|---|
| `GET /api/mobile/app-config` → 200 | Modules dict + mobileFeatures dict + versionRequirements present |
| `GET /api/mobile/app-config` second call | Response time < 50ms (Redis hit) |
| `library: false` in DB | LockedModuleCard shown in More tab |
| `library: true` in DB | Library item appears in More tab |
| `maintenanceMode: true` | Maintenance screen shown, all navigation blocked |
| `forceUpdateVersion: "99.0.0"` | Force update screen shown, no back gesture |
| App offline on cold start | Uses AsyncStorage cache, no crash |

### 12.7 Rollback Procedure

**Feature flag rollback (no rebuild needed):**
```sql
-- Disable a specific flag for a school
UPDATE MobileFeatureFlags SET IsEnabled = 0 WHERE SchoolId = '<SchoolId>' AND FlagKey = '<key>';
-- Then invalidate Redis (or wait 5 minutes for TTL expiry)
```

**Maintenance mode emergency exit:**
```sql
UPDATE MobileAppConfigurations SET MaintenanceMode = 0, UpdatedAt = GETUTCDATE()
WHERE SchoolId = '<SchoolId>';
-- Flush Redis immediately:
-- redis-cli DEL "mobile:app-config:<SchoolId>:*"
```

**OTA rollback (if mobile build has a bug):**
```bash
cd mobile
eas update --branch production --message "rollback: revert feature flag platform"
```

**Full migration rollback (last resort):**
```bash
dotnet ef database update --migration <PreviousMigrationName>
# WARNING: This drops MobileFeatureFlags, MobileAppConfigurations, and all other mobile tables.
# Ensure backup before running.
```

---

## Phase 5 — EP-06: Push Notifications (Firebase FCM + APNs)

### 5.1 Pre-Deployment Validation

Before deploying this phase, confirm:

- [ ] Firebase project exists and Android + iOS apps are registered.
- [ ] `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) have been downloaded from the Firebase console.
- [ ] APNs Auth Key (`.p8`) has been uploaded to Firebase → Project Settings → Cloud Messaging.
- [ ] Service account private key JSON has been obtained from Firebase → Project Settings → Service Accounts → Generate new private key.
- [ ] Migration `20260610221349_AddMobileEntities` is included in the pending migration list (`dotnet ef migrations list`).

### 5.2 Environment Setup

**Backend (`appsettings.Production.json` or environment variables):**

```json
{
  "Firebase": {
    "ServiceAccountJson": "<paste full service account JSON here as escaped string>"
  }
}
```

> Prefer `ServiceAccountJson` (inline) over `ServiceAccountPath` in containerised/cloud deployments. The value is the entire content of the `*.json` private key file downloaded from Firebase.

**Mobile (`mobile/.env`):**

```bash
# Uncomment and set the following:
EXPO_PUBLIC_FCM_SENDER_ID=<your-fcm-sender-id>
# FCM Sender ID is visible in Firebase console → Project Settings → Cloud Messaging
```

**EAS Build secrets (set once per project):**

```bash
# Run from the mobile/ directory
eas secret:create --name GOOGLE_SERVICES_JSON \
  --value "$(cat /path/to/google-services.json)" \
  --scope project

eas secret:create --name GOOGLE_SERVICES_PLIST \
  --value "$(cat /path/to/GoogleService-Info.plist)" \
  --scope project
```

For white-label schools, set school-specific secrets using `--scope project` on each school's EAS project, or pass the file path via `GOOGLE_SERVICES_JSON` / `GOOGLE_SERVICES_PLIST` CI env vars when using the `mobile-eas-production.yml` workflow.

### 5.3 Infrastructure Requirements

| Component | Requirement | Notes |
|---|---|---|
| Firebase project | 1 per school environment (shared across roles) | Free Spark plan is sufficient for < 1M notifications/month; upgrade to Blaze for higher volume |
| APNs Auth Key | 1 `.p8` key per Apple Developer team | Valid for all iOS apps under the same team; doesn't expire |
| SQL Server | `MobileDeviceTokens`, `NotificationDeliveryLogs`, `UserNotificationPreferences` tables | Created by migration — no manual DDL needed |
| Hangfire | Already configured; `mobile-token-cleanup` job auto-registered on startup | Verify in `/hangfire` dashboard after deploy |

### 5.4 Migration Execution

```bash
# From the repo root
dotnet ef database update --project SmsApi.csproj --context AppDbContext

# Verify
dotnet ef migrations list --project SmsApi.csproj --context AppDbContext
# Should show 20260610221349_AddMobileEntities as [applied]
```

In production (auto-migrate on startup is disabled by default):

```bash
dotnet SmsApi.dll migrate
# Or if using the startup auto-migrate path (Development only):
# Set ASPNETCORE_ENVIRONMENT=Development temporarily, start app, then revert.
```

### 5.5 Build Steps

**Backend:**
```bash
dotnet build SmsApi.csproj -c Release
# Verify: no build errors; FirebaseAdmin 3.1.0 listed in build output
```

**Mobile (EAS):**
```bash
cd mobile
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production

# Verify: build logs show "expo-notifications" plugin applied and
# "google-services.json found at ..." without errors
```

### 5.6 Deployment Steps

1. Deploy backend to production environment with `Firebase:ServiceAccountJson` set.
2. Confirm startup log contains:
   ```
   Firebase initialized successfully (project: <your-project-id>)
   ```
   Not:
   ```
   Firebase:ServiceAccountJson not configured — push notifications disabled
   ```
3. Apply the database migration (`dotnet ef database update` or startup migration).
4. Submit EAS builds to the app stores (or install via internal distribution for testing).
5. Distribute the new build to testers.

### 5.7 Post-Deployment Verification

**Device registration:**

```bash
# Log in on the mobile app, then query:
SELECT UserId, Platform, DeviceId, IsActive, LastActiveAt
FROM MobileDeviceTokens
ORDER BY RegisteredAt DESC;
# Expect: row with IsActive=1 and a non-null NativeToken
```

**Push delivery end-to-end test:**

```bash
# Trigger a fee_due notification for a test user from the admin panel,
# OR insert directly:
INSERT INTO Notifications (Id, UserId, SchoolId, Title, Message, NotificationType, Priority, ...)
VALUES (NEWID(), '<test-user-id>', '<school-id>', 'Test Push', 'EP-06 smoke test', 'fee_due', 'High', ...)

# Check delivery log:
SELECT DeliveryStatus, FcmMessageId, ErrorMessage, AttemptedAt
FROM NotificationDeliveryLogs
WHERE UserId = '<test-user-id>'
ORDER BY AttemptedAt DESC;
# Expect: Status='Sent', non-null FcmMessageId, null ErrorMessage
```

### 5.8 Smoke Tests

- [ ] App receives push notification on Android physical device within 5 seconds of DB insert.
- [ ] App receives push notification on iOS physical device within 5 seconds of DB insert.
- [ ] Tapping `attendance_absent` notification opens `/(parent)/attendance/<studentId>` screen.
- [ ] Tapping notification when app is killed — app opens and navigates to correct screen.
- [ ] Foreground notification shows in-app banner (does not navigate automatically).
- [ ] `/(parent)/notifications` shows all notifications with unread blue dot.
- [ ] "Mark All Read" clears the unread count badge.
- [ ] Notification preference toggle for `fee_due` persists after app restart.
- [ ] `EXPO_PUBLIC_FCM_SENDER_ID` commented out → registration fails gracefully (error logged, no crash).

### 5.9 Monitoring Checks

After deployment, verify the following in Sentry / OpenTelemetry:

| Check | Expected | Alert if |
|---|---|---|
| Push delivery rate | > 95% | < 90% (check `NotificationDeliveryLogs.DeliveryStatus`) |
| Invalid token rate | < 5% | > 10% (run `mobile-token-cleanup` manually) |
| Firebase init errors on startup | 0 | Any → check `Firebase:ServiceAccountJson` config |
| `mobile-token-cleanup` last run | Within last 7 days | Never ran → check Hangfire dashboard |

### 5.10 Rollback Procedure

**Disable push without code change (keeps in-app notifications working):**

```json
// appsettings.Production.json
{
  "Firebase": {
    "ServiceAccountJson": ""
  }
}
```

Restart the backend. `FirebasePushService` detects no Firebase app instance and silently returns `(0, tokenCount)` on every send — no exceptions, no crashes, in-app notification center continues to work.

**OTA rollback (mobile code regression):**

```bash
cd mobile
eas update --branch production --message "rollback: EP-06 push notification fix"
```

**Full migration rollback (last resort):**

```bash
dotnet ef database update --migration 20260610165518_AddWhatsAppCommunicationHub
# WARNING: This drops MobileDeviceTokens, NotificationDeliveryLogs,
# UserNotificationPreferences, MobileAppConfigurations, MobileFeatureFlags.
# Take a full database backup first.
```

---

## 6. EP-10 White Label Architecture Deployment

> **PROMPT-06** · Sprints 11–13

### 6.1 Pre-Deployment Validation

```bash
# 1. Verify school-configs.json exists and is valid JSON
node -e "require('./mobile/scripts/school-configs.json'); console.log('OK')"

# 2. Confirm build compiles cleanly with new MobileAppBranding entity
dotnet build SmsApi.csproj --configuration Release

# 3. Confirm new TypeScript types are clean
pnpm --filter @vitana/mobile typecheck
```

### 6.2 Environment Setup

```bash
# For Vitana shared app (default)
export SCHOOL_ID=vitana

# For a white-label school build
export SCHOOL_ID=dps-rohini
export APP_VERSION=1.0.0
export BUILD_NUMBER=42
# Firebase service files must be present
export GOOGLE_SERVICES_JSON=./google-services.json
export GOOGLE_SERVICES_PLIST=./GoogleService-Info.plist
```

### 6.3 Asset Injection (Required Before Each White-Label Build)

```bash
# Run from the mobile/ directory (or use pnpm filter)
pnpm --filter @vitana/mobile inject:school dps-rohini

# Output should show all 4 required assets as [ok] or [copy]
# If any show [miss], add the PNG files manually to:
#   mobile/assets/school-assets/dps-rohini/
```

### 6.4 Database Migration

```bash
# Run from the backend project root
dotnet ef database update \
  --context SmsApi.Data.AppDbContext \
  --connection "Server=...;Database=SmsDb;..."

# Verify migration applied
dotnet ef migrations list --context SmsApi.Data.AppDbContext
# → 20260611214839_AddMobileAppBranding should appear with [Applied]
```

### 6.5 Build Steps

**Shared Vitana App (no SCHOOL_ID needed):**

```bash
# Dev
pnpm --filter @vitana/mobile start

# Production EAS build
cd mobile && eas build --platform all --profile production
```

**White-Label School App:**

```bash
# 1. Inject assets
pnpm --filter @vitana/mobile inject:school dps-rohini

# 2. Dev preview
SCHOOL_ID=dps-rohini pnpm --filter @vitana/mobile start

# 3. Production EAS build
SCHOOL_ID=dps-rohini cd mobile && eas build --platform all --profile school-production
```

### 6.6 Deployment Steps

1. Deploy updated backend (includes `GET/PUT /api/mobile/branding` endpoints)
2. Apply database migration (`AddMobileAppBranding`)
3. Optionally seed initial branding for each school via `PUT /api/mobile/branding`
4. For white-label builds: inject assets → EAS build → submit to stores

### 6.7 Post-Deployment Verification

```bash
# Backend: verify branding endpoint responds
curl -H "Authorization: Bearer <token>" \
  https://api.vitanasms.com/api/mobile/branding
# Expected: 200 with { primaryColor, accentColor, schoolName, ... }

# Backend: verify PUT branding (Admin token required)
curl -X PUT \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"primaryColor":"#003366","accentColor":"#ffd700"}' \
  https://api.vitanasms.com/api/mobile/branding
# Expected: 200 { message: "Branding updated successfully." }

# Mobile: verify inject script works end-to-end
node mobile/scripts/inject-school-config.js test-school
# Expected: All assets [ok] or [copy], exits 0
```

### 6.8 Smoke Tests

```
[ ] GET /api/mobile/branding returns 200 with correct school colors
[ ] PUT /api/mobile/branding with Admin role returns 200
[ ] PUT /api/mobile/branding with Parent role returns 403
[ ] MobileAppBrandings table has row for the school after PUT
[ ] inject:school test-school creates mobile/assets/school-assets/test-school/ directory
[ ] inject:school test-school creates config.json with correct schoolId
[ ] inject:school unknown-id prints error and exits 1
[ ] SCHOOL_ID=vitana pnpm start → app loads with Vitana blue (#1a6fd8) tab bar
[ ] SCHOOL_ID=test-school pnpm start → app loads with purple (#7c3aed) tab bar
[ ] useAppTheme().colors.primary derives correct light/dark variants
[ ] White-label app skips domain entry screen (isWhiteLabel=true path)
[ ] Tab bar active color matches school primary in all 4 role portals
```

### 6.9 Monitoring Checks

| Signal | Normal | Alert |
|---|---|---|
| `GET /api/mobile/branding` response time | < 100ms (cached) | > 500ms → check DB connection |
| School colors applied in app | Within 5-minute cache TTL | Never applies → check `schoolStore.setAppConfig` is called post-login |
| White-label build fails on assets | `inject-school-config.js` warnings in CI | `[miss]` log for required assets → add PNGs before rebuild |

### 6.10 Rollback Procedure

**Revert bad branding colors** (no code deployment needed):

```bash
# Call PUT branding with correct values
curl -X PUT \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"primaryColor":"#1a6fd8","accentColor":"#17a2b8"}' \
  https://api.vitanasms.com/api/mobile/branding
```

**Revert MobileAppBranding migration** (drops only the branding table):

```bash
dotnet ef database update \
  --migration 20260610221349_AddMobileEntities \
  --context SmsApi.Data.AppDbContext
# Safe: does not touch MobileDeviceTokens or other mobile tables
```

**OTA rollback for white-label binary:**

```bash
# Push previous JS bundle to the school's EAS update channel
eas update --branch school-dps-rohini-production \
  --message "rollback: EP-10 white label fix"
```

---

## 7. EP-13 Admin & Principal Portal (PROMPT-09 — Sprint 14)

### 7.1 Pre-Deployment Validation

Before deploying the admin portal update:

```bash
# 1. Typecheck
pnpm --filter @vitana/mobile typecheck

# 2. Lint
pnpm --filter @vitana/mobile lint

# 3. Verify backend endpoints are available
curl -H "Authorization: Bearer <admin_token>" \
  https://api.vitanasms.com/api/mobile/admin-dashboard
# Expected: 200 OK with AdminDashboardResponse

curl -H "Authorization: Bearer <admin_token>" \
  "https://api.vitanasms.com/api/leavemanagement/leave-requests?status=pending&type=staff"
# Expected: 200 OK with array

curl -H "Authorization: Bearer <admin_token>" \
  https://api.vitanasms.com/api/analytics/dashboard
# Expected: 200 OK (or 404 if not yet implemented — analytics screen handles gracefully)
```

### 7.2 New Dependencies Setup

The admin portal adds `victory-native` and `@shopify/react-native-skia` for analytics charts. These require a native EAS build — OTA update alone is not sufficient.

**Add Skia plugin to `app.config.js`:**

```js
// mobile/app.config.js — add to plugins array
plugins: [
  'expo-router',
  'expo-font',
  'expo-secure-store',
  'expo-notifications',
  '@shopify/react-native-skia',  // ← add this
],
```

**Verify `package.json` has:**

```json
{
  "@shopify/react-native-skia": "1.5.0",
  "victory-native": "^41.26.0"
}
```

### 7.3 EAS Build Steps

Because `@shopify/react-native-skia` is a native module, a full EAS build is required:

```bash
# Stage: run build for both platforms
eas build --platform all --profile staging

# Production (after staging validation)
eas build --platform all --profile production

# White-label school build (example: vitana school)
SCHOOL_ID=vitana eas build --platform all --profile school-vitana-production
```

**Android NDK note:** EAS managed builds include the correct NDK for Skia. If using self-hosted EAS workers, ensure NDK r25c+ is installed.

### 7.4 Deployment Steps

No database migrations are required for this sprint. Deploy in this order:

1. Merge backend changes (if any admin-dashboard endpoint updates were made).
2. Run `dotnet publish` and deploy the updated API.
3. Verify `GET /api/mobile/admin-dashboard` returns 200.
4. Trigger EAS build (includes Skia native module).
5. Promote EAS build to production channel.

```bash
# After EAS build completes, promote to production
eas update --branch production \
  --message "feat: admin portal EP-13 PROMPT-09"
```

### 7.5 Post-Deployment Verification

Perform these checks immediately after deployment:

| Check | Expected Result |
|---|---|
| Login as Admin user | Routed to `/(admin)` dashboard |
| Dashboard KPIs load | Attendance %, pending approvals count, fee collection visible |
| Billing alert | Shown when `billingAlert.alertMessage` is non-null |
| Approvals tab badge | Shows count when pending approvals > 0 |
| Approve a leave | PUT returns 200; item disappears from list |
| Reject without reason | Alert/modal blocks submission |
| Post announcement | Appears in announcements list after creation |
| Urgent announcement | Confirmation dialog shown before posting |
| Reports screen | Charts render (or graceful empty state if analytics not ready) |
| Search students | Results appear with ~300ms debounce after 2+ characters |
| Search staff | Results appear with ~300ms debounce after 2+ characters |

### 7.6 Smoke Tests

```bash
# Run Maestro E2E test for admin leave approval
maestro test mobile/maestro/tests/admin_approve_leave.yaml

# Verify no TypeScript errors in admin screens
pnpm --filter @vitana/mobile typecheck 2>&1 | grep -c "error TS"
# Expected: 0
```

### 7.7 Monitoring Checks

After deployment, monitor for 30 minutes:

- **API latency:** `GET /api/mobile/admin-dashboard` should respond in < 2s (dashboard success criteria)
- **Error rate:** Check backend logs for 403 (role mismatch) or 500 errors on admin endpoints
- **Skia crash rate:** If `@shopify/react-native-skia` is misconfigured, app crashes immediately on Reports tab — watch crash reporting

### 7.8 Rollback Procedure

**Rollback mobile (OTA — if Skia was already in a previous build):**

```bash
# Revert to previous JS bundle
eas update --branch production \
  --message "rollback: revert admin portal EP-13"
```

**Rollback mobile (full build — if Skia is new and causing crashes):**

1. Remove `@shopify/react-native-skia` from `package.json` and `app.config.js`
2. Replace `mobile/app/(admin)/reports/index.tsx` with a static placeholder
3. Rebuild with EAS and promote

**Rollback backend (if admin-dashboard endpoint breaks):**

```bash
# Revert to previous deployment via your CI/CD pipeline
# or roll back the dotnet publish artifact
```

No database migration rollback needed — no new tables were added in this sprint.

---

## Section 8: EP-12 Advanced Offline Sync Engine (PROMPT-12)

> Sprint 12 & 15 · Story Points: 24

### 8.1 Pre-Deployment Validation

```bash
# TypeScript check
pnpm --filter @vitana/mobile typecheck
# Expected: 0 errors

# Lint
pnpm --filter @vitana/mobile lint
# Expected: 0 warnings

# Backend build
dotnet build SmsApi.csproj
# Expected: Build succeeded, 0 errors
```

### 8.2 New Files Checklist

Verify all files exist before building:

```
mobile/src/offline/schema.ts            ← updated (3 new table defs)
mobile/src/offline/db.ts                ← updated (3 new CREATE TABLE blocks)
mobile/src/offline/queue.ts             ← updated (conflict capture + getConflictItems)
mobile/src/offline/marksDraftService.ts ← NEW
mobile/src/offline/bundleLoader.ts      ← NEW
mobile/src/offline/maintenance.ts       ← NEW
mobile/src/features/diary/hooks/useDiaryEntry.ts ← NEW
mobile/src/components/offline/ConflictResolutionSheet.tsx ← NEW
mobile/app/(teacher)/sync-status.tsx   ← NEW
mobile/app/_layout.tsx                  ← updated
mobile/src/features/navigation/hooks/useTeacherMoreItems.ts ← updated
Controllers/Mobile/MobileDashboardController.cs ← updated (offline-bundle endpoint)
Services/MobileDashboardService.cs      ← updated (GetOfflineBundleAsync)
Models/DTOs/MobileDTOs.cs               ← updated (OfflineBundleResponse + DTOs)
```

### 8.3 Backend Deployment Steps

No new database migrations — this sprint adds no new backend tables.

1. Deploy the updated .NET backend:

```bash
dotnet publish -c Release -o ./publish
# Deploy ./publish to your server or container
```

2. Verify the new endpoint is reachable:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer <teacher_jwt>" \
  https://api.your-school.com/api/mobile/offline-bundle
# Expected: 200
```

3. Verify the endpoint returns correct shape:

```bash
curl -H "Authorization: Bearer <teacher_jwt>" \
  https://api.your-school.com/api/mobile/offline-bundle | jq '{
  bundledAt: .bundledAt,
  classCount: (.myClasses | length),
  timetableSlots: (.todaysTimetable | length),
  announcementCount: (.announcements | length)
}'
```

### 8.4 Mobile OTA Deployment

All changes are JS-only (no new native modules). Deploy via OTA update:

```bash
# Stage
eas update --channel staging --message "feat(offline): PROMPT-12 advanced sync engine"

# After staging verification (see 8.6 below)
eas update --channel production --message "feat(offline): PROMPT-12 advanced sync engine"
```

### 8.5 First-Launch SQLite Table Creation

The 3 new SQLite tables (`marks_drafts`, `diary_entry_queue`, `offline_bundle_cache`) are created automatically on first app launch via `initDatabase()`. No manual migration or seed data required.

To verify tables were created (using Flipper SQLite plugin or Expo Dev Tools):

```sql
SELECT name FROM sqlite_master WHERE type='table' AND name IN 
('marks_drafts','diary_entry_queue','offline_bundle_cache');
-- Expected: 3 rows
```

### 8.6 Post-Deployment Verification

**Backend:**
- [ ] `GET /api/mobile/offline-bundle` returns 200 with Teacher JWT
- [ ] `GET /api/mobile/offline-bundle` returns 403 with Parent JWT
- [ ] Response contains `myClasses` array with at least 1 entry for a teacher with assignments
- [ ] `bundledAt` and `expiresAt` are valid ISO datetime strings

**Mobile:**
- [ ] App launches without crash after OTA update
- [ ] Teacher More menu shows "Sync Status" item
- [ ] Sync Status screen loads without error (shows "All synced" for fresh installs)
- [ ] SQLite has 3 new tables (verify via Flipper)
- [ ] `performDatabaseMaintenance()` log appears in Metro (check `[Maintenance] Database cleanup complete`)

### 8.7 Smoke Tests

```bash
# Verify TypeScript compiles
pnpm --filter @vitana/mobile typecheck 2>&1 | grep -c "error TS"
# Expected: 0

# Run unit tests
pnpm --filter @vitana/mobile test
# Expected: all pass

# Verify bundle endpoint (replace with real token + URL)
TOKEN="eyJ..."
curl -H "Authorization: Bearer $TOKEN" \
     https://api.your-school.com/api/mobile/offline-bundle | jq '.bundledAt'
```

**Manual device verification (staging):**
1. Open app as Teacher between 5–10 AM on a WiFi network
2. Check Metro console for `[Bundle] Morning bundle loaded`
3. Open Sync Status from More menu — should show bundle freshness indicator
4. Turn on Airplane mode → open diary entry → fill form → submit
5. Turn off Airplane mode → check Sync Status → diary entry should disappear from pending
6. Submit attendance that has already been submitted → 409 should appear as "Conflict" in Sync Status failed list

### 8.8 Monitoring Checks

After deployment, monitor for 60 minutes:

| Check | Expected |
|---|---|
| `GET /api/mobile/offline-bundle` latency | < 3s (parallel DB queries) |
| `GET /api/mobile/offline-bundle` 5xx rate | 0% |
| SQLite size on device | < 10 MB on first bundle load |
| `[Bundle] Failed to load morning bundle` logs | 0 during morning window on WiFi |
| Sync status screen crash rate | 0 |

### 8.9 Rollback Procedure

**Rollback mobile (OTA):**

```bash
# Roll back to previous bundle
eas update --branch production \
  --message "rollback: revert PROMPT-12 offline sync"
```

The previous version's `initDatabase()` does not include the 3 new tables. SQLite is additive — the new tables remain on disk but are ignored by the old version. No data corruption risk.

**Rollback backend (if offline-bundle endpoint causes issues):**

```bash
# Re-deploy previous backend artifact
# The endpoint is additive — removing it does not break existing endpoints
```

The new `GetOfflineBundleAsync` method in `MobileDashboardService` has no side effects and no database writes. Rolling back the backend leaves the mobile client without a bundle endpoint; `loadMorningBundle()` will `console.warn` and exit silently — the app continues to work normally offline with stale bundle data.

---

## 9. CI/CD Pipeline Guide (EP-11 — PROMPT-07)

> Added: June 2026

All mobile builds run through GitHub Actions + EAS Build. No local Xcode or Android Studio is required for CI builds.

---

### 9.1 Pipeline Overview

| Trigger | Workflow File | What It Does | Approx. Time |
|---|---|---|---|
| PR touching `mobile/**` or `packages/**` | `mobile-eas-preview.yml` | Runs checks, builds APK + IPA, comments build links on PR | ~30 min |
| Push to `develop` (mobile paths) | `mobile-eas-staging.yml` | Runs checks, builds staging AAB + iOS, auto-submits to internal tracks | ~35 min |
| Git tag `mobile-v*.*.*` | `mobile-eas-production.yml` | Runs checks, waits for manual approval, builds production, submits to stores | ~40 min + approval |
| `workflow_dispatch` — OTA Update | `mobile-ota-update.yml` | Deploys JS-only OTA update to any channel | ~5 min |
| `workflow_dispatch` — School Build | `mobile-school-build.yml` | Validates school ID, injects assets, builds dedicated school app | ~35 min |

All EAS workflows use the `mobile-checks.yml` reusable workflow to run TypeScript, ESLint, and Jest before building.

---

### 9.2 Pre-Deployment Requirements

Before any pipeline will succeed, complete the one-time EAS setup (see `docs/DEPLOYMENT_CHECKLIST.md` → EP-11 section):

1. Configure all 9 GitHub repository secrets
2. Create the `mobile-production` GitHub Environment with required reviewers
3. Run `eas project:init` and update `school-configs.json` with the real `easProjectId`
4. Set up EAS credentials for Android and iOS

---

### 9.3 Releasing a New Production Version

```bash
# 1. Ensure all feature PRs are merged to develop

# 2. Bump version in mobile/package.json
#    "version": "1.2.0"

# 3. Create and push the release tag
git tag mobile-v1.2.0
git push origin mobile-v1.2.0

# 4. Go to GitHub Actions → "Mobile — Production Release" run
#    → Approve the pending deployment at the "production-release" job gate

# 5. Monitor the EAS dashboard for build progress
#    → Once complete, builds are automatically submitted to Play Store Internal + TestFlight
```

---

### 9.4 OTA Update Deployment

Use OTA updates to ship JS-only fixes without a full store release (typically < 5 minutes).

**Via GitHub Actions UI:**

1. Go to **Actions → Mobile — OTA Update → Run workflow**
2. Fill in:
   - `channel`: `production` / `staging` / `school-dpsrohini-production`
   - `message`: Short description of what was fixed (shown in EAS dashboard)
   - `platform`: `all` / `android` / `ios`
3. Click **Run workflow**

**Via CLI (for urgent fixes):**

```bash
cd mobile

# Deploy to staging
eas update --channel staging --message "fix: announcement creation crash" --platform all

# Deploy to production
eas update --channel production --message "fix: announcement creation crash" --platform all
```

---

### 9.5 School App Build

**Via GitHub Actions UI:**

1. Go to **Actions → Mobile — Build Dedicated School App → Run workflow**
2. Fill in:
   - `school_id`: Must match a key in `mobile/scripts/school-configs.json` (e.g. `dps-rohini`)
   - `platform`: `all` / `android` / `ios`
   - `submit_to_stores`: `true` to automatically submit to internal testing after build
3. Click **Run workflow**

The workflow validates the school ID first, injects school-specific assets from S3, then builds and optionally submits.

---

### 9.6 Emergency OTA Rollback

```bash
cd mobile

# List recent updates to find a group ID
eas update:list --channel production --limit 5

# Roll back to embedded (app store) bundle — safest option
./scripts/ota-rollback.sh production

# Roll back to a specific previous update group
./scripts/ota-rollback.sh production <group-id-from-list>

# Test on staging first
./scripts/ota-rollback.sh staging
```

The rollback script lives at `mobile/scripts/ota-rollback.sh`. Always test on staging before rolling back production.

---

### 9.7 Monitoring CI Builds

- **EAS Dashboard:** [expo.dev](https://expo.dev) → Project → Builds — shows live build logs
- **GitHub Actions:** Repository → Actions tab — shows workflow status, reusable check results, and job output
- **Slack:** `#mobile-builds` channel — receives notifications for staging, production, school, and OTA builds
- **Sentry:** Source maps are automatically uploaded on production releases — use the `version+buildNumber` release tag to find crash reports

---

### 9.8 Path Filter Behaviour

Mobile workflows only trigger when `mobile/**` or `packages/**` paths change. Backend-only PRs do **not** trigger any mobile workflow.

| Change type | Preview build | Staging build |
|---|---|---|
| `mobile/**` change | ✅ Triggers | ✅ Triggers |
| `packages/**` change | ✅ Triggers | ✅ Triggers |
| `backend/**` or `ui/**` only | ❌ Skipped | ❌ Skipped |
| `docs/**` only | ❌ Skipped | ❌ Skipped |

---

---

## Section 10: Store Submission & Release Procedure (PROMPT-16 / EP-17)

> This section covers the end-to-end process for submitting Vitana SMS to the Google Play Store and Apple App Store, running staged rollouts, and managing OTA hotfixes. A new engineer should be able to execute a complete release using only this section together with `mobile/RELEASE_RUNBOOK.md`.

---

### 10.1 Pre-Deployment Validation

Before any store submission, verify the following:

```bash
# 1. EAS credentials valid
eas credentials --platform android
eas credentials --platform ios
# Both should show "Managed by EAS Remote Credentials"

# 2. Demo school credentials work (all 4 roles)
for user in demo.parent demo.teacher demo.student demo.admin; do
  echo -n "$user@demo.vitanasms.com: "
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://api.vitanasms.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$user@demo.vitanasms.com\",\"password\":\"Demo@12345\"}"
done
# All must return 200

# 3. Privacy policy URL live
curl -I https://vitanasms.com/privacy    # Must return 200
curl -I https://vitanasms.com/support    # Must return 200

# 4. Version bumped in package.json
cat mobile/package.json | grep '"version"'
```

---

### 10.2 Store Setup (One-Time — Before First Release)

These steps are performed once per environment. They require human action in browser consoles — they cannot be automated.

#### Android (Play Console)

1. Create app at [play.google.com/console](https://play.google.com/console)
   - App name: `Vitana SMS — School App`
   - Default language: English (India)
   - App type: App
2. Complete store listing — use content from `mobile/store-assets/descriptions/play-store.md`
3. Upload screenshots and feature graphic — see `mobile/store-assets/CHECKLIST.md` §3
4. Complete IARC content rating questionnaire (Education, Everyone, 13+)
5. Complete Data Safety form — see `mobile/store-assets/data-safety.md` Part A
6. Enrol in Google Play App Signing: Setup → App integrity → "Let Google manage and protect your app signing key"
7. Add Google Play service account to Play Console with "Release Manager" role

#### iOS (App Store Connect)

1. Create app at [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - App name: `Vitana SMS`
   - Bundle ID: `com.vitana.sms` (from Apple Developer portal)
   - SKU: `vitana-sms-001`
2. Complete store metadata — use content from `mobile/store-assets/descriptions/app-store.md`
3. Upload screenshots — see `mobile/store-assets/CHECKLIST.md` §4
4. Complete age rating questionnaire: 4+
5. Complete App Privacy (Nutrition Label) — see `mobile/store-assets/data-safety.md` Part B
6. Record the Apple ID (10-digit number) from App → General → Apple ID → set as `ASC_APP_ID` secret

---

### 10.3 Production Build

The production build is triggered automatically by pushing a Git tag.

```bash
# Step 1: Ensure develop is clean
git checkout develop && git pull origin develop

# Step 2: Confirm version is bumped
cat mobile/package.json | grep '"version"'

# Step 3: Tag and push
git tag mobile-v1.0.0
git push origin mobile-v1.0.0
```

This triggers `.github/workflows/mobile-eas-production.yml` which:
1. Runs `eas build --platform all --profile production`
2. Pauses for manual approval at the `mobile-production` GitHub Environment gate
3. After approval: runs `eas submit` for both platforms
4. Uploads `.aab` and `.ipa` to S3 bucket `vitana-builds`
5. Uploads Sentry source maps

**Approval step:**
GitHub → Actions → Mobile Production Release → "Review deployments" → Approve

---

### 10.4 Submission to Internal Testing

`eas submit` (called automatically by the production workflow) uploads the build to:
- Android: Play Console internal testing track
- iOS: App Store Connect (available in TestFlight within minutes)

**Manual submit (if workflow fails):**
```bash
cd mobile

# Android — submit latest build to internal testing
eas submit --platform android --latest --profile production

# iOS — submit latest build
eas submit --platform ios --latest --profile production
```

---

### 10.5 Android Staged Rollout

After internal testing QA sign-off:

**Day 0 — Start production rollout at 10%:**
1. Play Console → `Vitana SMS` → Production → Create new release
2. Select AAB from internal testing (same build — do not rebuild)
3. Add "What's New" release notes
4. Set rollout: **10%**
5. Click "Start rollout to Production"

**Advancing the rollout:**
```
Day 0:  10%  — monitor Android Vitals for 24h
Day 1:  25%  — if crash rate < 1% and ANR rate < 0.5%
Day 3:  50%  — if all criteria still met
Day 5: 100%  — full rollout
```

Play Console → Production → Edit release → Update rollout % → Save → Confirm

**Halt rollout:**
Play Console → Production → Edit release → **"Halt rollout"**

---

### 10.6 iOS App Store Submission

After internal TestFlight QA sign-off:

1. App Store Connect → `Vitana SMS` → + Version or Platform → iOS
2. Select build from TestFlight
3. Fill "What's New" (release notes)
4. Update screenshots if any screens changed
5. Upload App Review Notes: App Review Information section → copy from `app-review-notes.md` (retrieve from 1Password vault: "Vitana SMS App Review Notes")
6. Enable **Phased Release** checkbox
7. Click **"Submit for Review"**

Apple review: 1–7 days.

**After approval — Phased Release schedule (automatic):**
```
Day 1:   1%  → monitor Sentry closely
Day 2:   2%
Day 3:   5%
Day 4:  10%
Day 5:  20%
Day 6:  50%
Day 7: 100%
```

Pause at any stage: App Store Connect → Version → "Pause Phased Release"

**Expedited review request** (for critical bugfixes only):
App Store Connect → Resolution Center → "Request Expedited Review"

---

### 10.7 OTA Emergency Hotfix

For JS-only fixes that do not require a binary rebuild.

```bash
# Total time target: < 30 minutes from bug discovery to deployed fix

# Step 1: Apply fix on hotfix branch
git checkout main && git pull
git checkout -b hotfix/describe-the-bug
# ... make fix ...
git push origin hotfix/describe-the-bug
# Open PR, 2 reviewers, fast-track merge

# Step 2: Trigger OTA update
# GitHub → Actions → Deploy OTA Update
# Inputs:
#   channel:  production
#   message:  "Fix: <description>"
#   platform: all

# Step 3: Monitor
# Sentry → Issues → filter by version — watch for 30 minutes
```

**Is this fix OTA-eligible?** — See `docs/mobile_application_docs/12-deployment-strategy.md` §3.1

---

### 10.8 Rollback Procedures

**OTA rollback (< 5 minutes):**
```bash
cd mobile

# Find previous update group
eas update:list --channel production --limit 5

# Rollback to embedded bundle (removes all OTA updates)
./scripts/ota-rollback.sh production

# Rollback to specific previous update group
./scripts/ota-rollback.sh production <group-id>

# Test rollback on staging first
./scripts/ota-rollback.sh staging
```

**Android store rollback:**
```
Play Console → Production → Edit release → "Halt rollout"
→ Submit new patched version to internal → promote to production
```

**iOS store rollback:**
```
App Store Connect → Version → "Pause Phased Release"
→ Submit new patched version for expedited review
```

---

### 10.9 Smoke Tests After Deployment

Run these manually on a physical device after each production release:

| # | Test | Platform | Expected |
|---|---|---|---|
| 1 | Login as Parent (`demo.parent@demo.vitanasms.com`) | Android + iOS | Dashboard loads, child visible |
| 2 | Login as Teacher (`demo.teacher@demo.vitanasms.com`) | Android + iOS | Teacher dashboard loads |
| 3 | Login as Student (`demo.student@demo.vitanasms.com`) | Android + iOS | Student dashboard loads |
| 4 | Login as Admin (`demo.admin@demo.vitanasms.com`) | Android + iOS | Admin dashboard loads |
| 5 | Enable Airplane Mode → open attendance marking | Android | Offline mode active; marking queued |
| 6 | Re-enable network | Android + iOS | Offline queue syncs |
| 7 | Trigger push notification (attendance alert) | Android + iOS | Notification received within 60s |
| 8 | Attempt fee payment (sandbox card) | Android + iOS | Payment flow completes, sandbox receipt shown |
| 9 | Force-update check (install old build) | Android + iOS | Force-update screen appears |
| 10 | Biometric login (after initial password login) | Android + iOS | Face ID / fingerprint unlocks app |

---

### 10.10 Post-Deployment Monitoring

**Hours 0–4 (Critical Window):**

| Metric | Tool | Threshold | Action |
|---|---|---|---|
| Crash rate | Sentry | < 0.2% of sessions | > 1%: halt rollout |
| ANR rate | Play Console → Android Vitals | < 0.2% | > 0.5%: halt rollout |
| Login error rate | Sentry + API logs | < 1% | Spike: investigate backend |
| Fee payment error rate | Sentry + Cashfree dashboard | < 0.5% | Any failure: investigate |

**Days 1–7:**

- Play Store rating: maintain > 4.0 stars
- App Store reviews: respond to all < 3 stars within 48 hours
- OTA update delivery rate: > 90% of active users within 24 hours
- Sentry weekly error digest: review and triage new issues

---

## Module 13: Teacher Examinations & Marks Entry (PROMPT-13)

*Implemented: June 2026 | Epic: EP-08, EP-14*

### Pre-Deployment Validation

1. Confirm Redis is running and reachable: `redis-cli ping` → `PONG`
2. Confirm `marks_drafts` table exists in device SQLite (present since PROMPT-12): check `initDatabase` logs on app launch
3. Confirm `ExamSetupController` constructor accepts `ICacheService` in DI container — rebuild backend and confirm no startup errors

### Environment Setup

No new environment variables. Existing configuration is sufficient.

### Infrastructure Requirements

- Redis instance (same as used by auth and other cache operations)
- No new infrastructure

### Migration Execution Steps

No database migrations required on the server. On the mobile client, the `marks_drafts` table was created in PROMPT-12 with `CREATE TABLE IF NOT EXISTS` — upgrading apps will not encounter migration errors.

### Build Steps

```bash
# Backend
dotnet build SmsApi.csproj
# Verify ExamSetupController DI resolves cleanly:
dotnet run --project SmsApi.csproj -- --check-startuptime

# Mobile (TypeScript check)
cd mobile && npx tsc --noEmit
```

### Deployment Steps

1. Deploy backend API with updated `ExamSetupController.cs`
2. Deploy mobile OTA update via `eas update --channel staging` (no binary change required)
3. Verify `X-Idempotency-Key` header flows through to Redis on a staging marks submission

### Post-Deployment Verification

```bash
# Verify idempotency cache key created after first marks submission:
redis-cli keys "marks_idem:*"
# Should show keys like: marks_idem:<uuid>

# Verify exam assignments load for a staff user:
curl -H "Authorization: Bearer <teacher_token>" \
  https://api.yourdomain.com/api/examinations/exam-setup/my-assignments

# Verify marks sheet loads:
curl -H "Authorization: Bearer <teacher_token>" \
  "https://api.yourdomain.com/api/examinations/exam-setup/<setupId>/subjects/<subjectId>/marks"
```

### Smoke Tests

| Test | Expected Result |
|---|---|
| Teacher opens Marks Entry from More menu | `/(teacher)/marks` screen renders exam list |
| Tap on a pending exam | Subject list renders with progress bars |
| Tap on a subject | Marks grid loads with FlashList; student rows visible |
| Enter a mark > max | Field turns red border; Submit blocked with Alert |
| Toggle absent for a student | Mark fields dim; grade shows "AB" |
| Submit marks online | Navigate to performance screen showing average/grade distribution |
| Submit marks offline (airplane mode) | Toast: "Saved Offline"; queued in `offlineQueue` |
| Reconnect — sync | Queue processes; marks appear on server |
| Reopen grid after partial entry | Draft loaded toast shown with save time |
| Teacher opens Assignments | Tabs render: Active / Pending Grading / Closed |
| Create Assignment | Form validates; assignment appears in list |
| Grade submission | Marks + feedback saved; student count decrements |

### Monitoring Checks

- Sentry: watch for `marks_idem:` key lookup failures (would indicate Redis connectivity issue)
- API: `POST /api/examinations/exam-setup/.../marks` response time should be < 500ms
- Mobile: no new crash classes after OTA delivery

### Rollback Procedure

1. **OTA rollback**: `cd mobile && ./scripts/ota-rollback.sh staging`
2. **Backend rollback**: revert `ExamSetupController.cs` to previous commit — the only change is additive (optional header), so the API remains backward compatible
3. **Data**: marks already submitted to the server are preserved regardless of rollback; SQLite drafts on device persist until cleared by maintenance

---

## Section 12: EP-15 — Communication & Messaging (PROMPT-14)

*Sprints 19–20 | June 2026*

### 12.1 Pre-Deployment Validation

```bash
# Confirm backend messaging endpoints respond (authenticated)
TOKEN=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo.teacher@demo.vitanasms.com","password":"Demo@12345","schoolDomain":"demo.vitanasms.com"}' \
  | jq -r .token)

curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/api/communication/messages/conversations?page=1&pageSize=1" | jq .
curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/api/communication/messages/unread-count" | jq .
curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/api/announcements?role=teacher&page=1&pageSize=1" | jq .
curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/api/communication/messages/recipients" | jq .
```

All four commands must return HTTP 200 and valid JSON before proceeding.

### 12.2 Mobile Build

No native modules were added (only JS/TS). An OTA update is sufficient:

```bash
# Deploy to staging first
cd mobile
eas update --channel staging --message "feat(ep-15): teacher-parent messaging + announcements"

# Verify on staging device (see smoke tests below)

# Deploy to production
eas update --channel production --message "feat(ep-15): teacher-parent messaging + announcements"
```

If a binary build is required (e.g., this is bundled with another native change):

```bash
eas build --platform all --profile production
```

### 12.3 Post-Deployment Smoke Tests

| # | Test | Role | Expected |
|---|---|---|---|
| 1 | Open More → Messages | Teacher | Conversation list loads (empty OK) |
| 2 | Tap "+" → select a parent | Teacher | New-thread screen opens |
| 3 | Type and send a message | Teacher | Message appears immediately (optimistic); grey check icon |
| 4 | Open the same conversation on parent device | Parent | Message visible; check turns blue (read receipt) |
| 5 | Parent taps Reply | Parent | Reply appears in thread; teacher receives push within 30 s |
| 6 | Type in thread → background app → return | Teacher | Draft text preserved in input |
| 7 | Enable airplane mode; tap send | Teacher | Send button greyed; "Messaging requires an internet connection" visible |
| 8 | Open More → Announcements → New | Teacher | Create form opens with class selector |
| 9 | Post Urgent announcement | Teacher | Confirmation dialog appears; after confirm, shows in list |
| 10 | Unread badge on Messages row | Both | Badge shows count > 0 after receiving a message |

### 12.4 Monitoring Checks

After deploying:
- Sentry: filter by `mobile/messages` — look for `ApiError` on `getConversations`, `sendMessage`, or `getUnreadCount`
- Sentry: check for `AsyncStorage` errors on draft save/restore
- API logs: monitor `POST /api/communication/messages` for 4xx/5xx spike
- Push notification delivery rate: confirm `new_message_teacher` / `new_message_parent` events appear in FCM / APNs dashboard

### 12.5 Rollback Procedure

No database migrations were added. Rollback is pure OTA:

```bash
# Find the previous update group
eas update:list --channel production --limit 5

# Roll back (removes OTA layer, falls back to embedded bundle)
cd mobile && ./scripts/ota-rollback.sh production

# Or roll back to specific group
cd mobile && ./scripts/ota-rollback.sh production <group-id>
```

After rollback, the messaging screens will no longer be accessible. Push deep-links for `new_message_*` will fall back to the notifications list until re-deployed.

---

## 13. Analytics & Observability Deployment (PROMPT-15)

*EP-16 · Sprint 17–18 · Implemented June 2026*

### 13.1 Pre-Deployment Validation

```bash
# Verify Sentry SDK is in dependencies
grep "@sentry/react-native" mobile/package.json

# Verify Amplitude SDK is in dependencies
grep "@amplitude/analytics-react-native" mobile/package.json

# Verify env vars are set in your target environment's .env
grep "EXPO_PUBLIC_SENTRY_DSN" mobile/.env
grep "EXPO_PUBLIC_AMPLITUDE_API_KEY" mobile/.env

# Run analytics unit tests
npx jest --testPathPattern=analytics --no-coverage
# Expected: 11 tests pass (7 sanitize + 4 getAmountBucket)
```

### 13.2 Environment Setup

| Environment | Action |
|---|---|
| Local development | Copy `mobile/.env.example` to `mobile/.env`; fill in `EXPO_PUBLIC_SENTRY_DSN` and `EXPO_PUBLIC_AMPLITUDE_API_KEY` from your dev-tier projects |
| Staging | Set `EXPO_PUBLIC_ENV=staging` so Sentry and Amplitude events are tagged as staging; use staging-tier API keys |
| Production | Use production Sentry DSN and Amplitude API key; `SENTRY_AUTH_TOKEN` must be set as GitHub Actions secret |

### 13.3 Infrastructure Requirements

No new infrastructure. Analytics are SaaS-only:
- **Sentry**: [sentry.io](https://sentry.io) — project `vitana-mobile` org `vitana-technologies`
- **Amplitude**: [amplitude.com](https://amplitude.com) — production project

### 13.4 Build & Deploy Steps

```bash
# Local — verify no TypeScript errors in analytics files
npx tsc --noEmit 2>&1 | grep -E "(analytics|performance|FeatureError|useScreen)"
# Expected: no output (no errors)

# Production EAS build (CI triggered by mobile-v* tag)
git tag mobile-v1.x.x
git push origin mobile-v1.x.x
# CI will: build → submit → upload source maps to Sentry (releases new + inject + upload + finalize)
```

### 13.5 Post-Deployment Verification

```bash
# 1. Trigger a test crash (in a debug build only):
#    In any screen, add temporarily: throw new Error('Sentry test crash')
# 2. Open Sentry dashboard → Issues → should see the crash within 30 s

# 3. Verify no Authorization header in the Sentry event:
#    Open the event → "Request" section → Headers → Authorization should NOT appear

# 4. Verify user context is UUID only:
#    Open the Sentry event → "User" section → id should be a UUID, not an email

# 5. Open Amplitude Live Activity:
#    Login with a test account → login_success event should appear with role property

# 6. Check amount bucket:
#    Trigger a fee payment → fee_payment_initiated event should have amount_bucket, not raw amount
```

### 13.6 Smoke Tests

| # | Action | Expected Result |
|---|---|---|
| 1 | Log in with demo account | `login_success` in Amplitude within 30 s |
| 2 | Navigate 5 screens | 5 `screen_viewed` events in Amplitude |
| 3 | Log out | `logout` event in Amplitude; Sentry user context cleared |
| 4 | Crash one feature screen (test only) | `FeatureErrorBoundary` fallback shows; other tabs still work |
| 5 | Inspect any Sentry event | No `Authorization` header, no email, no phone number |
| 6 | Check production stack trace | TypeScript filenames visible (not minified) |

### 13.7 Monitoring Checks

- Sentry: confirm events are flowing (check Issues feed within 30 min of first install)
- Sentry Performance: confirm `screen_load_*` spans are appearing in the Performance tab
- Amplitude: confirm `login_success`, `screen_viewed`, and `logout` events appear in Live Activity
- CI: confirm "Upload source maps to Sentry" step exits 0 on first production tag push

### 13.8 Rollback Procedure

No database migrations. Rollback is OTA only:

```bash
# Roll back to previous update (removes analytics layer)
cd mobile && ./scripts/ota-rollback.sh production

# Or: disable analytics only by clearing env vars via a hotfix OTA
# Set EXPO_PUBLIC_SENTRY_DSN="" and EXPO_PUBLIC_AMPLITUDE_API_KEY="" in .env
# Then deploy a new OTA update:
eas update --channel production --message "disable analytics temporarily"
```

**Privacy incident response**: If PII is found in Sentry events, immediately:
1. Rotate the Sentry project (creates new DSN, invalidates old one)
2. Update `EXPO_PUBLIC_SENTRY_DSN` in all environments
3. Use Sentry Data Scrubbing (Project Settings → Security & Privacy) to purge affected events
4. File an internal privacy incident report
