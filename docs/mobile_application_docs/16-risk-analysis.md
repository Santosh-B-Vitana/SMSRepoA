# Vitana Mobile Platform — Risk Analysis

> **Classification:** Internal Architecture Document  
> **Version:** 1.0  
> **Date:** June 2026  
> **Related Docs:** [15-roadmap-and-sprint-plan](./15-roadmap-and-sprint-plan.md) · [01-executive-summary](./01-executive-summary.md)

---

## Risk Matrix

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| R-01 | iOS App Store rejection | High | High | Critical | See R-01 mitigation |
| R-02 | Expo SDK breaking changes on upgrade | Medium | High | High | Pin SDK version; test before upgrade |
| R-03 | Cashfree mobile SDK integration issues | Medium | High | High | Build payment flow in Sprint 4 early |
| R-04 | Team React Native expertise gap | High | Medium | High | Hire/train before Sprint 1 |
| R-05 | API performance on mobile (latency) | Medium | Medium | Medium | Aggregation endpoints; CDN |
| R-06 | Indian network reliability | High | Medium | High | Offline-first architecture |
| R-07 | Google Play policy changes | Low | High | Medium | Monitor Play policy updates |
| R-08 | EAS pricing changes | Low | Medium | Low | Budget buffer; fallback to self-hosted |
| R-09 | School assets quality (icons) | High | Medium | Medium | Strict upload guidelines + processing pipeline |
| R-10 | OTA update adoption lag | Medium | Low | Low | Force update when critical |
| R-11 | Multi-tenancy data breach (wrong school data) | Low | Critical | High | Multiple server-side isolation layers |
| R-12 | Biometric auth on low-end devices | Medium | Low | Low | Fallback to PIN gracefully |
| R-13 | SQLite corruption on app crash | Low | High | Medium | Drizzle migrations; backup strategy |
| R-14 | FCM quota exceeded | Low | High | Medium | Monitor delivery rate; batch notifications |
| R-15 | Team size insufficient for 14-month roadmap | High | High | Critical | Hire to plan; use phased launch |

---

## Detailed Risk Mitigation

### R-01: iOS App Store Rejection

**Likelihood:** High — First-time submissions for institutional apps often face rejection.  
**Impact:** Delays Phase 1 launch by 1–4 weeks.

**Mitigation:**
1. Submit early — target TestFlight External Beta (requires review) in Sprint 6, 6 weeks before planned launch.
2. Maintain a permanently active demo school (`demo.vitanasms.com`) with demo credentials.
3. Draft App Review Notes covering: login requirement explanation, B2B payment explanation, institutional account model.
4. Join Apple Developer Forums to research similar educational app precedents.
5. Budget 2 revision submissions in the timeline (Sprint 6 + Sprint 7 buffer).

**Contingency:** Launch Android first (Play Store review is 1–3 days). iOS joins within 2 weeks.

---

### R-02: Expo SDK Breaking Changes

**Likelihood:** Medium — Expo releases major SDK every 6 months.  
**Impact:** Upgrade effort 1–2 sprints if native modules need updating.

**Mitigation:**
1. Pin to Expo SDK 52 for Phase 1–3.
2. Allocate 1 sprint per major SDK upgrade.
3. Follow Expo changelog and CHANGELOG migration guides.
4. All native modules selected must officially support New Architecture (Fabric/JSI).

---

### R-03: Cashfree Mobile SDK Integration

**Likelihood:** Medium — Cashfree's React Native SDK documentation is sparse.  
**Impact:** Fee payment — a Phase 1 P0 feature — blocked.

**Mitigation:**
1. Spike work in Sprint 3 (before Sprint 4 integration) to validate Cashfree RN SDK.
2. Fallback: use `expo-web-browser` to open Cashfree web checkout with deep-link return URL. This works without the native SDK.
3. Contact Cashfree developer support in Month 1 for RN integration guidance.

---

### R-04: Team React Native Expertise Gap

**Likelihood:** High — The current team is React/TypeScript (web) focused.  
**Impact:** Slower velocity in Sprints 1–4; architecture mistakes early.

**Mitigation:**
1. Hire 1 senior React Native engineer with Expo experience before Sprint 1.
2. Provide existing web engineers with Expo/RN training (Expo Docs + paid course) in Month 1.
3. Set architecture patterns (this document set) before code is written.
4. Code review by the senior RN engineer on all PRs in Sprints 1–4.

---

### R-05: API Latency on Mobile

**Likelihood:** Medium — On 4G Indian networks, API calls can take 500ms–2s.  
**Impact:** Poor UX, especially on the attendance marking screen with many students.

**Mitigation:**
1. Build aggregation endpoints (`/api/mobile/parent-dashboard`, etc.) to reduce API call count on dashboard load.
2. Use stale-while-revalidate (TanStack Query) — users see cached data instantly.
3. Pagination: 30 students per page on attendance list.
4. CloudFront CDN in front of the API for all GET requests to nearest AWS edge.
5. Skeleton screens — never show empty app while loading.

---

### R-06: Indian Network Reliability

**Likelihood:** High — Rural schools have 2G–3G. Even urban schools have classroom dead spots.  
**Impact:** App unusable in critical moments (attendance period, exam marks entry).

**Mitigation:**
1. Offline-first for all teacher write operations (attendance, marks, diary).
2. Offline sync bundle pre-downloaded at morning WiFi.
3. SQLite persistent cache for student lists and timetable.
4. Show connection state at all times (banner, icon).
5. All UI actions give immediate feedback (optimistic updates) regardless of connectivity.

---

### R-11: Multi-Tenancy Data Breach

**Likelihood:** Low — Multiple existing safeguards.  
**Impact:** Critical — GDPR equivalent violation, school trust destroyed.

**Mitigation (Defense in Depth):**
1. **JWT:** `schoolId` claim in every token.
2. **EF Core global filters:** Every query automatically filtered by `SchoolId`.
3. **SuperAdmin bypass:** Only available with `X-School-Override` header + `SuperAdmin` role.
4. **Database-per-tenant:** Even if query filter is bypassed, cross-school data is in a different database.
5. **CORS:** Only approved origins.
6. **Token validation:** `SchoolId` in token checked against `SchoolConfig` on every request.
7. **Mobile:** No cross-school data storage in SQLite (all rows tagged with `schoolId`, filtered on read).
8. **Penetration testing:** Schedule before 100-school launch (Phase 5).

---

### R-13: SQLite Corruption on App Crash

**Likelihood:** Low — expo-sqlite with Drizzle is stable.  
**Impact:** High — Loss of offline attendance queue data.

**Mitigation:**
1. Use WAL (Write-Ahead Logging) mode in SQLite (enabled by default in expo-sqlite v14).
2. Offline queue items are idempotent — server handles duplicate submissions gracefully.
3. Periodically export queue state to AsyncStorage as a secondary backup.
4. On SQLite open failure: re-create database, notify user to re-submit any pending items.

---

## Risk Register Summary

| Phase | Top Risks | Required Actions |
|---|---|---|
| Phase 1 | R-04 (team expertise), R-03 (Cashfree) | Hire RN engineer; Cashfree spike in Sprint 3 |
| Phase 2 | R-06 (offline reliability) | Invest heavily in offline architecture testing |
| Phase 3 | R-01 (iOS rejection), R-09 (school assets) | Early TestFlight submission; asset pipeline ready |
| Phase 4 | R-05 (API latency), R-14 (FCM quota) | Performance optimization sprint; FCM monitoring |
| Phase 5 | R-15 (team size), R-11 (security audit) | Scale team; penetration test before 100 schools |

---

*Next: See [epics/](./epics/) for detailed epic documents.*
