# PROMPT-16: Deployment, Store Management & Release Operations

> **Version**: 2.0 — Full 10-Phase Anatomy  
> **Epic**: EP-17 — Deployment & Store Management  
> **Sprint**: 13–14 (Weeks 25–28)  
> **Story Points**: 37  
> **Prerequisites**: PROMPT-07 ✓ (CI/CD pipelines working); app in internal testing  
> **Owner**: DevOps Engineer + Product Manager  
> **This prompt is operational, not code. It sets up store presence and release processes.**

---

## PHASE 1: Context & Scope

### What We're Building

The complete deployment infrastructure: Play Store and App Store listings, store assets, app review notes, signing validation, staged rollout procedures, and the release runbook every engineer and product manager follows.

**Deliverables:**
- Google Play Console app listing (complete)
- Apple App Store Connect app listing (complete)
- Store assets: screenshots (6 scenes × 5 sizes), icons, feature graphic
- App Review Notes (with demo credentials)
- Privacy policy (Play Data Safety + App Store nutrition label)
- First internal testing track release (Play Store + TestFlight)
- Release runbook
- Maintenance schedule

### Current State

- ✅ EAS build profiles configured (PROMPT-07)
- ✅ GitHub Actions workflows (PROMPT-07)
- ✅ Signing: EAS Remote Credentials (PROMPT-07)
- ✅ App assets: icon, splash screen in `assets/school-assets/vitana/`
- ❌ Play Console app not created
- ❌ App Store Connect app not created
- ❌ Store listings not written
- ❌ Screenshots not generated
- ❌ App Review Notes not written

### Success Criteria

- [ ] Vitana SMS APK installable on Android via Play Console internal testing
- [ ] Vitana SMS installable on iPhone via TestFlight internal testing
- [ ] Store listing complete: description, screenshots, icon, privacy policy
- [ ] App Review Notes provide working demo credentials
- [ ] EAS credentials valid with > 6 months remaining
- [ ] Release runbook reviewed and approved by team lead
- [ ] OTA rollback tested in staging channel
- [ ] Staged rollout visible in Play Console (10% setting configured)
- [ ] iOS Phased Release enabled

---

## PHASE 2: Analysis Phase

### Read First

```bash
docs/mobile_application_docs/12-deployment-strategy.md
docs/mobile_application_docs/epics/EP-17-deployment.md
docs/mobile_application_docs/MOBILE-DEV-GUIDE.md  # for demo credentials
```

### Pre-Prompt Checklist (DevOps must verify)

```bash
# 1. EAS credentials configured
eas credentials --platform android  # Should show: "Managed by EAS Remote Credentials"
eas credentials --platform ios      # Should show: distribution cert + provisioning profile

# 2. Firebase configured (from PROMPT-05)
cat mobile/google-services.json     # Must exist
cat mobile/GoogleService-Info.plist # Must exist (iOS)

# 3. Build a preview build to confirm everything compiles
eas build --platform all --profile preview --non-interactive
# Wait for completion and verify APK/IPA are generated

# 4. Ensure demo school is live and credentials work
curl -X POST https://api.vitanasms.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo.parent@demo.vitanasms.com","password":"Demo@12345"}'
# Must return 200 with token
```

---

## PHASE 3: Technical Planning

### Store Submission Sequence

```
ANDROID:
Day 1: Create Play Console app → upload assets → complete content rating → data safety
Day 2: Build production AAB → submit to internal testing
Day 3: Vitana team + 10 pilot users test → sign off
Day 4: Promote to Closed Testing (20 external testers)
Day 7: If clean → Production 10% rollout
Day 9: 25% → Day 11: 50% → Day 13: 100%

IOS:
Day 1: Create App Store Connect app → complete metadata
Day 2: Build production IPA → upload to App Store Connect
Day 3: Internal TestFlight (automatic, no review)
Day 4: External TestFlight submission → Apple review (24h)
Day 5: External TestFlight available to 50 testers
Day 7: Submit for App Store review (1–7 days review time)
Day 14: If approved → Phased Release Day 1 (1%)
```

---

## PHASE 4: Database Design

> Not applicable. This prompt creates store listings and documentation.

---

## PHASE 5: Backend Implementation

> Only ensure the demo school is permanent and credentials never expire:

