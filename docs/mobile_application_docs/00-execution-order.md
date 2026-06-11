# Vitana Mobile Platform — Execution Order

> **Classification:** Internal Architecture Document  
> **Version:** 1.0  
> **Date:** June 2026  
> **READ THIS FIRST before executing any prompt or epic.**  
> **Related Docs:** [README](./README.md) · [15-roadmap-and-sprint-plan](./15-roadmap-and-sprint-plan.md)

---

## Architecture Principle

> **ONE APP. MULTIPLE ROLES. ONE BINARY PER SCHOOL.**
>
> - There is ONE app binary (`com.vitana.sms`). All roles — parent, teacher, student, admin — share it. After login the JWT `role` routes the user to their portal inside the same binary.
> - "Parent App", "Teacher App", "Student App", "Admin App" in this document refer to the **portal** (route group) for that role. They are **not** separate apps.
> - White-label: one school = ONE branded binary. Not three.

## The One Rule

> **Never start a prompt if its listed prerequisites are not yet complete.**  
> The dependency graph is strict. Skipping dependencies causes architectural drift that compounds across every subsequent sprint.

---

## 1. Dependency Graph (Visual)

```
WEEK 1–2          WEEK 3–4          WEEK 5–6          WEEK 7–8
────────────────────────────────────────────────────────────────

MOBILE ENGINEER:
  [PROMPT-01]  ──────►  [PROMPT-02]  ──────►  [PROMPT-03a]  ──►  [PROMPT-03b]
  (Foundation)           (Auth)                (Parent                (Fees/
                                               Dashboard              Results)
                                               + Attendance)

BACKEND ENGINEER (parallel):
  [PROMPT-11a]  ─────►  [PROMPT-11b]  ─────►  [PROMPT-11c]  ──►  [PROMPT-11d]
  (app-config            (parent-               (teacher-           (student-
  endpoint)              dashboard)              dashboard)          dashboard)

WEEK 9–10             WEEK 11–14            WEEK 15–18
───────────────────────────────────────────────────────

MOBILE ENGINEER:
  [PROMPT-08]  ──►  [PROMPT-04]  ──►  [PROMPT-05]
  (Student App)     (Teacher App       (Push
                    + Offline)         Notifications)

WEEK 19–22            WEEK 23–26            WEEK 27–32
───────────────────────────────────────────────────────

  [PROMPT-10]  ──►  [PROMPT-06]  ──►  [PROMPT-09]  ──►  [PROMPT-12]
  (Feature           (White Label       (Admin App)        (Advanced
  Flags)             System)                               Offline)

  [PROMPT-07]  ──►  [PROMPT-16]
  (Build CI)         (Store Setup
                     + Deploy)

WEEK 33–40
───────────────────

  [PROMPT-13]  ──►  [PROMPT-14]  ──►  [PROMPT-15]
  (Exams +           (Messaging)        (Analytics +
  Marks Entry)                          Monitoring)
```

---

## 2. Linear Execution Order (Reference Card)

Execute in this exact order. Parallel tracks noted where applicable.

| # | Prompt | Epic(s) | Sprint | Track | Prerequisite Prompts |
|---|---|---|---|---|---|
| 1 | **PROMPT-01** | EP-02 | 1 | Mobile | None — start here |
| 2 | **PROMPT-11 (Part A)** | EP-09 backend | 2 | Backend | PROMPT-01 started |
| 3 | **PROMPT-02** | EP-01 | 2 | Mobile | PROMPT-01 ✓ |
| 4 | **PROMPT-11 (Part B)** | EP-03 backend | 3 | Backend | PROMPT-11A ✓ |
| 5 | **PROMPT-03** | EP-03, EP-07 | 3–6 | Mobile | PROMPT-01 ✓, PROMPT-02 ✓, PROMPT-11B ✓ |
| 6 | **PROMPT-08** | EP-05 | 7–8 | Mobile | PROMPT-01 ✓, PROMPT-02 ✓ |
| 7 | **PROMPT-11 (Part C)** | EP-04, EP-05 backend | 7 | Backend | PROMPT-11B ✓ |
| 8 | **PROMPT-04** | EP-04, EP-12 foundation | 7–8 | Mobile | PROMPT-01 ✓, PROMPT-02 ✓ |
| 9 | **PROMPT-10** | EP-09 mobile | 7–10 | Mobile | PROMPT-02 ✓, PROMPT-11A ✓ |
| 10 | **PROMPT-05** | EP-06 | 10 | Mobile + Backend | PROMPT-01 ✓, PROMPT-02 ✓ |
| 11 | **PROMPT-11 (Part D)** | Backend push + admin | 10 | Backend | PROMPT-11C ✓ |
| 12 | **PROMPT-06** ✅ | EP-10 | 11–13 | Mobile | PROMPT-01 ✓ — **Implemented June 2026** |
| 13 | **PROMPT-07** | EP-11 | 12 | DevOps | PROMPT-01 ✓, PROMPT-06 ✓ |
| 14 | **PROMPT-16** | EP-17 | 13–14 | DevOps | PROMPT-07 ✓ |
| 15 | **PROMPT-09** | EP-13 | 14 | Mobile | PROMPT-01 ✓, PROMPT-02 ✓, PROMPT-10 ✓ |
| 16 | **PROMPT-12** | EP-12 advanced | 12 & 15 | Mobile | PROMPT-04 ✓ |
| 17 | **PROMPT-13** | EP-08, EP-14 | 14 | Mobile | PROMPT-04 ✓, PROMPT-12 ✓ |
| 18 | **PROMPT-14** | EP-15 | 19–20 | Mobile | PROMPT-05 ✓ |
| 19 | **PROMPT-15** | EP-16 | 17–18 | Mobile | PROMPT-01 ✓ |

