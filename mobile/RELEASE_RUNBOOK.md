# Vitana Mobile — Release Runbook

> **Version:** 1.0  
> **Last Updated:** June 2026  
> **Owner:** DevOps Engineer  
> **Reviewers:** Engineering Lead, Product Manager  
> **Related docs:** `store-assets/CHECKLIST.md` · `store-assets/MAINTENANCE_SCHEDULE.md` · `docs/deployment.md`

---

## Pre-Release Checklist (T-7 Days Before Release)

Complete every item before creating the release tag.

| # | Task | Owner | Done |
|---|---|---|---|
| 1 | Feature freeze — no new PRs merged to `develop` | Engineering Lead | - [ ] |
| 2 | Staging build installed and tested by QA team | QA | - [ ] |
| 3 | All critical bugs from staging resolved via OTA or PR | Engineering | - [ ] |
| 4 | Demo school credentials verified — all 4 roles log in successfully | DevOps | - [ ] |
| 5 | App Review Notes updated if login flow changed | DevOps | - [ ] |
| 6 | Store listing screenshots updated if any screens changed | Product | - [ ] |
| 7 | `CHANGELOG.md` updated with new features and fixes | Engineering | - [ ] |
| 8 | Version bumped in `mobile/package.json` (MAJOR.MINOR.PATCH) | Engineering | - [ ] |
| 9 | `EXPO_PUBLIC_SENTRY_DSN` set in EAS secrets | DevOps | - [ ] |
| 10 | EAS credentials valid with > 30 days remaining | DevOps | - [ ] |
| 11 | Privacy policy URL returns HTTP 200 | DevOps | - [ ] |

**Credential verification commands:**
```bash
# Verify demo credentials (all 4 roles)
for user in demo.parent demo.teacher demo.student demo.admin; do
  echo -n "Testing $user@demo.vitanasms.com: "
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://api.vitanasms.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$user@demo.vitanasms.com\",\"password\":\"Demo@12345\"}"
done
# All should return 200

# Check EAS credentials expiry
eas credentials --platform android
eas credentials --platform ios
```

---

## Release Steps

### Step 1: Create Release Tag

```bash
# From develop branch, after pre-release checklist is complete
git checkout develop
git pull origin develop
git tag mobile-v{MAJOR.MINOR.PATCH}
git push origin mobile-v{MAJOR.MINOR.PATCH}
```

**Example:**
```bash
git tag mobile-v1.0.0
git push origin mobile-v1.0.0
```

This triggers the `mobile-eas-production.yml` workflow automatically.

---

### Step 2: Approve Production Workflow

1. Navigate to: **GitHub → Actions → Mobile Production Release**
2. Click the paused workflow run
3. Click **"Review deployments"**
4. Select the `mobile-production` environment
5. Click **"Approve and deploy"**

The build requires at least one reviewer with write access. Tag the Engineering Lead in Slack `#mobile-builds` to approve.

---

### Step 3: Monitor Build

- **EAS Dashboard:** `expo.dev/accounts/vitana/projects/vitana-sms/builds`
- **GitHub Actions:** Repository → Actions tab → current workflow run
- **Slack:** `#mobile-builds` (automated notifications on start, success, and failure)

Expected build times:
- Android (AAB): 15–20 minutes
- iOS (IPA): 20–30 minutes

If the build fails, check the EAS logs. Common causes:
- EAS credentials expired → run `eas credentials` to renew
- Missing GitHub secret → check repository secrets
- TypeScript errors → run `pnpm typecheck` locally first

---

### Step 4: Internal Testing (1–2 Days)

After the build completes, `eas submit` automatically uploads to internal testing tracks.

**Android:**
- Play Console → `Vitana SMS` → Testing → Internal Testing → View release
- Share the Internal Testing opt-in link with the Vitana team (up to 100 testers)
- Confirm: app installs on Android 9+ physical device

**iOS:**
- App Store Connect → TestFlight → Internal Testing
- Invite internal testers (Vitana team, up to 100)
- Confirm: TestFlight app shows new build; installs on iPhone (iOS 16+)

