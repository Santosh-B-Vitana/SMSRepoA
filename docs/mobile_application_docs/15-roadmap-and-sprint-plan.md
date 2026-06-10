# Vitana Mobile Platform — Roadmap & Sprint Plan

> **Classification:** Internal Architecture Document  
> **Version:** 1.0  
> **Date:** June 2026  
> **Related Docs:** [01-executive-summary](./01-executive-summary.md) · [14-epics-and-user-stories](./14-epics-and-user-stories.md) · [16-risk-analysis](./16-risk-analysis.md)

---

## 1. Phases Overview

| Phase | Months | Theme | Key Deliverable |
|---|---|---|---|
| Phase 1 — Foundation | 1–3 | Auth + Parent App + Fee Payment | Shared Vitana App beta with Parent App live |
| Phase 2 — Teacher & Student | 3–5 | Teacher Attendance + Student App + Push | Full beta for parents, teachers, and students |
| Phase 3 — White Label & Admin | 5–8 | White Label + Build Automation + Admin | First dedicated school app; Admin App live |
| Phase 4 — Advanced | 8–11 | Offline Sync + Advanced Features | Reliable offline; messaging; analytics |
| Phase 5 — Scale | 11–14 | Performance + 100+ Schools | Platform at scale |

---

## 2. Team Composition

| Role | Count | Phase Involved |
|---|---|---|
| Senior React Native Engineer (Lead) | 1 | All phases |
| React Native Engineer | 2 | All phases |
| Backend Engineer (mobile APIs) | 1 | Phases 1–3 |
| DevOps Engineer | 0.5 (shared) | Phases 2–5 |
| QA Engineer | 1 | Phases 2–5 |
| Product Owner / Manager | 0.5 (shared) | All phases |
| UI/UX Designer | 0.5 (shared) | Phases 1–3 |

---

## 3. Phase 1 — Foundation (Months 1–3, Sprints 1–6)

**Goal:** Launch the Shared Vitana App with a complete Parent App experience.

### Sprint 1 (Weeks 1–2)

| Task | Epic | Story Points |
|---|---|---|
| Monorepo setup: `mobile/` workspace + `packages/` | EP-02 | 5 |
| Expo Router skeleton: auth, parent, teacher, student, admin groups | EP-02 | 8 |
| API client with refresh interceptor | EP-02 | 5 |
| Zustand stores: auth, school | EP-02 | 3 |
| NativeWind + theme tokens | EP-02 | 3 |
| School domain entry screen (shared app) | EP-01 | 3 |
| **Total** | | **27** |

### Sprint 2 (Weeks 3–4)

| Task | Epic | Story Points |
|---|---|---|
| Login screen (credentials + branding) | EP-01 | 5 |
| Token refresh queue implementation | EP-01 | 3 |
| SecureStore wrapper + auth persistence | EP-01 | 3 |
| Role-based root layout + navigation guard | EP-02 | 5 |
| `GET /api/mobile/app-config` endpoint (backend) | EP-09 | 5 |
| Feature flag hook + FeatureGuard component | EP-09 | 3 |
| App version check + force update screen | EP-09 | 2 |
| **Total** | | **26** |

### Sprint 3 (Weeks 5–6)

| Task | Epic | Story Points |
|---|---|---|
| Parent dashboard screen + aggregation API (backend) | EP-03 | 8 |
| Child switcher (multi-child parents) | EP-03 | 5 |
| Child attendance view (today + monthly calendar) | EP-03 | 5 |
| Shared UI components: Card, Badge, Avatar, Button | EP-02 | 5 |
| FlashList student list component | EP-02 | 3 |
| **Total** | | **26** |

### Sprint 4 (Weeks 7–8)

| Task | Epic | Story Points |
|---|---|---|
| Fee summary screen | EP-07 | 5 |
| Cashfree mobile payment initiation (backend API) | EP-07 | 5 |
| Cashfree SDK integration on mobile | EP-07 | 8 |
| Fee payment receipt viewer | EP-07 | 3 |
| Payment history list | EP-07 | 3 |
| **Total** | | **24** |

### Sprint 5 (Weeks 9–10)

| Task | Epic | Story Points |
|---|---|---|
| Exam results list screen | EP-08 | 5 |
| Subject-wise marks breakdown | EP-08 | 3 |
| Report card PDF viewer (Expo WebBrowser) | EP-08 | 3 |
| Announcements feed (infinite scroll) | EP-03 | 5 |
| Diary view (class teacher entries) | EP-03 | 3 |
| Leave request form + status tracking | EP-03 | 3 |
| **Total** | | **22** |