---

## 3. Epic Execution Order (by Phase)

### Phase 1 — Foundation (Months 1–3)

**Execute in this sequence. Each depends on the previous.**

```
Step 1:  EP-02  Mobile Foundation & Architecture
         → Sets up the entire technical skeleton
         → Nothing else can start without this

Step 2:  EP-01  Authentication & Authorization
         → Cannot build any screen without auth
         → Depends on EP-02

Step 3:  EP-09  Feature Flag Platform (backend portion)
         → App-config endpoint must be ready before any feature screen
         → Backend work can start in parallel with EP-01 mobile work
         → Depends on EP-02 (backend schema)

Step 4:  EP-07  Fee Module
         → Part of Parent App; Cashfree integration must be validated early
         → Depends on EP-01, EP-02

Step 5:  EP-03  Parent App — Core
         → Main Phase 1 deliverable
         → Depends on EP-01, EP-02, EP-07, EP-09
```

**Phase 1 Milestone:** Shared Vitana App on TestFlight + Play Store internal testing with Parent App.

---

### Phase 2 — Teacher, Student & Push (Months 3–5)

```
Step 6:  EP-05  Student App — Core
         → Depends on EP-01, EP-02

Step 7:  EP-04  Teacher App — Attendance & Timetable
         → Depends on EP-01, EP-02
         → Brings SQLite offline foundation (EP-12 foundational work)
         → EP-05 and EP-04 can run in PARALLEL (different engineers)

Step 8:  EP-12  Offline Sync Engine (foundational — in EP-04 scope)
         → SQLite setup done as part of EP-04/Sprint 8
         → Advanced offline (marks, diary, bundle) is Phase 3

Step 9:  EP-06  Push Notifications
         → Depends on EP-01, EP-02
         → Backend Firebase integration must be done
         → Can start after EP-03 is in beta (real use cases defined)
```

**Phase 2 Milestone:** Full beta for all three roles. Push notifications live.

---

### Phase 3 — White Label, Admin & Build Automation (Months 5–8)

```
Step 10: EP-09  Feature Flag Platform (mobile portion)
         → Dynamic navigation from flags
         → Depends on EP-01, backend app-config endpoint

Step 11: EP-10  White Label Architecture
         → Depends on EP-02, EP-09 (feature flags needed to know what to toggle)
         → app.config.js, school-configs.json, inject-school-config.js

Step 12: EP-11  Build Automation
         → Depends on EP-10 (white label config ready)
         → GitHub Actions workflows
         → DevOps work; runs in parallel with other mobile work

Step 13: EP-17  Deployment & Store Management
         → Depends on EP-11 (builds working)
         → First store submission

Step 14: EP-13  Admin App
         → Depends on EP-01, EP-02, EP-09
         → Independent of EP-10/EP-11 (can run in parallel)

Step 15: EP-12  Offline Sync Engine (advanced)
         → Marks drafts, diary queue, morning bundle
         → Depends on EP-04 (SQLite foundation)

Step 16: EP-16  Analytics & Observability
         → Can start any time after EP-01
         → Better to do after major features are in beta (more events to track)
```

