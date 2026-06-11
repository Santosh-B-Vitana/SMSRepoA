# EP-17: Deployment & Store Management

> **Epic ID:** EP-17  
> **Priority:** P1  
> **Estimated Sprints:** 2  
> **Phase:** 3 — Sprint 13 + ongoing  
> **Related Docs:** [12-deployment-strategy](../12-deployment-strategy.md) · [11-build-automation](../11-build-automation.md)

---

## Business Objective

The mobile app has no value until it's in users' hands. Deployment is the final mile. A well-managed deployment process ensures: schools receive updates quickly, store rejections are anticipated and mitigated, rollbacks are fast when issues arise, and the operations team can manage 100+ school apps without manual chaos.

## Technical Objective

Establish the complete deployment infrastructure: Play Console and App Store Connect setup, signing configuration, store asset management, staged rollout procedures, OTA update channels, and the operational runbook for release management.

---

## Functional Requirements

### One-Time Setup

| ID | Requirement |
|---|---|
| FR-1 | Google Play Console app created for Vitana SMS |
| FR-2 | App Store Connect app created for Vitana SMS |
| FR-3 | EAS Remote Credentials configured for Android (keystore) |
| FR-4 | EAS Remote Credentials configured for iOS (distribution cert + provisioning profile) |
| FR-5 | Google Play App Signing enrolled (delegated signing) |
| FR-6 | APNS push certificate added to EAS credentials |
| FR-7 | Store assets prepared: icons, screenshots, feature graphic, descriptions |

### Release Process

| ID | Requirement |
|---|---|
| FR-8 | Production build via Git tag triggers automated pipeline |
| FR-9 | Build submitted to internal testing tracks automatically |
| FR-10 | Internal QA checklist completed before promoting to beta |
| FR-11 | Play Store staged rollout: 10% → 25% → 50% → 100% with 24h monitoring |
| FR-12 | App Store Phased Release enabled for all production releases |
| FR-13 | Rollback available: halt staged rollout on Play + pause release on App Store |

### OTA Updates

| ID | Requirement |
|---|---|
| FR-14 | JS-only bug fixes deployed via OTA (no store review) |
| FR-15 | OTA updates targeted per channel (production, staging, per-school) |
| FR-16 | Emergency hotfix OTA deployed in < 30 minutes |
| FR-17 | OTA rollback available (republish previous update group) |

### Store Asset Management

| ID | Requirement |
|---|---|
| FR-18 | Screenshot templates maintained for all screen sizes |
| FR-19 | Store descriptions maintained in version control |
| FR-20 | Privacy policy URL live and accessible |
| FR-21 | App Review Notes document maintained |

---

## Store Listing Content (Vitana Shared App)

### Play Store

```
App Name: Vitana SMS — School App
Short Description (80 chars):
  School management for parents, teachers & students

Full Description (4000 chars):
  Vitana SMS brings your school to your phone.
  
  FOR PARENTS:
  • Real-time attendance alerts
  • One-tap fee payment (UPI, Cards, Netbanking)
  • Exam results and report cards
  • School announcements and class diary
  • Direct messaging with teachers
  • Leave requests for your child
  
  FOR TEACHERS:
  • Quick attendance marking (works offline)
  • Marks entry with auto-save
  • Class diary posting
  • Assignment management and grading
  
  FOR STUDENTS:
  • Class timetable (available offline)
  • Assignment submission
  • Exam results and report cards
  • Leave applications
  
  Vitana SMS is used by 100+ schools across India.
  
  PRIVACY: We protect your data. All school data is stored
  in dedicated servers per school. We do not sell data.
  
  NOTE: This app requires an account provided by your school.
  Contact your school administrator for login credentials.

Category: Education
Content Rating: Everyone
```

### App Store

```
Name: Vitana SMS
Subtitle: School Management App

Description:
  [Same as Play Store, formatted for App Store guidelines]

Keywords: school, education, attendance, fees, results, 
          parent, teacher, student, ERP, management

Privacy Policy URL: https://vitanasms.com/privacy
Support URL: https://vitanasms.com/support
Marketing URL: https://vitanasms.com

App Review Notes:
  This app requires institutional credentials provided by 
  school administrators. For review, use:
  Server: https://api.vitanasms.com
  School Domain: demo.vitanasms.com
  Username: demo.parent@demo.vitanasms.com
  Password: Demo@12345
  
  This app handles school fee payments on behalf of schools
  (B2B collections). Parents pay school fees to their school,
  not for digital goods, so IAP is not applicable.
```