**Internal QA Sign-Off Criteria:**
- [ ] Parent, Teacher, Student, Admin login all work
- [ ] Attendance marking works (online and offline)
- [ ] Fee payment sandbox completes successfully
- [ ] Push notification received on physical device
- [ ] No crash on first launch (cold start)
- [ ] Force-update screen shows correctly for deliberately old build
- [ ] Biometric unlock works

---

### Step 5: Promote to Beta (Optional — Major Releases Only)

For significant new feature sets (MINOR or MAJOR version bumps):

**Android:**
- Play Console → Internal Testing → promote to **Closed Testing**
- Add 20 external testers (school pilot group)
- Wait 3–5 days for beta feedback

**iOS:**
- App Store Connect → TestFlight → **External Groups**
- Submit for External TestFlight (Apple review: ~24 hours)
- Once approved: release to up to 50 external testers

---

### Step 6: Production Release

#### Android (Play Store)

1. Play Console → `Vitana SMS` → Production → **Create new release**
2. Select the AAB from Internal Testing (same build — do not rebuild)
3. Fill "What's new" release notes
4. Set rollout percentage: **10%**
5. Click **"Start rollout to Production"**
6. Monitor for 24 hours

**Staged rollout advancement schedule:**

| Day | Percentage | Condition |
|---|---|---|
| Day 0 | 10% | Release started |
| Day 1 | 25% | Crash rate < 1%, ANR rate < 0.5%, no critical reviews |
| Day 3 | 50% | All day-1 criteria still met |
| Day 5 | 100% | All criteria met |

**To advance the rollout:**
Play Console → Production → Edit release → Update rollout % → Save → Confirm

#### iOS (App Store)

1. App Store Connect → `Vitana SMS` → **+ Version or Platform**
2. Select the build from TestFlight
3. Fill all metadata: What's New, screenshots (if updated)
4. Upload App Review Notes (from 1Password: "Vitana SMS App Review Notes")
5. Enable **Phased Release** checkbox
6. Click **"Submit for Review"**

Apple review typically takes 1–7 days. Expedited review available for critical issues (link below).

**After approval:**
- App Store Connect → Resolution Center → Phased Release Day 1 begins automatically at 1%
- Monitor Sentry and App Store ratings daily
- Advance or pause phased release manually in App Store Connect

---

## Halt Criteria (Stop Rollout Immediately)

Monitor these metrics during any rollout. If any threshold is breached, **halt immediately**.

| Metric | Normal | Halt Threshold |
|---|---|---|
| Crash rate (Sentry) | < 0.2% of sessions | ≥ 1% of sessions |
| ANR rate (Play Console) | < 0.2% | ≥ 0.5% |
| 1-star reviews | None | 3+ mentioning data loss or payment failure |
| Backend error rate | < 0.5% on mobile endpoints | Spike correlated with new version |
| Authentication failures | < 1% | > 5% (possible breaking API change) |

**Android: Halt rollout**
Play Console → Production → Edit release → **"Halt rollout"**

**iOS: Pause phased release**
App Store Connect → `Vitana SMS` → App Store → Version → **"Pause Phased Release"**

---

## Emergency Hotfix Decision Tree

```
Bug discovered in production
            │
            ▼
    Is the bug JS/TS only?
    (No native code, no new permissions,
     no SDK changes, no binary changes)
            │
    ┌───────┴───────┐
   YES              NO
    │                │
    ▼                ▼
 OTA Hotfix      Binary Hotfix
 (< 30 min)      (store review required)
```

### OTA Hotfix Path (JS-only — < 30 minutes total)

1. Create hotfix branch from `main`:
   ```bash
   git checkout main && git pull
   git checkout -b hotfix/describe-the-fix
   ```