**Phase 3 Milestone:** First dedicated white-label school app in stores. Admin App complete.

---

### Phase 4 — Advanced Features (Months 8–11)

```
Step 17: EP-08  Examinations & Results
Step 18: EP-14  Teacher Marks & Assignments
         → EP-08 and EP-14 are tightly linked (marks entry = examinations)
         → Depends on EP-04, EP-12 advanced

Step 19: EP-15  Communication & Messaging
         → Depends on EP-06 (push notifications required)

Step 20: EP-18  WhatsApp Integration
         → Depends on EP-06, EP-09
         → Lowest priority; slot after core features are stable
```

**Phase 4 Milestone:** Feature parity with web for all primary journeys.

---

### Phase 5 — Scale (Months 11–14)

```
Step 21: Performance optimization sprint
Step 22: Hindi/regional language support
Step 23: 100-school operations playbook
Step 24: Advanced white-label features
```

---

## 4. Parallel Tracks (Week-by-Week)

This is the most important section — shows what each engineer does simultaneously.

### WEEK 1–2 (Sprint 1)

| Engineer | Task | Prompt |
|---|---|---|
| **Mobile Lead** | Monorepo setup, Expo init, folder structure, API client | PROMPT-01 |
| **Mobile Eng 1** | `@vitana/shared-types` package | PROMPT-01 |
| **Mobile Eng 2** | `@vitana/shared-utils` + tests | PROMPT-01 |
| **Backend Eng** | Review API gap analysis; plan sprint 2 endpoints | PROMPT-11 (planning) |
| **DevOps** | Provision EAS account, Sentry project, Amplitude | Pre-work |

> All mobile engineers work on PROMPT-01. It's large enough to split.

---

### WEEK 3–4 (Sprint 2)

| Engineer | Task | Prompt |
|---|---|---|
| **Mobile Lead** | Login screen, token refresh queue, role routing | PROMPT-02 |
| **Mobile Eng 1** | SecureStore, biometric unlock, logout | PROMPT-02 |
| **Mobile Eng 2** | Maintenance/force-update screens, FeatureGuard | PROMPT-10 (partial) |
| **Backend Eng** | `GET /api/mobile/app-config` endpoint + Redis cache | PROMPT-11A |

> PROMPT-02 (auth) and PROMPT-11A (app-config backend) run in parallel.  
> Mobile cannot use app-config until backend delivers it. Mobile builds placeholder until then.

---

### WEEK 5–6 (Sprint 3)

| Engineer | Task | Prompt |
|---|---|---|
| **Mobile Lead** | Parent dashboard screen (with placeholder data) | PROMPT-03 |
| **Mobile Eng 1** | Child attendance calendar component | PROMPT-03 |
| **Mobile Eng 2** | Child switcher, shared Card/Badge/Avatar components | PROMPT-03 |
| **Backend Eng** | `GET /api/mobile/parent-dashboard` aggregation endpoint | PROMPT-11B |

> Mobile dashboard uses stub data until backend delivers the aggregation endpoint mid-sprint.

---

### WEEK 7–8 (Sprint 4)

| Engineer | Task | Prompt |
|---|---|---|
| **Mobile Lead** | Fee summary + Cashfree SDK integration | PROMPT-03 (fees) |
| **Mobile Eng 1** | Cashfree mobile initiate endpoint + verify | PROMPT-11 (Cashfree) |
| **Mobile Eng 2** | Payment receipt viewer + payment history | PROMPT-03 (fees) |
| **Backend Eng** | `POST /api/fees/payments/mobile-initiate` | PROMPT-11 (Part Cashfree) |

> Cashfree SDK spike should be done in Week 5 (Day 1 of Sprint 3) to validate feasibility.

---

### WEEK 9–10 (Sprint 5)

| Engineer | Task | Prompt |
|---|---|---|
| **Mobile Lead** | Exam results + report card viewer | PROMPT-03 (results) |
| **Mobile Eng 1** | Announcements infinite scroll + diary | PROMPT-03 (comms) |
| **Mobile Eng 2** | Leave application + leave status | PROMPT-03 (leaves) |
| **Backend Eng** | `GET /api/mobile/student-dashboard` endpoint | PROMPT-11C |

---

### WEEK 11–12 (Sprint 6)