---

## Screenshots Plan

| Platform | Sizes Required | Count |
|---|---|---|
| Android Phone | 1080×1920 | 4–8 |
| Android 7-inch tablet | 1200×1920 | 2–4 |
| iOS iPhone 6.5" | 1242×2688 | 4–8 |
| iOS iPhone 5.5" | 1242×2208 | 4–8 |
| iOS iPad 12.9" | 2048×2732 | 4–8 |

Screenshots to capture:
1. Parent dashboard (with demo data).
2. Attendance calendar view.
3. Fee payment screen.
4. Teacher attendance marking grid.
5. Exam results screen.
6. Announcements feed.

**Template design:** Flat mockup with device frame + feature headline text overlay. Generated using Figma templates. Stored in `mobile/store-assets/screenshots/`.

---

## Release Runbook

### New Version Release

```
Day -7: Feature freeze. All PRs merged.
Day -5: QA on staging build. Bug fixes via OTA to staging.
Day -3: Push tag mobile-v{version} → production build starts.
         GitHub approval required (mobile-production environment).
Day -2: Build submitted to internal testing tracks.
         Vitana team + pilot school testers install and verify.
Day -1: If QA passes → promote to Closed Testing (Play) / External TestFlight (iOS).
         App Store submit for review.
Day 0:  Play Store: 10% rollout begins.
         Monitor: Sentry crash rate, ANR rate, Play Console ratings.
Day 1:  If healthy → 25% rollout.
Day 3:  50% rollout.
Day 5:  100% rollout.
         iOS: manually release from App Store Connect (if approved).
```

### Emergency Hotfix (OTA)

```
Bug identified in production.
Is it JS-only? → Yes → OTA hotfix
                  → No → New store build (expedited review request on iOS)

OTA Process:
1. Fix applied on hotfix branch.
2. PR reviewed + merged to main (fast-track, 2 reviewer minimum).
3. trigger: workflow_dispatch → mobile-ota-update (channel=production)
4. Update deployed within 15 minutes.
5. Monitor Sentry for resolution (30 minutes).
6. Close incident.
```

### Rollback

```
Android (store): 
  Play Console → Release Management → Halt rollout
  Then: Roll back to previous build or push new patch

iOS (store):
  Cannot roll back live release.
  App Store Connect → Pause phased release
  Submit new patch version with expedited review

OTA Rollback (< 5 minutes):
  eas update:republish --channel production --group <previous-update-group-id>
```

---

## User Stories

| ID | Story | SP |
|---|---|---|
| EP-17-US-01 | Play Console + App Store Connect app setup | 5 |
| EP-17-US-02 | EAS credentials configuration (Android + iOS) | 5 |
| EP-17-US-03 | Store assets: screenshots, descriptions, metadata | 8 |
| EP-17-US-04 | First internal test track release | 5 |
| EP-17-US-05 | First open beta / TestFlight release | 3 |
| EP-17-US-06 | First production release (staged) | 5 |
| EP-17-US-07 | OTA update for first hotfix | 3 |
| EP-17-US-08 | Release runbook document | 3 |

**Total:** 37 story points / 2 sprints

---

## Acceptance Criteria

- [ ] Vitana SMS app available on Play Store internal testing track.
- [ ] Vitana SMS app available on TestFlight internal testing.
- [ ] EAS production build succeeds without local keystore.
- [ ] Staged rollout visible in Play Console (10% → active).
- [ ] OTA update deployed and received by a test device within 5 minutes.
- [ ] App Store Connect app page complete (description, screenshots, privacy policy).
- [ ] App Review Notes document prevents iOS rejection for login requirement.
- [ ] Rollback OTA procedure tested in staging.

---

## Sprint Breakdown

| Sprint | Scope |
|---|---|
| Sprint 13 | Store setup + credentials + store assets + first internal build |
| Sprint 14 | First beta release + App Store submission + OTA hotfix test |