### Sprint 6 (Weeks 11–12)

| Task | Epic | Story Points |
|---|---|---|
| Error states, loading skeletons throughout | EP-02 | 5 |
| Sentry crash reporting setup | EP-16 | 3 |
| Logout flow (SecureStore + cache clear) | EP-01 | 2 |
| Biometric unlock | EP-01 | 3 |
| QA: End-to-end parent app flows | — | 5 |
| Internal beta release (TestFlight + Play internal track) | EP-17 | 3 |
| Fix all critical bugs from beta | — | 5 |
| **Total** | | **26** |

**Phase 1 Milestone:** Shared Vitana App on TestFlight and Play Store internal testing with working Parent App (attendance, fees, results, announcements, diary).

---

## 4. Phase 2 — Teacher & Student (Months 3–5, Sprints 7–10)

### Sprint 7 (Weeks 13–14)

| Task | Epic | Story Points |
|---|---|---|
| Teacher dashboard + aggregation API (backend) | EP-04 | 8 |
| Today's timetable screen | EP-04 | 5 |
| Class student list (with search) | EP-04 | 5 |
| Attendance marking grid (bulk + individual) | EP-04 | 8 |
| **Total** | | **26** |

### Sprint 8 (Weeks 15–16)

| Task | Epic | Story Points |
|---|---|---|
| Attendance offline queue | EP-12 | 8 |
| SQLite student list cache | EP-12 | 5 |
| Connection banner + sync status indicator | EP-12 | 3 |
| Student leave approval (teacher) | EP-04 | 3 |
| Teacher leave application | EP-04 | 3 |
| **Total** | | **22** |

### Sprint 9 (Weeks 17–18)

| Task | Epic | Story Points |
|---|---|---|
| Student dashboard + aggregation API (backend) | EP-05 | 8 |
| Student timetable view | EP-05 | 3 |
| Student attendance summary + calendar | EP-05 | 3 |
| Student exam results + report card | EP-05 | 5 |
| Student assignments view + text submission | EP-05 | 8 |
| **Total** | | **27** |

### Sprint 10 (Weeks 19–20)

| Task | Epic | Story Points |
|---|---|---|
| FCM/APNS push notification setup | EP-06 | 5 |
| Device token registration API (backend + mobile) | EP-06 | 3 |
| Push delivery on key events: fee due, absent, result | EP-06 | 5 |
| Notification preferences screen | EP-06 | 3 |
| Deep link routing from notifications | EP-06 | 5 |
| Play Store + App Store open beta release | EP-17 | 3 |
| **Total** | | **24** |

**Phase 2 Milestone:** Shared Vitana App on open beta with Parent, Teacher, and Student apps complete.

---

## 5. Phase 3 — White Label & Admin (Months 5–8, Sprints 11–16)

### Sprint 11 (Weeks 21–22): White Label Foundation

| Task | Epic | Story Points |
|---|---|---|
| `app.config.js` dynamic config with `SCHOOL_ID` | EP-10 | 8 |
| `school-configs.json` registry + first school entry | EP-10 | 5 |
| `inject-school-config.js` asset downloader | EP-10 | 5 |
| EAS build profiles: preview, staging, production, school-production | EP-11 | 5 |
| Extended branding API (backend: logo, splash, colors) | EP-10 | 5 |
| **Total** | | **28** |

### Sprint 12 (Weeks 23–24): Build Automation & CI

| Task | Epic | Story Points |
|---|---|---|
| GitHub Actions: PR preview build workflow | EP-11 | 5 |
| GitHub Actions: staging build on develop merge | EP-11 | 3 |
| GitHub Actions: production release via tag | EP-11 | 5 |
| GitHub Actions: school app build workflow (manual dispatch) | EP-11 | 5 |
| OTA update workflow | EP-11 | 3 |
| Signing: EAS remote credentials setup for iOS + Android | EP-11 | 5 |
| **Total** | | **26** |

### Sprint 13 (Weeks 25–26): First School App

| Task | Epic | Story Points |
|---|---|---|
| Onboard pilot school into school-configs.json | EP-10 | 3 |
| Download + validate pilot school assets | EP-10 | 3 |
| Build pilot school app (Android + iOS) | EP-10 | 5 |
| Internal QA of pilot school app branding | — | 3 |
| Submit to Play Store internal + TestFlight | EP-17 | 3 |
| Runtime branding in shared app (post-login) | EP-10 | 5 |
| **Total** | | **22** |

### Sprint 14 (Weeks 27–28): Admin App