| Engineer | Task | Prompt |
|---|---|---|
| **Mobile Lead** | QA, error states, skeleton screens (Parent App complete) | — |
| **Mobile Eng 1** | Student App: dashboard + timetable + results | PROMPT-08 |
| **Mobile Eng 2** | Internal beta release setup (TestFlight + Play internal) | PROMPT-16 (partial) |
| **Backend Eng** | `GET /api/mobile/teacher-dashboard` endpoint | PROMPT-11C |
| **QA** | End-to-end parent app testing | — |

---

### WEEK 13–14 (Sprint 7)

| Engineer | Task | Prompt |
|---|---|---|
| **Mobile Lead** | Teacher dashboard + timetable + class list | PROMPT-04 |
| **Mobile Eng 1** | Student assignments + text submission | PROMPT-08 |
| **Mobile Eng 2** | useFeatureFlag, dynamic navigation, FeatureGuard wiring | PROMPT-10 |
| **Backend Eng** | `GET /api/students?minimal=true` + teacher-dashboard | PROMPT-11C |

---

### WEEK 15–16 (Sprint 8)

| Engineer | Task | Prompt |
|---|---|---|
| **Mobile Lead** | **Offline attendance marking** (critical path) | PROMPT-04 |
| **Mobile Eng 1** | SQLite setup: schema, Drizzle ORM, WAL mode | PROMPT-04 |
| **Mobile Eng 2** | Sync engine + connection banner + queue processor | PROMPT-04 |
| **Backend Eng** | Idempotency key support on bulk attendance | PROMPT-11 |

> This sprint is the highest-risk sprint. Allocate senior engineer on offline attendance exclusively.

---

### WEEK 17–18 (Sprint 9)

| Engineer | Task | Prompt |
|---|---|---|
| **Mobile Lead** | Student App: attendance, fee summary (read-only), library | PROMPT-08 |
| **Mobile Eng 1** | Student leave application + offline queue | PROMPT-08 |
| **Mobile Eng 2** | Student assignment file upload | PROMPT-08 |
| **Backend Eng** | `POST /api/notifications/register-device` + preferences | PROMPT-11D |

---

### WEEK 19–20 (Sprint 10)

| Engineer | Task | Prompt |
|---|---|---|
| **Mobile Lead** | FCM/APNS setup + device registration | PROMPT-05 |
| **Mobile Eng 1** | Notification center + unread badge | PROMPT-05 |
| **Mobile Eng 2** | Deep link routing + notification preferences | PROMPT-05 |
| **Backend Eng** | Firebase Admin SDK + push delivery in NotificationService | PROMPT-11D |
| **DevOps** | Firebase project setup, secrets in EAS/GitHub | PROMPT-05 (pre-work) |

---

### WEEK 21–22 (Sprint 11)

| Engineer | Task | Prompt |
|---|---|---|
| **Mobile Lead** | `app.config.js` dynamic config + school-configs.json | PROMPT-06 |
| **Mobile Eng 1** | `inject-school-config.js` S3 asset downloader | PROMPT-06 |
| **Mobile Eng 2** | SchoolThemeProvider + AppHeader branding | PROMPT-06 |
| **Backend Eng** | Extended branding API `GET/PUT /api/mobile/branding` | PROMPT-06 |

---

### WEEK 23–24 (Sprint 12)

| Engineer | Task | Prompt |
|---|---|---|
| **Mobile Lead** | EAS build profiles + `eas.json` | PROMPT-07 |
| **Mobile Eng 1** | GitHub Actions: PR preview + staging workflows | PROMPT-07 |
| **DevOps** | GitHub Actions: production + OTA + school build | PROMPT-07 |
| **Mobile Eng 2** | Advanced offline: marks drafts + diary queue | PROMPT-12 |

---

### WEEK 25–26 (Sprint 13)

| Engineer | Task | Prompt |
|---|---|---|
| **Mobile Lead** | First dedicated school app build (pilot) | PROMPT-06 |
| **Mobile Eng 1** | Play Console + App Store listings + screenshots | PROMPT-16 |
| **DevOps** | EAS credentials + store submissions | PROMPT-16 |
| **Mobile Eng 2** | Offline morning bundle + DB maintenance | PROMPT-12 |
| **QA** | End-to-end all three role apps | — |

---

### WEEK 27–28 (Sprint 14)

