# Store Asset Checklist — Vitana SMS

> Complete this checklist before every store submission.  
> Screenshot files live in `mobile/store-assets/android/screenshots/` and `mobile/store-assets/ios/screenshots/`.

---

## 1. Required Screenshots

Capture all screenshots using the **demo school** with the **demo parent account** (credentials in `app-review-notes.md`).

### Screenshot Scenes (6 required, same scenes for all platforms)

| # | Scene | Screen | Account |
|---|---|---|---|
| 1 | Parent Dashboard | Child card visible, attendance status green | Parent |
| 2 | Attendance Calendar | Monthly heatmap with color-coded days | Parent |
| 3 | Fee Summary | Outstanding balance + "Pay Online" button | Parent |
| 4 | Teacher Attendance Grid | Class 8A with 30 students, marking in progress | Teacher |
| 5 | Exam Results | Results list with grade badges | Student |
| 6 | Announcements Feed | School-wide announcements from admin | Parent or Student |

---

### 1.1 Android Screenshots

| Format | Dimensions | Min Size | Max File Size | Count | Directory |
|---|---|---|---|---|---|
| Phone | 1080 × 1920 px | — | 8 MB each | 6 | `android/screenshots/` |
| Feature Graphic | 1024 × 500 px | — | 1 MB | 1 | `android/` |

**Checklist:**
- [ ] `android/screenshots/01-parent-dashboard.png` — 1080×1920
- [ ] `android/screenshots/02-attendance-calendar.png` — 1080×1920
- [ ] `android/screenshots/03-fee-summary.png` — 1080×1920
- [ ] `android/screenshots/04-teacher-attendance.png` — 1080×1920
- [ ] `android/screenshots/05-exam-results.png` — 1080×1920
- [ ] `android/screenshots/06-announcements.png` — 1080×1920
- [ ] `android/feature-graphic.png` — 1024×500

> **Note:** Screenshot directories created (`android/screenshots/`, `ios/screenshots/iphone-6.7/`, `ios/screenshots/iphone-5.5/`, `ios/screenshots/ipad-13/`). PNG files pending capture on physical device with demo school.

**Verify dimensions:**
```bash
for f in mobile/store-assets/android/screenshots/*.png; do
  echo "$f: $(identify -format '%wx%h' "$f")"
done
```

---

### 1.2 iOS iPhone 6.7" Screenshots (iPhone 14/15 Pro Max — required)

| Format | Dimensions | Directory |
|---|---|---|
| iPhone 6.7" | 1290 × 2796 px | `ios/screenshots/iphone-6.7/` |

**Checklist:**
- [ ] `ios/screenshots/iphone-6.7/01-parent-dashboard.png` — 1290×2796
- [ ] `ios/screenshots/iphone-6.7/02-attendance-calendar.png` — 1290×2796
- [ ] `ios/screenshots/iphone-6.7/03-fee-summary.png` — 1290×2796
- [ ] `ios/screenshots/iphone-6.7/04-teacher-attendance.png` — 1290×2796
- [ ] `ios/screenshots/iphone-6.7/05-exam-results.png` — 1290×2796
- [ ] `ios/screenshots/iphone-6.7/06-announcements.png` — 1290×2796

---

### 1.3 iOS iPhone 5.5" Screenshots (iPhone 8 Plus — required)

| Format | Dimensions | Directory |
|---|---|---|
| iPhone 5.5" | 1242 × 2208 px | `ios/screenshots/iphone-5.5/` |

**Checklist:**
- [ ] `ios/screenshots/iphone-5.5/01-parent-dashboard.png` — 1242×2208
- [ ] `ios/screenshots/iphone-5.5/02-attendance-calendar.png` — 1242×2208
- [ ] `ios/screenshots/iphone-5.5/03-fee-summary.png` — 1242×2208
- [ ] `ios/screenshots/iphone-5.5/04-teacher-attendance.png` — 1242×2208
- [ ] `ios/screenshots/iphone-5.5/05-exam-results.png` — 1242×2208
- [ ] `ios/screenshots/iphone-5.5/06-announcements.png` — 1242×2208

---

### 1.4 iOS iPad 13" Pro Screenshots (required)

| Format | Dimensions | Directory |
|---|---|---|
| iPad 13" Pro | 2064 × 2752 px | `ios/screenshots/ipad-13/` |

**Checklist (minimum 3):**
- [ ] `ios/screenshots/ipad-13/01-parent-dashboard.png` — 2064×2752
- [ ] `ios/screenshots/ipad-13/02-attendance-calendar.png` — 2064×2752
- [ ] `ios/screenshots/ipad-13/03-teacher-attendance.png` — 2064×2752

---

## 2. App Icons

| Platform | Specification | Location | Status |
|---|---|---|---|
| Android (Play Console) | 512 × 512 PNG, ≤ 1 MB, no alpha, no rounded corners | Upload directly in Play Console | - [ ] |
| iOS (App Store Connect) | 1024 × 1024 PNG, no alpha channel, no rounded corners | `mobile/app.config.js` → icon field; EAS builds it | - [x] Source icon present in `assets/school-assets/vitana/` |

**Source icons are in:** `mobile/assets/school-assets/vitana/`

```bash
# Verify icon dimensions and no alpha
file mobile/assets/school-assets/vitana/app-icon-1024.png
identify -format '%wx%h %[channels]' mobile/assets/school-assets/vitana/app-icon-1024.png
# Expected: 1024x1024 rgb (no alpha)
```