| Task | Epic | Story Points |
|---|---|---|
| Admin dashboard + aggregation API (backend) | EP-13 | 8 |
| Approve/reject staff leave from mobile | EP-13 | 3 |
| Create and post announcement | EP-13 | 5 |
| View KPI reports: attendance, fees | EP-13 | 5 |
| **Total** | | **21** |

### Sprint 15–16 (Weeks 29–32): Advanced Offline + Testing

| Task | Epic | Story Points |
|---|---|---|
| Offline marks entry (SQLite draft + queue) | EP-12 | 8 |
| Offline diary entry queue | EP-12 | 3 |
| Offline sync bundle endpoint (backend) | EP-12 | 5 |
| Conflict resolution UI | EP-12 | 5 |
| Comprehensive E2E testing (Maestro) | — | 8 |
| Performance profiling + optimization | — | 5 |
| First dedicated school app to production stores | EP-17 | 3 |
| **Total** | | **37** |

**Phase 3 Milestone:** First dedicated white-label school app live in stores. Admin App complete. Build automation fully operational.

---

## 6. Phase 4 — Advanced Features (Months 8–11, Sprints 17–22)

| Sprint | Feature | Epic |
|---|---|---|
| 17 | Teacher marks entry (online) + class performance analytics | EP-08, EP-14 |
| 18 | Create/manage assignments (teacher) + file submission (student) | EP-14, EP-05 |
| 19 | Direct messaging (teacher ↔ parent) | EP-15 |
| 20 | Advanced push: silent push, per-notification-type preferences | EP-06 |
| 21 | Document viewer (certificates, ID cards) + download | EP-05, EP-03 |
| 22 | Library view (issued books, due dates) + transport view | EP-03, EP-05 |

**Phase 4 Milestone:** Feature parity with web for all primary user journeys. 20+ schools on mobile platform.

---

## 7. Phase 5 — Scale & Optimize (Months 11–14, Sprints 23–28)

| Sprint | Feature | Focus |
|---|---|---|
| 23 | Amplitude analytics + event taxonomy | Engagement measurement |
| 24 | Performance: startup time < 1.5s (Hermes optimization) | Performance |
| 25 | 100-school rollout operations playbook | Scale |
| 26 | Advanced white label: font selection, dark mode theming | White label |
| 27 | Hindi language support (i18n framework) | Localization |
| 28 | WhatsApp integration: mobile admin trigger view | WhatsApp |

---

## 8. Complete Roadmap Timeline

```
2026
Jun: Sprint 1-2  — Foundation
Jul: Sprint 3-4  — Parent Dashboard + Fees
Aug: Sprint 5-6  — Results + Announcements + Beta Release
Sep: Sprint 7-8  — Teacher App + Offline Attendance
Oct: Sprint 9-10 — Student App + Push Notifications
Nov: Sprint 11-12 — White Label + CI/CD
Dec: Sprint 13-14 — First School App + Admin App

2027
Jan: Sprint 15-16 — Advanced Offline + Testing
Feb: Sprint 17-18 — Teacher Marks + Assignments
Mar: Sprint 19-20 — Messaging + Advanced Push
Apr: Sprint 21-22 — Documents + Library
May: Sprint 23-24 — Analytics + Performance
Jun: Sprint 25-26 — 100 Schools + Advanced White Label
Jul: Sprint 27-28 — Hindi + WhatsApp
```

---

## 9. Dependencies & Critical Path

```
EP-02 (Foundation)
    ├── EP-01 (Auth)
    │       └── EP-03 (Parent App)
    │               ├── EP-07 (Fees)
    │               └── EP-08 (Results)
    │
    ├── EP-04 (Teacher App)
    │       └── EP-12 (Offline)
    │
    ├── EP-05 (Student App)
    │
    └── EP-09 (Feature Flags)
            └── EP-10 (White Label)
                    └── EP-11 (Build Automation)
                            └── EP-17 (Deployment)
```

---

## 10. Definition of Done (Global)

Every sprint item is done when:
- [ ] Feature implemented in TypeScript, no `any` types
- [ ] Unit tests written for hooks and utilities (>80% coverage)
- [ ] Works on Android 9+ and iOS 16+
- [ ] Works on physical device (not just simulator)
- [ ] Offline behavior tested (airplane mode)
- [ ] Error states handled (network error, API 500, empty data)
- [ ] Loading states shown (skeleton screens)
- [ ] Accessibility: minimum touch target 44×44px, labels for screen readers
- [ ] No Sentry errors in staging build
- [ ] PR reviewed by at least one other engineer
- [ ] Linked Figma design approved (if screen-level change)

---

*Next: [16-risk-analysis.md](./16-risk-analysis.md)*