| Engineer | Task | Prompt |
|---|---|---|
| **Mobile Lead** | Admin App dashboard + approvals | PROMPT-09 |
| **Mobile Eng 1** | Teacher marks entry grid + SQLite draft | PROMPT-13 |
| **Mobile Eng 2** | Conflict resolution UI + offline marks sync | PROMPT-12 |
| **Backend Eng** | `GET /api/mobile/admin-dashboard` + admin APIs | PROMPT-11D |

---

### WEEK 29–32 (Sprints 15–16)

| Engineer | Task | Prompt |
|---|---|---|
| **Mobile Lead** | Admin App analytics charts + announcements | PROMPT-09 |
| **Mobile Eng 1** | Teacher assignment create + grade submissions | PROMPT-13 |
| **Mobile Eng 2** | Sentry init + error boundaries | PROMPT-15 |
| **Backend Eng** | Results bulk submission + exam performance | PROMPT-13 |

---

### WEEK 33–38 (Sprints 17–19)

| Engineer | Task | Prompt |
|---|---|---|
| **Mobile Lead** | Amplitude event taxonomy + screen tracking | PROMPT-15 |
| **Mobile Eng 1** | Messaging: conversations + thread | PROMPT-14 |
| **Mobile Eng 2** | Source maps upload in CI + performance monitoring | PROMPT-15 |
| **Mobile Eng 1/2** | WhatsApp admin dashboard + opt-in settings | (EP-18, no dedicated prompt) |

---

## 5. Strict Dependency Rules

### PROMPT-01 must be first — always

Everything inherits from the foundation. No exceptions.

```
PROMPT-01
    └── All other prompts depend on this
```

### PROMPT-02 must be second — always

No authenticated screen can be built without auth working.

```
PROMPT-01 → PROMPT-02 → Everything else
```

### PROMPT-11 is a backend track — runs in parallel, not after

PROMPT-11 is for the backend engineer. It runs **simultaneously** with mobile prompts. The mobile engineer builds against placeholder/mock data until the backend endpoint is delivered.

```
Mobile: PROMPT-01 → PROMPT-02 → PROMPT-03 (with mocks) → (backend delivers) → PROMPT-03 (real data)
Backend:            PROMPT-11A   →   PROMPT-11B  →  PROMPT-11C  →  PROMPT-11D
```

### PROMPT-04 (offline) must complete before PROMPT-12 (advanced offline)

PROMPT-04 builds the SQLite schema and foundational queue. PROMPT-12 extends it.

```
PROMPT-04 → PROMPT-12
```

### PROMPT-05 (push) must complete before PROMPT-14 (messaging)

Messaging relies on push notifications for real-time delivery.

```
PROMPT-05 → PROMPT-14
```

### PROMPT-06 (white label) must complete before PROMPT-07 (build automation)

Build automation bakes in the white-label config at build time. The config system must exist first.

```
PROMPT-06 → PROMPT-07 → PROMPT-16
```

### PROMPT-04 must complete before PROMPT-13 (marks entry)

Marks entry uses the SQLite draft system built in PROMPT-04.

```
PROMPT-04 + PROMPT-12 → PROMPT-13
```

---

## 6. Critical Path

The critical path is the longest chain of sequential dependencies. Any delay on this path delays the entire project.

```
CRITICAL PATH:
PROMPT-01 (2w)
  → PROMPT-02 (2w)
    → PROMPT-03 (8w: 4 sprints)
      → PROMPT-08 (4w: 2 sprints)
        → PROMPT-04 (4w: 2 sprints — HIGHEST RISK)
          → PROMPT-05 (2w)
            → PROMPT-06 (4w)
              → PROMPT-07 (2w)
                → PROMPT-16 (2w)
                  → PROMPT-12 (4w: shared with PROMPT-09)
                    → PROMPT-13 (4w)
                      → PROMPT-14 (4w)
                        → PROMPT-15 (4w)

Total critical path: ~42 weeks (10.5 months)
```

**The riskiest point on the critical path: PROMPT-04 (Teacher offline attendance)**

This is the most complex mobile engineering task in Phase 1–2. If it slips:
- All offline-dependent features slip.
- The most important teacher feature (reliable attendance) is delayed.
- PROMPT-12 (advanced offline) cannot start.

**Mitigation:** Assign the most experienced mobile engineer to PROMPT-04. Start the offline architecture spike on Day 1 of Sprint 7.

---

## 7. Minimum Viable Product (MVP) Cutoff

If timelines compress, these are the **minimum prompts required for MVP launch**:

| Priority | Prompt | Why Required |
|---|---|---|
| **P0** | PROMPT-01 | Foundation |
| **P0** | PROMPT-02 | Auth |
| **P0** | PROMPT-03 | Parent App (core user journey) |
| **P0** | PROMPT-11A+B | Backend for parent dashboard + fees |
| **P0** | PROMPT-08 | Student App |
| **P0** | PROMPT-04 | Teacher attendance (offline) |
| **P0** | PROMPT-05 | Push notifications |
| **P1** | PROMPT-10 | Feature flags (needed for dynamic nav) |
| **P1** | PROMPT-07 | Build automation (needed for releases) |
| **P1** | PROMPT-16 | Store deployment |

**Minimum for first public release:** PROMPT-01 through PROMPT-05 + PROMPT-07 + PROMPT-16.  
**Estimated time to MVP:** 5–6 months with a 3-person mobile team.

---

## 8. What Each Role Owns

### Senior React Native Engineer (Lead)

Primary owner of:
1. PROMPT-01 — Foundation architecture decisions
2. PROMPT-02 — Auth security implementation
3. PROMPT-04 — Offline attendance (highest complexity)
4. PROMPT-06 — White-label system design

Reviews all other mobile PRs. Sets coding patterns in Sprint 1 that all engineers follow.

### React Native Engineer 1

Owns features deep in one persona:
1. PROMPT-03 — Parent App feature screens
2. PROMPT-08 — Student App feature screens
3. PROMPT-13 — Marks entry grid

### React Native Engineer 2

Owns cross-cutting infrastructure:
1. PROMPT-10 — Feature flags (affects all screens)
2. PROMPT-12 — Advanced offline sync
3. PROMPT-15 — Analytics and monitoring

### Backend Engineer

Owns PROMPT-11 entirely — all 10 missing mobile APIs in delivery order:

| Order | Endpoint | Needed By | Sprint |
|---|---|---|---|
| 1st | `GET /api/mobile/app-config` | PROMPT-02, 10 | Sprint 2 |
| 2nd | `GET /api/mobile/parent-dashboard` | PROMPT-03 | Sprint 3 |
| 3rd | `POST /api/fees/payments/mobile-initiate` | PROMPT-03 | Sprint 4 |
| 4th | `POST /api/fees/payments/verify` | PROMPT-03 | Sprint 4 |
| 5th | `GET /api/students?minimal=true` | PROMPT-04 | Sprint 7 |
| 6th | `GET /api/mobile/teacher-dashboard` | PROMPT-04 | Sprint 7 |
| 7th | `GET /api/mobile/student-dashboard` | PROMPT-08 | Sprint 9 |
| 8th | `POST /api/notifications/register-device` | PROMPT-05 | Sprint 10 |
| 9th | Firebase Admin SDK push delivery | PROMPT-05 | Sprint 10 |
| 10th | `GET /api/mobile/admin-dashboard` | PROMPT-09 | Sprint 14 |

### DevOps Engineer (part-time)

Pre-work before Sprint 1 starts:
- EAS account provisioned.
- Firebase project created.
- Sentry project created.
- Amplitude project created.
- Google Play Console developer account.
- Apple Developer Program enrolled.
- GitHub repository secrets configured.

Sprint 12: PROMPT-07 (GitHub Actions workflows).  
Sprint 13: PROMPT-16 (store submissions, credentials).

---

## 9. Sprint 1 Day-by-Day (Most Critical Week)

Getting Sprint 1 right sets the tone for everything.

### Day 1 (Monday)

- **Mobile Lead:** Create `mobile/` directory, initialize Expo SDK 52 with TypeScript template.
- **Mobile Eng 1:** Create `packages/shared-types/` with `package.json` and empty `src/`.
- **Mobile Eng 2:** Create `packages/shared-utils/` with `package.json`.
- **Backend:** Review `docs/mobile_application_docs/03-api-analysis.md` Section 4 (API gaps). Plan the 10 endpoints.
- **DevOps:** Create EAS project, Sentry project, add secrets to GitHub.

### Day 2–3

- **Mobile Lead:** Implement `src/api/client.ts` (Axios + interceptors). This is the most important file in the codebase.
- **Mobile Eng 1:** Define all types in `@vitana/shared-types`: `UserProfile`, `AppConfig`, `SchoolBranding`, `FeatureFlags`, `ApiResponse<T>`.
- **Mobile Eng 2:** Implement `@vitana/shared-utils`: `formatINR`, `formatDateIST`, `maskAadhaar`, `getAttendanceColor`.
- **Backend:** Begin `GET /api/mobile/app-config` endpoint.

