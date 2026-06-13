# Store Privacy Declarations — Vitana SMS

> **Last Updated:** June 2026  
> **Source:** `docs/mobile_application_docs/12-deployment-strategy.md` §6

---

## Part A: Google Play Data Safety Form

Complete this questionnaire in Play Console → App Content → Data Safety.

### A.1 Does your app collect or share any of the required user data types?

**Yes**

### A.2 Is all of the user data collected by your app encrypted in transit?

**Yes** — all API communication uses TLS 1.2+

### A.3 Do you provide a way for users to request that their data is deleted?

**Yes** — users may contact `support@vitanasms.com` or request deletion via their school administrator.

---

### A.4 Data Types Collected

| Data Type | Collected | Shared | Purpose | Required |
|---|---|---|---|---|
| Name | ✅ Yes | ❌ No | School account — app functionality | Mandatory |
| Email address | ✅ Yes | ❌ No | School account login + notifications | Mandatory |
| Phone number | ✅ Yes | ❌ No | School account — contact | Optional |
| Financial transactions (fee records) | ✅ Yes | ✅ Cashfree (payment processor) | Fee payment processing | Mandatory when paying |
| Photos / videos | ✅ Yes (user-initiated) | ❌ No | Profile photo + student document uploads | Optional |
| Device or other identifiers (Firebase Instance ID) | ✅ Yes | ✅ Firebase (FCM) | Push notification delivery | Mandatory |
| App interactions | ✅ Yes | ✅ Analytics provider | App performance improvement | Mandatory |
| Crash logs | ✅ Yes | ✅ Sentry | Bug detection and fixing | Mandatory |
| Location | ❌ No | — | Not collected | — |
| Contacts | ❌ No | — | Not collected | — |
| Calendar | ❌ No | — | Not collected | — |
| SMS / call logs | ❌ No | — | Not collected | — |
| Health & fitness | ❌ No | — | Not collected | — |

---

### A.5 Third-Party Sharing Detail

| Recipient | Data Shared | Purpose |
|---|---|---|
| Cashfree Payments | Fee transaction details | Payment processing only; Cashfree privacy policy applies |
| Firebase (Google) | Firebase Instance ID | FCM push notification delivery |
| Sentry | Crash logs, app stack traces | Crash monitoring and debugging |
| Analytics provider (Amplitude) | App interaction events | Usage analytics, no PII shared |

**No data is sold or shared for advertising purposes.**

---

### A.6 Data Retention & Deletion

- User data is retained as long as the school's contract is active.
- On contract termination, all school data is deleted within 30 days.
- Users may request early deletion via `support@vitanasms.com`.

---

## Part B: Apple App Store Privacy Nutrition Label

Complete this in App Store Connect → App Privacy.

### B.1 Data Used to Track You

**None.** Vitana SMS does not track users across apps or websites for advertising.

---

### B.2 Data Linked to You

| Category | Type | Purpose |
|---|---|---|
| Contact Info | Email address | Account authentication, school communication |
| Contact Info | Name | School account, app display |
| Financial Info | Purchase history (fee payment records) | School fee records |
| Identifiers | Device ID (Firebase Instance ID) | Push notifications |
| Usage Data | Feature interaction events | App improvement analytics |
| Diagnostics | Crash data, performance data | Bug fixing via Sentry |

---

### B.3 Data Not Linked to You

**None** — all data collected is linked to the school account (which is linked to the user).

---

### B.4 App Privacy Policy

URL: **https://vitanasms.com/privacy**

This URL must:
- Return HTTP 200
- Be accessible from a mobile browser without login
- Describe all data types listed above
- Be updated whenever data practices change

**Validate before each App Store submission:**
```bash
curl -I https://vitanasms.com/privacy
# Expected: HTTP/2 200
```

---

## Notes for Store Reviewers

- This app handles institutional fee collections (parents paying school fees to their school). This is a B2B payment flow and does not involve the purchase of digital goods or App Store digital services. Apple IAP (guideline 3.1.1) does not apply — see App Store Review Guidelines 3.1.3(f).
- Fee payments are processed by Cashfree, a PCI-DSS compliant payment gateway regulated by the Reserve Bank of India.