---

## 3. Play Console Checklist

Complete these steps in the [Play Console](https://play.google.com/console):

### App Setup
- [ ] App created: "Vitana SMS"
- [ ] Package name set: `com.vitana.sms`
- [ ] Developer account: Vitana Technologies Pvt. Ltd.

### Store Listing
- [ ] App name filled: `Vitana SMS — School App`
- [x] Short description text ready — see `descriptions/play-store.md`
- [x] Full description text ready — see `descriptions/play-store.md`
- [ ] Category selected: Education
- [ ] Contact email: `support@vitanasms.com`
- [ ] Privacy policy URL: `https://vitanasms.com/privacy` (verify returns 200)
- [ ] Phone screenshots uploaded (6 × 1080×1920)
- [ ] Feature graphic uploaded (1024×500)
- [ ] App icon uploaded (512×512)

### Content Rating
- [ ] IARC questionnaire completed
- [ ] Rating: Everyone (no violence, no adult themes)
- [ ] Target audience: 13+ confirmed

### Data Safety
- [x] Data safety answers documented — see `data-safety.md`
- [ ] Data safety section submitted in Play Console
- [x] Third-party SDKs documented (Cashfree, Firebase, Sentry, Amplitude)
- [x] Data encryption: Yes
- [x] Deletion mechanism: Yes (via support@vitanasms.com)

### Release Track
- [ ] Internal testing track created
- [ ] First AAB uploaded (`eas submit --platform android`)
- [ ] At least 1 tester added to internal track
- [ ] Build installable on physical Android device (API 28+)

---

## 4. App Store Connect Checklist

Complete these steps in [App Store Connect](https://appstoreconnect.apple.com):

### App Setup
- [ ] App created: "Vitana SMS"
- [ ] Bundle ID: `com.vitana.sms`
- [ ] SKU: `vitana-sms-001`
- [ ] Apple Team ID set in EAS secrets (`APPLE_TEAM_ID`)
- [ ] ASC App ID set in EAS secrets (`ASC_APP_ID`) — found in App Store Connect → App → General → Apple ID

### App Metadata
- [ ] App name filled: `Vitana SMS`
- [ ] Subtitle filled: `School Management App`
- [x] Description text ready — see `descriptions/app-store.md`
- [x] Keywords text ready — see `descriptions/app-store.md`
- [ ] What's New filled for version 1.0.0
- [ ] Support URL: `https://vitanasms.com/support`
- [ ] Marketing URL: `https://vitanasms.com`
- [ ] Privacy Policy URL: `https://vitanasms.com/privacy`

### Age Rating
- [ ] Age rating questionnaire completed: 4+
- [ ] No content advisories flagged

### Privacy Nutrition Label
- [x] Contact Info (email, name) documented — see `data-safety.md`
- [x] Financial Info documented
- [x] Identifiers (device ID) documented
- [x] Usage Data documented
- [x] Diagnostics documented
- [ ] Privacy nutrition label submitted in App Store Connect
- [x] "Data Not Used to Track You" confirmed

### Screenshots
- [ ] iPhone 6.7" screenshots uploaded (6 × 1290×2796)
- [ ] iPhone 5.5" screenshots uploaded (6 × 1242×2208)
- [ ] iPad 13" screenshots uploaded (3 × 2064×2752)

### App Review Information
- [ ] App Review Notes uploaded (from `app-review-notes.md` in 1Password)
- [ ] Demo account credentials entered in App Review section
- [x] Notes explain institutional login model — documented in `app-review-notes.md` template
- [x] Notes explain Cashfree B2B fee collection — documented in `app-review-notes.md` template

### TestFlight
- [ ] Internal TestFlight group created: "Vitana Team"
- [ ] First IPA uploaded (`eas submit --platform ios`)
- [ ] Build available in internal TestFlight (no Apple review required)

---

## 5. Pre-Submission Validation Commands

```bash
# Verify privacy policy URL returns 200
curl -I https://vitanasms.com/privacy

# Verify support URL returns 200
curl -I https://vitanasms.com/support

# Verify demo server is up
curl -X POST https://api.vitanasms.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo.parent@demo.vitanasms.com","password":"Demo@12345"}'
# Must return 200 with token

# Check EAS credentials are valid
eas credentials --platform android
eas credentials --platform ios

# Verify screenshot dimensions (requires ImageMagick)
for f in mobile/store-assets/android/screenshots/*.png; do
  echo "$f: $(identify -format '%wx%h' "$f")"
done
```

---

## 6. Test & CI Infrastructure Status

> Updated June 2026 — reflects actual state of the repository.

| Item | Status |
|---|---|
| TypeScript check — 0 errors | ✅ PASS |
| ESLint — 0 warnings | ✅ PASS |
| Jest unit tests (10 test files, ~65 tests) | ✅ Written |
| Coverage thresholds (60% lines/fn/stmt, 50% branch) | ✅ Configured in `package.json` |
| Maestro E2E tests (16 YAML flows) | ✅ Written (device required to run) |
| Smoke test script (`scripts/smoke-test.sh`) | ✅ Created |
| Backend smoke script (`scripts/backend-smoke.sh`) | ✅ Created |
| CI coverage gate in `mobile-checks.yml` | ✅ Added |
| TEST_CASES.md — 113 detailed test cases | ✅ Created |