```csharp
// In appsettings.Production.json, ensure demo school seeding:
"DemoSchool": {
  "Enabled": true,
  "Domain": "demo.vitanasms.com",
  "AdminPassword": "Demo@12345",
  "ParentPassword": "Demo@12345",
  "TeacherPassword": "Demo@12345",
  "StudentPassword": "Demo@12345"
}
// Demo school data is seeded in DbInitializer.cs
// Passwords NEVER expire for demo accounts
// Add note in seed: "NEVER disable demo school — used for App Store review"
```

---

## PHASE 6: Implementation (Store Setup & Documents)

### 6.1 Create `mobile/store-assets/` Directory Structure

```bash
mkdir -p mobile/store-assets/android/screenshots
mkdir -p mobile/store-assets/ios/screenshots/iphone-6.7
mkdir -p mobile/store-assets/ios/screenshots/iphone-5.5
mkdir -p mobile/store-assets/ios/screenshots/ipad-13
mkdir -p mobile/store-assets/descriptions
```

### 6.2 Play Store Listing

**File: `mobile/store-assets/descriptions/play-store.md`**

```markdown
# Play Store Listing — Vitana SMS

## App Name
Vitana SMS

## Short Description (max 80 chars)
School management for parents, teachers & students

## Full Description (max 4000 chars)
Vitana SMS brings your school to your phone.

**FOR PARENTS:**
• Real-time attendance alerts — know instantly if your child is absent
• One-tap fee payment via UPI, Cards, or Netbanking (Cashfree)
• Exam results and report cards at your fingertips
• School announcements and class diary updates
• Direct messaging with class teacher
• Leave requests for your child

**FOR TEACHERS:**
• Quick attendance marking — works even without internet
• Marks entry with offline auto-save
• Class diary entries and announcements
• Assignment management and student grading
• Leave request approvals

**FOR STUDENTS:**
• Class timetable — available offline
• Assignment submission (text or file)
• Exam results and report card download
• Leave applications

**FOR SCHOOL ADMINISTRATION:**
• School-wide KPIs at a glance
• Staff leave approvals
• Broadcast announcements to parents and staff

Vitana SMS is used by 100+ schools across India, serving parents, teachers, 
students, and administrators.

ACCOUNT REQUIRED: This app requires credentials provided by your school 
administrator. Please contact your school office for login details.

PRIVACY: School data is stored in dedicated, isolated servers per school. 
We do not sell or share your data.

## Category
Education

## Content Rating
Everyone

## Tags
school, education, attendance, fees, teacher, parent, student, ERP, management, results
```

### 6.3 App Store Listing

**File: `mobile/store-assets/descriptions/app-store.md`**

```markdown
# App Store Listing — Vitana SMS

## Name
Vitana SMS

## Subtitle (max 30 chars)
School Management App

## Description (max 4000 chars)
[Same content as Play Store description, adapted for App Store format]

## Keywords (max 100 chars)
school,education,attendance,fees,results,parent,teacher,student,ERP,management

## Categories
Primary: Education
Secondary: Business

## Age Rating: 4+

## Privacy Policy URL
https://vitanasms.com/privacy

## Support URL
https://vitanasms.com/support

## Marketing URL
https://vitanasms.com
```

### 6.4 App Review Notes (CONFIDENTIAL — do NOT commit to public git)

**File: `mobile/store-assets/app-review-notes.md`** (add to .gitignore)

```markdown
# App Store Review Notes — Vitana SMS
# CONFIDENTIAL — Contains demo credentials

## Account Required — Explanation

This is an institutional school management system. Credentials are provided by 
school administrators to parents, teachers, and students.

There is NO public sign-up. This is standard for institutional apps used by 
K-12 schools, hospitals, corporations, and government organizations.

## Demo Credentials for Review

**API Server:** https://api.vitanasms.com/api
**School Domain:** demo.vitanasms.com

### Parent Account
Username: demo.parent@demo.vitanasms.com
Password: Demo@12345

This account shows:
- A child named "Aarav Sharma" in Class 8A
- Attendance records (some present, some absent)
- Fee records with outstanding balance (use sandbox for payment)
- Published exam results
- Announcements from the school

### Teacher Account
Username: demo.teacher@demo.vitanasms.com
Password: Demo@12345

This account shows:
- Class 8A with 30 students
- Attendance marking (online and offline mode)
- Student assignments and grading

## Fee Payment (Guideline 3.1.1)

Parents pay school fees through the app. This is institutional B2B fee 
collection — the school collects fees from parents for educational services.

This is NOT:
- An in-app purchase of digital goods
- A subscription to the app itself
- A purchase of virtual currency or credits

Apple's IAP requirement (3.1.1) does not apply to B2B institutional fee 
collection. Reference: App Store Review Guidelines 3.1.3(f) — 
"Apps that facilitate the purchase of non-digital goods or services."

## Demo School Permanence

The demo school (demo.vitanasms.com) is a permanently maintained test environment.
It will never be deleted, disabled, or have expired credentials.
It is specifically maintained for App Store review purposes.

## Offline Features

Some features work without internet:
- Attendance marking (queued and synced on reconnect)
- Timetable viewing
- Cached results and announcements

Internet required for:
- Login
- Fee payment
- Push notifications
```