### Day 4

- **Mobile Lead:** Implement `app/_layout.tsx` (root: auth guard + role routing).
- **Mobile Lead:** Implement `src/stores/authStore.ts` (Zustand + SecureStore).
- **Mobile Eng 1:** Update `pnpm-workspace.yaml`; verify `pnpm install` from root resolves.
- **Mobile Eng 2:** Configure NativeWind, `tailwind.config.js`, `metro.config.js`.

### Day 5 (Friday)

- **All mobile:** Integration test: `pnpm install` + `pnpm --filter @vitana/mobile start` → no errors.
- **All mobile:** `pnpm --filter @vitana/mobile tsc --noEmit` → 0 errors.
- **Sprint 1 demo:** Show Expo app booting to auth screen on Android emulator and iOS simulator.
- **Retrospective:** Note any API client or TypeScript pain points. Fix before Sprint 2.

---

## 10. "What Do I Execute Next?" Decision Tree

```
Am I starting fresh?
  → Yes → START with PROMPT-01

Is PROMPT-01 done?
  → No → Finish PROMPT-01 first
  → Yes → Continue below

Which role am I?
  ├── Mobile Engineer
  │     Is PROMPT-02 done?
  │       → No → Do PROMPT-02
  │       → Yes →
  │           Which phase?
  │           Phase 1 → PROMPT-03 (parent app)
  │           Phase 2 → PROMPT-04 or PROMPT-08 (parallel tracks)
  │           Phase 2 end → PROMPT-05 (push)
  │           Phase 3 → PROMPT-10, then PROMPT-06, then PROMPT-09
  │           Phase 3 → PROMPT-12 (if PROMPT-04 done)
  │           Phase 3 → PROMPT-07 (DevOps track)
  │           Phase 3 → PROMPT-16 (DevOps track)
  │           Phase 4 → PROMPT-13, PROMPT-14, PROMPT-15
  │
  ├── Backend Engineer
  │     → Execute PROMPT-11 in order: A → B → C → D
  │     → Deliver each endpoint by its "Needed By" sprint (table above)
  │
  └── DevOps Engineer
        → Pre-work: accounts + secrets (before Sprint 1)
        → Sprint 12: PROMPT-07 (CI/CD)
        → Sprint 13: PROMPT-16 (store deployment)
```

---

## 11. Handoff Points (Backend → Mobile)

These are the moments when backend delivers an endpoint and mobile unblocks.

| Handoff | Backend Delivers | Mobile Unblocks | Target Date |
|---|---|---|---|
| H-1 | `GET /api/mobile/app-config` | Feature flags, version check (PROMPT-10) | End Sprint 2 |
| H-2 | `GET /api/mobile/parent-dashboard` | Parent dashboard real data (PROMPT-03) | Mid Sprint 3 |
| H-3 | `POST /api/fees/payments/mobile-initiate` | Cashfree payment (PROMPT-03) | End Sprint 4 |
| H-4 | `GET /api/students?minimal=true` | Attendance student list (PROMPT-04) | Start Sprint 7 |
| H-5 | `GET /api/mobile/teacher-dashboard` | Teacher dashboard real data (PROMPT-04) | End Sprint 7 |
| H-6 | `GET /api/mobile/student-dashboard` | Student dashboard real data (PROMPT-08) | End Sprint 9 |
| H-7 | FCM push delivery + device registration | Push notifications (PROMPT-05) | End Sprint 10 |
| H-8 | `GET /api/mobile/admin-dashboard` | Admin dashboard real data (PROMPT-09) | End Sprint 14 |

**Until each handoff, mobile engineers use:**

```typescript
// Mock data pattern while backend endpoint is in progress
const { data } = useQuery({
  queryKey: ['parent-dashboard'],
  queryFn: () => {
    if (__DEV__ && !backendReady.parentDashboard) {
      return Promise.resolve(MOCK_PARENT_DASHBOARD);
    }
    return mobileApi.getParentDashboard();
  },
});
```

Keep all mocks in `mobile/src/__mocks__/` and remove them as each handoff completes.

---

## 12. Quick Reference Card (Print This)

