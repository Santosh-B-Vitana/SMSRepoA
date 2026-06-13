# Store Maintenance Schedule — Vitana SMS

> Owner: DevOps Engineer + Product Manager  
> Last Updated: June 2026

---

## Weekly Tasks

| Task | Tool / Location | Owner |
|---|---|---|
| Review Play Console Android Vitals (crash rate, ANR rate) | Play Console → Android Vitals | DevOps |
| Review Sentry mobile error digest | Sentry → Issues → Mobile | Engineering |
| Review Amplitude DAU / feature usage | Amplitude → Dashboard | Product |
| Respond to Play Store reviews < 3 stars (within 48h) | Play Console → Reviews | Product |
| Check Sentry for new unhandled errors | Sentry → Alerts | Engineering |

**Halt-rollout thresholds (check weekly):**
- Crash rate > 1% of sessions → halt staged rollout
- ANR rate > 0.5% → halt staged rollout
- 3 or more 1-star reviews mentioning data loss or payment issues → escalate

---

## Monthly Tasks

| Task | Tool / Location | Owner |
|---|---|---|
| Update screenshots if any screens changed significantly | `mobile/store-assets/*/screenshots/` + store consoles | Product |
| Review App Store reviews and respond | App Store Connect → Reviews | Product |
| Renew EAS credentials if expiring within 60 days | `eas credentials --platform android` + `--platform ios` | DevOps |
| Audit device push tokens — deactivate tokens inactive > 90 days | SQL query (see below) | Engineering |
| Verify demo school credentials still work | `curl` command (see below) | DevOps |
| Review Sentry DSN and quota usage | Sentry → Settings → Projects | DevOps |
| Check Amplitude retention trends | Amplitude → Retention | Product |

**Monthly push token audit query:**
```sql
SELECT COUNT(*) FROM MobileDeviceTokens
WHERE LastActiveAt < DATEADD(day, -90, GETUTCDATE());

-- Deactivate stale tokens:
UPDATE MobileDeviceTokens
SET IsActive = 0
WHERE LastActiveAt < DATEADD(day, -90, GETUTCDATE());
```

**Monthly demo school credentials check:**
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://api.vitanasms.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo.parent@demo.vitanasms.com","password":"Demo@12345"}'
# Expected: 200
```

---

## Per-Release Tasks

Complete before every store submission (major, minor, or patch):

| Task | Notes |
|---|---|
| Update "What's New" / Release Notes in both stores | Max 4000 chars (Play), max 4000 chars (App Store) |
| Update screenshots if any UI screens changed | Re-capture affected scenes; see `CHECKLIST.md` §1 |
| Verify demo school credentials work for all 4 roles | Parent, Teacher, Student, Admin |
| Update App Review Notes if login flow changed | Retrieve from 1Password; re-upload to App Store Connect |
| Check Privacy Policy URL returns HTTP 200 | `curl -I https://vitanasms.com/privacy` |
| Check Support URL returns HTTP 200 | `curl -I https://vitanasms.com/support` |
| Verify all store asset file sizes within limits | Android: 8 MB / screenshot; iOS: standard limits |
| Bump version in `mobile/package.json` | Follow semver: MAJOR.MINOR.PATCH |
| Verify EAS credentials not expiring within 30 days | `eas credentials` for both platforms |
| Run pre-submission testing matrix | See `mobile/RELEASE_RUNBOOK.md` §Pre-Release Checklist |

---

## Annual Tasks

| Task | Deadline | Owner |
|---|---|---|
| Renew Apple Developer Program membership | Before expiry ($99/year) | DevOps / Finance |
| Review and update Privacy Policy | January of each year | Legal / Product |
| Review store listing copy (features may have changed) | Q1 of each year | Product |
| Audit all third-party SDK dependencies for updates | Q1 of each year | Engineering |
| Review Android targetSdkVersion (Google mandates annual updates) | Before August each year | Engineering |
| Review iOS minimum version policy (Expo SDK requirements) | With each Expo SDK upgrade | Engineering |
| Renew Cashfree API credentials if applicable | Per Cashfree's renewal schedule | DevOps |

**Apple Developer Program renewal:**
```
Account: ops@vitanasms.com
Program: Apple Developer Program (Organisation)
Cost: $99 USD/year
Renewal: apple.com/developer/membership
```

**Android targetSdkVersion policy:**
- Google requires new apps and updates to target Android 14 (API 34) by August of each year.
- Check [Google Play target API requirements](https://developer.android.com/google/play/requirements/target-sdk).

---

## Emergency Contacts

| Issue | Contact |
|---|---|
| Apple App Store review rejection | support@developer.apple.com |
| Apple Developer account issues | developer.apple.com/support |
| Google Play policy violation | play-developer-support@google.com |
| Google Play Console billing | Google Play Console → Help |
| EAS build failure | support@expo.dev |
| Cashfree SDK issues | developer-support@cashfree.com |
| Sentry issues | sentry.io/support |

---

## Notification Channels

| Event | Channel |
|---|---|
| Production build complete or failed | `#mobile-builds` Slack |
| App Store approved / rejected | `ops@vitanasms.com` email + `#mobile-builds` |
| OTA update deployed | `#mobile-builds` Slack |
| Crash rate threshold exceeded | `#engineering` Slack (Sentry alert) |