### 6.5 Play Store Data Safety

**File: `mobile/store-assets/data-safety.md`**

```markdown
# Google Play Data Safety — Vitana SMS

## Data Collected and Why

| Data Type | Collected | Shared | Purpose |
|---|---|---|---|
| Personal info (name, email) | Yes | No | App functionality — school accounts |
| Financial info (fee transactions) | Yes | Cashfree (payment) | Fee payment processing |
| Location | No | — | Not collected |
| Photos/videos | Yes (user choice) | No | Profile and document uploads |
| Device identifiers | Yes | Firebase (push) | Push notifications |
| App interactions | Yes | Analytics | App improvement |
| Crash logs | Yes | Sentry | Bug fixing |

## Data Encryption: Yes (in transit)
## User can request deletion: Yes (via school admin or support@vitanasms.com)
## Data shared with third parties for advertising: No
```

### 6.6 App Store Privacy Nutrition Label

```markdown
# App Store Privacy — Vitana SMS

## Data Used to Track You
None

## Data Linked to You
- Contact Info: Email (used for school account)
- Financial Info: Purchase history (school fee records)
- Identifiers: Device ID (push notifications)
- Usage Data: App interaction data (analytics)
- Diagnostics: Crash data (Sentry)

## Data Not Linked to You
None
```

### 6.7 Store Asset Checklist

**File: `mobile/store-assets/CHECKLIST.md`**

```markdown
# Store Asset Checklist

## Required Screenshots (Capture in demo school with demo parent account)
Screenshot 1: Parent Dashboard — child card visible, attendance green
Screenshot 2: Monthly attendance calendar — color-coded heatmap
Screenshot 3: Fee summary + "Pay Online" button
Screenshot 4: Teacher attendance marking grid (Class 8A)
Screenshot 5: Exam results list with grade badges
Screenshot 6: Announcements feed

## Android Sizes
- [ ] Phone: 1080×1920 (6 screenshots, max 8 MB each)
- [ ] Feature graphic: 1024×500 PNG

## iOS Sizes
- [ ] iPhone 6.7": 1290×2796 (required for iPhone 14/15 Pro Max)
- [ ] iPhone 5.5": 1242×2208 (required)
- [ ] iPad 13" Pro: 2064×2752 (required for App Store)

## App Icons
- [ ] Android: 512×512 PNG in Play Console
- [ ] iOS: 1024×1024 PNG (no rounded corners, no alpha) via app.config.js

## Play Console Checklist
- [ ] App name: Vitana SMS
- [ ] Short description: filled (≤80 chars)
- [ ] Full description: filled (≤4000 chars)
- [ ] Privacy policy URL: https://vitanasms.com/privacy
- [ ] Content rating: completed (IARC questionnaire)
- [ ] Target audience: 13+ (students and parents)
- [ ] Data safety: completed
- [ ] App category: Education

## App Store Connect Checklist
- [ ] App name + subtitle filled
- [ ] Description filled
- [ ] Keywords filled (≤100 chars)
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Age rating: 4+
- [ ] Primary category: Education
- [ ] Privacy nutrition label: complete
- [ ] App Review Notes: uploaded with demo credentials
```

### 6.8 Release Runbook

**File: `mobile/RELEASE_RUNBOOK.md`**