```
╔══════════════════════════════════════════════════════════════╗
║         VITANA MOBILE — PROMPT EXECUTION ORDER              ║
╠══════════════════════════════════════════════════════════════╣
║  PHASE 1 (Months 1–3)  [Foundation + Parent App]           ║
║  Sprint 1:  PROMPT-01  (Foundation — ALL engineers)         ║
║  Sprint 2:  PROMPT-02  (Auth)  +  PROMPT-11A (BE: config)  ║
║  Sprint 3:  PROMPT-03  (Parent App start)                   ║
║             PROMPT-11B (BE: parent-dashboard)               ║
║  Sprint 4:  PROMPT-03  (Fees/Payment)                       ║
║             PROMPT-11  (BE: Cashfree mobile endpoint)       ║
║  Sprint 5:  PROMPT-03  (Results/Announcements)              ║
║  Sprint 6:  PROMPT-03  (QA + Beta release)                  ║
╠══════════════════════════════════════════════════════════════╣
║  PHASE 2 (Months 3–5)  [Teacher + Student + Push]           ║
║  Sprint 7:  PROMPT-04  (Teacher App start)                  ║
║             PROMPT-08  (Student App start) — PARALLEL       ║
║             PROMPT-10  (Feature Flags mobile)               ║
║             PROMPT-11C (BE: teacher/student dashboards)     ║
║  Sprint 8:  PROMPT-04  (Offline Attendance ← CRITICAL!)     ║
║  Sprint 9:  PROMPT-08  (Student App complete)               ║
║  Sprint 10: PROMPT-05  (Push Notifications)                 ║
║             PROMPT-11D (BE: Firebase + device tokens)       ║
╠══════════════════════════════════════════════════════════════╣
║  PHASE 3 (Months 5–8)  [White Label + Admin + Build CI]     ║
║  Sprint 11: PROMPT-06  (White Label System) ✅ June 2026    ║
║  Sprint 12: PROMPT-07  (Build Automation CI/CD)             ║
║             PROMPT-12  (Advanced Offline start)             ║
║  Sprint 13: PROMPT-16  (Store Setup + First Submission)     ║
║  Sprint 14: PROMPT-09  (Admin App) ✅ June 2026             ║
║             PROMPT-13  (Marks Entry start)                  ║
║  Sprint 15: PROMPT-12  (Advanced Offline complete)          ║
║             PROMPT-13  (Marks + Assignments complete)       ║
╠══════════════════════════════════════════════════════════════╣
║  PHASE 4 (Months 8–11)  [Advanced Features]                 ║
║  Sprint 17: PROMPT-15  (Analytics + Sentry)                 ║
║  Sprint 19: PROMPT-14  (Messaging)                          ║
╚══════════════════════════════════════════════════════════════╝
```

---

*This document is the authoritative execution order. When in doubt, check this file first.*

---

## Implementation Status Log

| Prompt | Epic | Status | Date |
|---|---|---|---|
| PROMPT-01 | EP-02 Foundation | ✅ Complete | Sprint 1 |
| PROMPT-02 | EP-01 Auth | ✅ Complete | Sprint 2 |
| PROMPT-03 | EP-03, EP-07 Parent App | ✅ Complete | Sprints 3–6 |
| PROMPT-08 | EP-05 Student App | ✅ Complete | Sprints 7–9 |
| PROMPT-04 | EP-04, EP-12 Teacher App + Offline | ✅ Complete | Sprints 7–8 |
| PROMPT-05 | EP-06 Push Notifications | ✅ Complete | Sprint 10 |
| PROMPT-10 | EP-09 Feature Flags | ✅ Complete | Sprints 7–10 |
| PROMPT-11 (A–D) | EP-09 Backend APIs | ✅ Complete | Sprints 2–10 |
| **PROMPT-06** | **EP-10 White Label Architecture** | **✅ Complete** | **June 2026 (Sprint 11)** |
| PROMPT-07 | EP-11 Build Automation | ⏳ Next | Sprint 12 |
| **PROMPT-09** | **EP-13 Admin App** | **✅ Complete** | **June 2026 (Sprint 14)** |
| PROMPT-12 | EP-12 Advanced Offline | ⏳ Pending | Sprints 12, 15 |
| PROMPT-13 | EP-08, EP-14 Exams + Marks | ⏳ Pending | Sprint 14 |
| PROMPT-14 | EP-15 Messaging | ⏳ Pending | Sprints 19–20 |
| PROMPT-15 | EP-16 Analytics + Monitoring | ⏳ Pending | Sprints 17–18 |
| PROMPT-16 | EP-17 Store Deployment | ⏳ Pending | Sprints 13–14 |
