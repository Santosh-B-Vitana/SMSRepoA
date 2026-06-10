# PROMPT-16: Deployment, Store Management & Release Operations

> **Prompt ID:** PROMPT-16  
> **Epic:** EP-17 — Deployment & Store Management  
> **Phase:** 3 — Sprint 13–14  
> **Estimated Story Points:** 37  
> **Prerequisites:** PROMPT-07 (build automation) complete; app in internal testing  
> **Related Architecture Docs:** [12-deployment-strategy](../12-deployment-strategy.md) · [epics/EP-17-deployment](../epics/EP-17-deployment.md)

---

## Context

The mobile app builds are working via CI. Now set up the complete deployment infrastructure: Play Store and App Store presence, store assets, review notes, signing validation, staged rollout procedures, and the operations runbook.

This prompt covers **one-time setup** tasks and **operational procedures** — not code implementation.

**Important:** This prompt involves creating accounts, uploading assets, and configuring external services. Some tasks require human action (Apple ID, payment for developer programs). Document all completion status.

---

## Requirements

### 1. Google Play Console Setup

#### 1.1 Create App Listing

```
App name: Vitana SMS
Default language: English (India)
App type: App
App category: Education > School Applications
```

#### 1.2 Store Listing Content

Create a file `mobile/store-assets/play-store-listing.md` with the final approved text:

```markdown
# Play Store Listing — Vitana SMS

## Short Description (80 chars max)
School management for parents, teachers & students

## Full Description
[Expand the content from EP-17 epic, 4000 chars max]

## App Icon
Path: mobile/assets/school-assets/vitana/app-icon-1024.png
Size: 1024×1024 PNG

## Feature Graphic
Path: mobile/store-assets/feature-graphic.png
Size: 1024×500 PNG

## Screenshots
[See mobile/store-assets/screenshots/android/]
```

#### 1.3 Play App Signing Setup

```
Google Play Console → App Integrity → App Signing
→ Choose "Use Google Play App Signing"
→ Download the Upload Certificate (SHA-256)
→ Register this fingerprint in EAS credentials
→ All future AABs signed with EAS upload key
   Google re-signs for distribution
```

Save the SHA-1 and SHA-256 fingerprints — needed for Firebase config.

#### 1.4 Data Safety Section

Complete the Data Safety questionnaire:

```
Data collected:
☑ Personal info → Name, email (linked to identity, required for app function)
☑ Financial info → Purchase history (linked to identity, no sharing)
☑ Device identifiers → Device ID (linked to identity, for push notifications)
☑ App interactions → App activity (linked to identity, analytics)
☑ Crash logs → Diagnostics (linked to identity, bug fixing)

Data NOT collected:
☐ Location
☐ Health and fitness
☐ Messages (school platform only, not general messaging)

Shared with third parties:
Firebase (push notifications) — Device ID

Data encrypted in transit: Yes
Users can request deletion: Yes (via school admin or support@vitanasms.com)
```

### 2. App Store Connect Setup

#### 2.1 Create App

```
Platform: iOS (iPhone + iPad)
Bundle ID: com.vitana.sms
SKU: vitana-sms-ios-001
Name: Vitana SMS
Primary Language: English (India)
```

#### 2.2 App Store Content

Create `mobile/store-assets/app-store-listing.md`:

```markdown
# App Store Listing — Vitana SMS

## App Name
Vitana SMS

## Subtitle (30 chars max)
School Management App

## Description
[Use EP-17 content, formatted for App Store]

## Keywords (100 chars max)
school,education,attendance,fees,results,parent,teacher,student,ERP,management

## Privacy Policy URL
https://vitanasms.com/privacy

## Support URL
https://vitanasms.com/support

## Marketing URL
https://vitanasms.com

## Age Rating
4+ (no objectionable content)

## Categories
Primary: Education
Secondary: Business
```

#### 2.3 App Review Notes

Create `mobile/store-assets/app-review-notes.md`:

```markdown
# App Review Notes — Vitana SMS

## Account Setup
This app requires institutional credentials provided by school administrators.
Users cannot self-register.

## Demo Credentials
Server URL: https://api.vitanasms.com/api
School Domain: demo.vitanasms.com
Username: demo.parent@demo.vitanasms.com
Password: Demo@12345
Role: Parent (child: Aarav Sharma, Class 8A)

## Important Notes
1. LOGIN REQUIREMENT: This is a school management system. Credentials are 
   provided by school administrators to their staff, parents, and students.
   There is no public sign-up flow. This is standard for institutional apps.

2. FEE PAYMENTS: Parents pay school fees through the app. This is 
   B2B fee collection (school ← parent), NOT in-app purchases for digital 
   goods or services. Cashfree payment gateway handles the transaction.
   Apple's IAP requirement (guideline 3.1.1) does not apply to B2B 
   institutional fee collection.

3. OFFLINE FUNCTIONALITY: Some features (attendance, diary) work offline.
   Connection required for: login, fee payment, push notifications.

## Demo School
The demo school (demo.vitanasms.com) is permanently maintained for review 
purposes. It will not expire or be deleted.
```