```markdown
# Vitana Mobile — Release Runbook v1.0

## Pre-Release Checklist (T-7 days before release)
- [ ] Feature freeze — no new PRs merged to `develop`
- [ ] Staging build installed and tested by QA team
- [ ] Demo school credentials verified (login with each role)
- [ ] App Review Notes updated with current demo credentials
- [ ] Store listing screenshots updated (if any screens changed)
- [ ] CHANGELOG.md updated with new features
- [ ] Version bumped in `mobile/package.json`
- [ ] `EXPO_PUBLIC_SENTRY_DSN` set in EAS secrets

## Release Steps

### Step 1: Create Release Tag
git tag mobile-v{MAJOR.MINOR.PATCH}
git push origin mobile-v{MAJOR.MINOR.PATCH}

### Step 2: Approve Production Workflow
Go to: GitHub → Actions → Mobile Production Release
Click "Review deployments" → Approve

### Step 3: Monitor Build
EAS Dashboard: expo.dev/accounts/vitana/projects/vitana-sms/builds
Expected build time: 20–30 minutes

### Step 4: Internal Testing (1-2 days)
Android: Play Console → Internal Testing → View release
iOS: App Store Connect → TestFlight → Internal Testing

### Step 5: Promote to Beta (Optional, for major releases)
Android: Promote to Closed Testing → add 20 external testers
iOS: Submit External TestFlight → Apple review (24h) → release to 50 testers

### Step 6: Production Release

**Android (Play Store):**
Play Console → Production → Create new release
→ Select AAB from Internal Testing
→ Set rollout: 10%
→ Monitor for 24 hours
→ If healthy: 25% → 50% → 100% (24h gaps)

**Halt criteria:**
- Crash rate > 1% of sessions → Halt rollout immediately
- ANR rate > 0.5%
- 1-star reviews mentioning data loss or payment issues

**iOS (App Store):**
App Store Connect → Submit for Review
→ Enter App Review Notes (from store-assets/app-review-notes.md)
→ Enable Phased Release
→ Review takes 1-7 days
→ If approved: Phased Release Day 1 (1%)
→ Monitor → Advance daily if healthy

## Emergency Hotfix

### Is it JS-only?
YES → OTA Update (< 30 minutes total):
  1. Fix + PR → fast-track review (2 reviewers)
  2. GitHub Actions → Deploy OTA Update
     Channel: production
     Message: "Fix: [description]"
  3. Monitor Sentry for 30 minutes
  4. Close incident

### Requires binary change?
1. Fix + PR → merge to develop
2. Tag: mobile-v{version}-hotfix
3. Approve production workflow
4. Submit patch to stores
5. iOS: Request expedited review (App Store Connect → Request Expedited Review)

## Rollback

### OTA Rollback (< 5 minutes)
cd mobile && ./scripts/ota-rollback.sh production [optional-group-id]

### Android Store Rollback
Play Console → Release Management → Halt rollout
→ Rollout frozen at current percentage
→ Submit new patch version with fix

### iOS Store Rollback
App Store Connect → Pause Phased Release
→ Cannot remove live build; submit new version with fix
→ Request expedited review if critical

## Version Numbering
MAJOR.MINOR.PATCH
- MAJOR: Architecture change or major redesign
- MINOR: New feature set (new module, new role app)
- PATCH: Bug fixes, content changes, OTA-eligible changes

## Notification Channels
- Build complete/failed: #mobile-builds Slack
- Production release: #engineering Slack  
- App Store approved/rejected: DevOps email + #mobile-builds

## Contacts
- Apple App Store issues: support@developer.apple.com
- Google Play issues: play-developer-support@google.com
- EAS issues: support@expo.dev
- Cashfree SDK issues: developer-support@cashfree.com
```

### 6.9 Maintenance Schedule

**File: `mobile/store-assets/MAINTENANCE_SCHEDULE.md`**

```markdown
# Store Maintenance Schedule

## Weekly
- [ ] Review Play Console Android Vitals (crash rate, ANR rate)
- [ ] Review Sentry mobile error digest
- [ ] Review Amplitude DAU / feature usage
- [ ] Respond to Play Store reviews < 3 stars (within 48h)

## Monthly
- [ ] Update screenshots if any screens changed significantly
- [ ] Review App Store reviews and respond
- [ ] Renew EAS credentials if expiring within 60 days
  (eas credentials --platform android && --platform ios)
- [ ] Audit MobileDeviceTokens: tokens inactive > 90 days
  (DB query: SELECT COUNT(*) FROM MobileDeviceTokens WHERE LastActiveAt < DATEADD(day,-90,GETUTCDATE()))
- [ ] Verify demo school credentials still work

## Per Release
- [ ] Update What's New / Release Notes
- [ ] Update screenshots if UI changed
- [ ] Verify demo school credentials work for App Store review
- [ ] Update App Review Notes if login flow changed
- [ ] Check Privacy Policy URL is accessible
- [ ] Verify all store asset sizes are within limits

## Annual
- [ ] Renew Apple Developer Program ($99/year)
- [ ] Review and update Privacy Policy
- [ ] Review store listing copy (features may have changed)
- [ ] Audit all third-party SDK dependencies for updates
```