2. Apply fix, write minimal test if possible
3. Open PR — require **2 reviewer approvals** (fast-track review)
4. Merge to `main`
5. Trigger OTA update:
   - GitHub → Actions → **Deploy OTA Update** (`mobile-ota-update.yml`)
   - Input: `channel=production`, `message="Fix: <description>"`
   - Platform: `all` (or specific platform if needed)
6. Monitor Sentry for 30 minutes
7. Confirm fix in production; close incident

### Binary Hotfix Path (requires native change)

1. Create hotfix branch from `main`
2. Apply fix, open PR, merge after review
3. Tag:
   ```bash
   git tag mobile-v{version}-hotfix-{n}
   git push origin mobile-v{version}-hotfix-{n}
   ```
4. Approve production workflow (Step 2 above)
5. After build:
   - Android: submit to Play Console internal → immediate push to production (100%)
   - iOS: submit for review → request **Expedited Review**:
     App Store Connect → Resolution Center → **"Request Expedited Review"**
     Reason: "Critical bug affecting user data / payment"

---

## Rollback Procedures

### OTA Rollback (< 5 minutes)

```bash
cd mobile

# Rollback to embedded bundle (removes all OTA updates):
./scripts/ota-rollback.sh production

# Rollback to a specific previous update group:
eas update:list --channel production --limit 5   # find the previous group ID
./scripts/ota-rollback.sh production <group-id>

# Staging rollback (test here first):
./scripts/ota-rollback.sh staging
```

### Android Store Rollback

OTA rollback should be sufficient for JS-only issues. For a broken binary:

1. Play Console → `Vitana SMS` → Production → **"Halt rollout"**
   - Rollout stops at current percentage; existing installs keep the broken version
   - No new devices receive the broken build
2. Prepare a patched version:
   - Apply fix → tag → approve workflow → submit new build to internal → promote to production
3. Or: promote the **previous build** from internal testing (if it was not deleted)

### iOS Store Rollback

iOS does not allow removing a live build from users who already downloaded it.

1. App Store Connect → `Vitana SMS` → **"Pause Phased Release"**
   - Stops new downloads from receiving the broken version
2. Existing installs will not be auto-updated further
3. Prepare a patched version and submit for expedited review

### Emergency Contacts for Store Issues

| Issue | Contact |
|---|---|
| Apple App Store — expedited review | App Store Connect → Resolution Center → "Request Expedited Review" |
| Apple Developer account lockout | developer.apple.com/contact |
| Google Play — policy issue | play-developer-support@google.com |
| EAS build failure | support@expo.dev |

---

## Version Numbering

Format: `MAJOR.MINOR.PATCH`

| Increment | When |
|---|---|
| **MAJOR** | Breaking architecture change, major redesign, new app platform |
| **MINOR** | New feature module (e.g., Messaging, Analytics), new role app |
| **PATCH** | Bug fixes, text changes, small UI tweaks (OTA-eligible first; store build if binary required) |

Build number (`versionCode` / `buildNumber`) is auto-incremented by EAS on every production build.

**Files to update before tagging:**
```bash
# Bump version in package.json
# Then verify:
cat mobile/package.json | grep '"version"'
```

---

## Notification Channels

| Event | Channel |
|---|---|
| Build started (production) | `#mobile-builds` Slack (automatic) |
| Build complete / failed | `#mobile-builds` Slack (automatic) |
| OTA update deployed | `#mobile-builds` Slack (automatic) |
| App Store approved / rejected | `ops@vitanasms.com` + `#mobile-builds` |
| Production rollout advanced (25%, 50%, 100%) | `#engineering` Slack (manual update by DevOps) |
| Crash rate threshold breached | `#engineering` Slack (Sentry alert) |

---

## Contacts

| Role | Person | Contact |
|---|---|---|
| Engineering Lead | TBD | Slack DM |
| DevOps Owner | TBD | Slack DM |
| Product Manager | TBD | Slack DM |
| Apple App Store Support | — | support@developer.apple.com |
| Google Play Support | — | play-developer-support@google.com |
| EAS Support | — | support@expo.dev |
| Cashfree SDK Support | — | developer-support@cashfree.com |