#### 2.4 Privacy Nutrition Label

Configure in App Store Connect:

```
Contact Info: Name, Email — linked to identity — school account function
Financial Info: Purchase history — linked to identity — fee records
Identifiers: Device ID — linked to identity — push notifications
Usage Data: Product interaction — linked to identity — analytics
Diagnostics: Crash data — linked to identity — bug fixing

All categories: used for App Functionality, Analytics
```

### 3. Screenshot Generation

Create screenshots for all required sizes. Use Figma templates.

**Scenes to capture (in demo school):**

| # | Scene | Notes |
|---|---|---|
| 1 | Parent Dashboard | Child card visible, attendance green |
| 2 | Monthly attendance calendar | Color-coded heatmap |
| 3 | Fee payment (Cashfree SDK open) | UPI visible |
| 4 | Teacher attendance grid | 8A class visible, marks in progress |
| 5 | Exam results (subject-wise) | Grades visible |
| 6 | Announcements feed | School announcements |

Create `mobile/store-assets/screenshots/android/` and `ios/` directories.

**Screenshot helper script (`mobile/scripts/generate-store-assets.sh`):**

```bash
#!/bin/bash
# Usage: ./scripts/generate-store-assets.sh <scene-name> <platform>
# Takes screenshot on running emulator/simulator and saves to store-assets/
```

### 4. Store Asset Validation Checklist

Create `mobile/store-assets/CHECKLIST.md`:

```markdown
# Store Asset Checklist

## Google Play
- [ ] App icon: 1024×1024 PNG, <1 MB, no transparency
- [ ] Feature graphic: 1024×500 PNG or JPG
- [ ] Phone screenshots: min 2, max 8, 16:9 ratio
- [ ] Short description: ≤ 80 chars
- [ ] Full description: ≤ 4000 chars
- [ ] Privacy policy URL live
- [ ] Data Safety section complete
- [ ] Content rating questionnaire done
- [ ] Target API level: 34

## App Store
- [ ] App icon: 1024×1024 PNG, no transparency, no rounded corners
- [ ] iPhone 6.7" screenshots: 1290×2796
- [ ] iPhone 6.5" screenshots: 1242×2688
- [ ] iPad 13" screenshots (required for universal): 2064×2752
- [ ] App description ≤ 4000 chars
- [ ] Keywords ≤ 100 chars
- [ ] Privacy policy URL live
- [ ] Privacy nutrition label complete
- [ ] App Review Notes with demo credentials
- [ ] Age rating: 4+
```

### 5. EAS Credentials Validation

Run and document results:

```bash
# Validate Android signing
eas credentials --platform android
# Should show: "Managed by EAS Remote Credentials"
# Keystore alias, expiry date

# Validate iOS signing
eas credentials --platform ios
# Should show:
# - Distribution Certificate: valid, expiry date
# - Push Certificate: valid, expiry date
# - App Store provisioning profile: valid
```

Create `mobile/store-assets/credentials-status.md` with the current validity dates.

### 6. Release Runbook Document

Create `mobile/RELEASE_RUNBOOK.md`:

```markdown
# Vitana Mobile — Release Runbook

## Pre-Release Checklist (T-7 days)
- [ ] Feature freeze
- [ ] All PRs merged to develop
- [ ] Staging build tested by QA team
- [ ] Demo school credentials valid and working
- [ ] App Review Notes updated with current demo credentials
- [ ] Store listings updated (if new features)
- [ ] Screenshots updated (if UI changed)
- [ ] Privacy policy URL accessible

## Release Steps
1. Merge develop → main
2. Update version in mobile/package.json (MAJOR.MINOR.PATCH)
3. Push tag: git tag mobile-v{version} && git push origin mobile-v{version}
4. GitHub Actions: approve production workflow
5. Build completes → submitted to internal testing
6. QA verifies internal build on physical devices
7. Android: promote to closed testing → open testing → 10% production
8. iOS: promote TestFlight external → App Store Connect → submit for review
9. Monitor Day 1 metrics (crash rate, ANR, ratings)
10. Android: 10% → 25% → 50% → 100% (each step 24h apart if healthy)
11. iOS: enable phased release, monitor daily

## Rollback Procedures
### OTA Rollback (< 5 minutes)
eas update:republish --channel production --group <previous-group-id>

### Android Store Rollback
Play Console → Release Management → Halt rollout
Submit new patch version

### iOS Store Rollback  
App Store Connect → Pause phased release
Submit expedited review for patch

## Emergency Hotfix
1. Identify: is it JS-only? → OTA | binary change? → store build
2. Fix + PR (2 reviewer fast-track)
3. OTA: trigger mobile-ota-update workflow
4. Monitor Sentry for 30 minutes
5. Close incident report

## Halt Criteria (immediately halt staged rollout)
- Crash rate > 1% of sessions
- ANR rate > 0.5% (Android)
- 1-star reviews mentioning data loss or payment issues
- Backend error rate spike on new app version
```

### 7. Ongoing Maintenance Schedule

Create `mobile/store-assets/MAINTENANCE_SCHEDULE.md`:

```markdown
# Store Maintenance Schedule

## Weekly
- Review Play Console Android vitals (crash rate, ANR rate)
- Review Sentry mobile errors
- Review Amplitude DAU/feature usage

## Monthly
- Update screenshots if UI changed
- Review and respond to Play Store reviews (< 3 stars)
- Renew EAS credentials if expiring within 60 days
- Update store listing if new features added
- Review stale FCM tokens (MobileDeviceTokens where LastActiveAt < 90 days)

## Per Release
- Update changelog / What's New text
- Update screenshots if any screens changed significantly
- Verify demo credentials still work
- Update App Review Notes if login flow changed
```

---

## Implementation Tasks

1. Create Google Play Console app listing with all metadata.
2. Complete Play Data Safety questionnaire.
3. Create App Store Connect app with all metadata.
4. Complete App Store privacy nutrition label.
5. Create `mobile/store-assets/` directory structure.
6. Write `play-store-listing.md` with approved text.
7. Write `app-store-listing.md` with approved text.
8. Write `app-review-notes.md` with demo credentials (keep up to date).
9. Generate screenshots for all required sizes (6 scenes × 5 sizes).
10. Write `CHECKLIST.md` for store asset validation.
11. Run `eas credentials` validation and document results.
12. Create `credentials-status.md`.
13. Write `mobile/RELEASE_RUNBOOK.md`.
14. Write `mobile/store-assets/MAINTENANCE_SCHEDULE.md`.
15. Perform first internal test release to both stores.
16. Configure Play Store staged rollout settings.
17. Enable App Store phased release in App Store Connect.
18. Test OTA rollback procedure in staging channel.

---

## Acceptance Criteria

- [ ] App available on Play Store internal testing track (download confirmed).
- [ ] App available on TestFlight internal testing (download confirmed).
- [ ] Store listings complete with all required assets (icons, screenshots, description).
- [ ] App Review Notes demo credentials working (tested by reviewer attempting login).
- [ ] EAS credentials valid with > 6 months remaining.
- [ ] `RELEASE_RUNBOOK.md` covers all scenarios.
- [ ] OTA rollback tested in staging (update published → rolled back → old version active).
- [ ] Play Store staged rollout configured (10% setting visible).
- [ ] iOS Phased Release enabled for the production build.
- [ ] All store asset checklist items checked.

---

## Documentation Requirements

All documents created in this prompt:
- `mobile/store-assets/play-store-listing.md`
- `mobile/store-assets/app-store-listing.md`
- `mobile/store-assets/app-review-notes.md` (KEEP CONFIDENTIAL — contains demo credentials)
- `mobile/store-assets/CHECKLIST.md`
- `mobile/store-assets/credentials-status.md`
- `mobile/store-assets/MAINTENANCE_SCHEDULE.md`
- `mobile/RELEASE_RUNBOOK.md`

Add `mobile/store-assets/app-review-notes.md` to `.gitignore` (contains passwords). Store credentials in 1Password vault.

---

## Definition of Done

- [ ] Both store listings complete and approved.
- [ ] Internal test builds installable on physical devices.
- [ ] Release runbook reviewed by engineering lead and DevOps.
- [ ] Demo school verified working 48 hours before App Store submission.
- [ ] All credentials valid and documented.
- [ ] All store assets meet size and format requirements.
- [ ] `.gitignore` updated to exclude credentials files.