---

## PHASE 7: AI/ML Integration

> Not applicable.

---

## PHASE 8: External Integrations

### 8.1 Play Console API (for automated submissions)

The `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` secret (configured in PROMPT-07) enables `eas submit` to automatically upload to Play Console. Verify it has these permissions:

- Release Manager role on the app
- Permission: "Release apps to testing tracks and production"

### 8.2 Apple App Store Connect API

Configure in `eas.json` submit section (from PROMPT-07):

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "ops@vitanasms.com",
      "ascAppId": "REPLACE_WITH_REAL_ID",
      "appleTeamId": "REPLACE_WITH_REAL_TEAM_ID"
    }
  }
}
```

---

## PHASE 9: Testing & Validation

### 9.1 Pre-Submission Testing Matrix

| Test | Android | iOS |
|---|---|---|
| Login (parent) | ✅ Physical | ✅ Physical |
| Login (teacher) | ✅ Physical | ✅ Simulator |
| Attendance marking (offline) | ✅ Airplane mode | ✅ Airplane mode |
| Fee payment (Cashfree sandbox) | ✅ Physical | ✅ Physical |
| Push notification tap | ✅ Physical | ✅ Physical |
| Force update screen | ✅ Both | ✅ Both |
| Biometric unlock | ✅ Fingerprint | ✅ Face ID |
| App theme (school colors) | ✅ | ✅ |
| Dark mode | ✅ | ✅ |
| Landscape rotation (tablets) | ✅ | ✅ |

### 9.2 Validation Checklist

- [ ] APK installs on Android 9 (API 28) physical device
- [ ] IPA installs on iOS 16.0 device (minimum supported)
- [ ] Demo credentials work for all 4 roles
- [ ] App Review Notes match current login flow (test by following them manually)
- [ ] Privacy policy URL returns 200 from mobile device browser
- [ ] All screenshots at correct dimensions (run `file screenshot.png` to verify)
- [ ] Play Console content rating questionnaire completed
- [ ] App Store privacy nutrition label matches actual data collection

---

## PHASE 10: Documentation & Verification

### File List (all must exist after this prompt)

```
mobile/
├── RELEASE_RUNBOOK.md
├── store-assets/
│   ├── CHECKLIST.md
│   ├── MAINTENANCE_SCHEDULE.md
│   ├── descriptions/
│   │   ├── play-store.md
│   │   └── app-store.md
│   ├── data-safety.md
│   ├── android/
│   │   └── screenshots/  (6 screenshots × 1080×1920)
│   └── ios/
│       └── screenshots/
│           ├── iphone-6.7/  (6 screenshots)
│           ├── iphone-5.5/  (6 screenshots)
│           └── ipad-13/     (3 screenshots minimum)
│
│   NOTE: app-review-notes.md is gitignored (contains demo passwords)
│         Store in 1Password vault instead
```

### Git Commit

```bash
git add mobile/RELEASE_RUNBOOK.md \
        mobile/store-assets/CHECKLIST.md \
        mobile/store-assets/MAINTENANCE_SCHEDULE.md \
        mobile/store-assets/descriptions/ \
        mobile/store-assets/data-safety.md
# DO NOT git add app-review-notes.md (contains credentials)

git commit -m "docs(mobile/store): store listings, release runbook, maintenance schedule

- RELEASE_RUNBOOK.md: complete release procedure including rollback
- store-assets/descriptions/: Play Store + App Store listing text
- store-assets/data-safety.md: Play Data Safety form answers
- store-assets/CHECKLIST.md: per-release asset validation
- store-assets/MAINTENANCE_SCHEDULE.md: weekly/monthly/annual tasks
- .gitignore: app-review-notes.md excluded (credentials stored in 1Password)

Deliverables:
- Play Console app: [link]
- App Store Connect app: [link]
- First internal builds: submitted
- OTA rollback: tested in staging
- Phased rollout: configured at 10%

NEXT: Monitor metrics, advance rollout, respond to reviews"
```

---

**END OF PROMPT-16**
