# Vitana Mobile Platform — Executive Summary

> **Classification:** Internal Architecture Document  
> **Version:** 1.0  
> **Date:** June 2026  
> **Author:** Platform Architecture Team  
> **Related Docs:** [02-erp-analysis](./02-erp-analysis.md) · [06-mobile-architecture](./06-mobile-architecture.md) · [15-roadmap-and-sprint-plan](./15-roadmap-and-sprint-plan.md)

---

## 1. Vision

Vitana SMS is a production-grade School ERP serving Indian K-12 schools. The web platform is mature, feature-complete, and deployed across multiple schools. The next strategic phase is to extend Vitana into a world-class mobile platform that:

- Puts school management in the hands of parents, students, teachers, and administrators wherever they are.
- Enables Vitana to offer white-label dedicated school apps as a premium tier, allowing schools to have their own branded app on the Play Store and App Store.
- Provides a shared Vitana app as an immediate go-to-market vehicle for all existing schools.
- Scales to 1,000+ schools from a single React Native codebase.

---

## 2. Strategic Objectives

| Objective | Detail |
|---|---|
| **Immediate Value Delivery** | Launch a Shared Vitana App covering Parent, Student, and Teacher experiences within 4–6 months. |
| **Premium Tier Revenue** | Enable dedicated white-label school apps as a paid-tier offering, dramatically increasing ARPU. |
| **Engagement** | Push notifications, offline-first design, and mobile-native UX increase daily active engagement vs. the web. |
| **Operational Scale** | Build automation to generate and deploy new school apps with minimal manual effort — target: new school app deployable in under 1 business day. |
| **Platform Stickiness** | A school's own branded app on their parents' phones creates deep brand loyalty and switching cost. |

---

## 3. Platform Architecture in One Paragraph

A single React Native (Expo) codebase drives all Vitana mobile experiences. A `SchoolContext` loaded at boot determines whether the app runs in **Shared Vitana Mode** (white logo, multi-school login) or **Dedicated School Mode** (school logo, school colors, single-school login). Feature flags fetched from the backend control which modules are visible per school, per role, and per plan. Build automation using Expo EAS + GitHub Actions injects school-specific assets and configuration at build time to produce dedicated store apps. OTA updates via Expo EAS Update deliver non-binary changes to all users within minutes. The mobile API layer is the existing ASP.NET Core 8 backend — no separate mobile backend is required.

---

## 4. Technology Choices (Summary)

| Decision | Choice | Rationale |
|---|---|---|
| **Mobile Framework** | React Native + Expo SDK 52 | Shared web knowledge (React 19), fastest time-to-market, best-in-class OTA, large hiring pool |
| **Navigation** | Expo Router v4 (file-based) | Seamless deep linking, URL-based routing mirrors web structure |
| **State** | TanStack Query v5 + Zustand | Mirrors existing web stack; TQ handles server state, Zustand handles local UI state |
| **Styling** | NativeWind v4 (Tailwind → RN StyleSheet) | Mirrors web Tailwind codebase; tokens shareable |
| **Build Automation** | Expo EAS Build + GitHub Actions | Managed infrastructure, no Mac required for iOS builds |
| **OTA Updates** | Expo EAS Update | Deploy JS bundle changes without store review |
| **Repository** | Monorepo — `mobile/` directory in existing SMSRepoA | Shared types, shared domain logic, unified CI |

---

## 5. Mobile App Types

### 5.1 Shared Vitana App (`com.vitana.sms`)

- Available immediately on Play Store and App Store.
- Multi-school: users enter their school domain or school code on login.
- Branding: Vitana brand. School logo shown post-login in header only.
- Features: all modules enabled (gated by per-school feature flags at runtime).
- Target: all existing schools from day one.

### 5.2 Dedicated School App (`com.schoolname.sms`)

- Separate store listing per school under Vitana's developer accounts (initially) or school's own account.
- Branding: school logo, colors, app icon, splash screen fully customized.
- App hardcoded to one school domain — no school-selection screen.
- Generated from the same codebase via EAS build profiles + school config injection.
- Target: premium tier schools paying for white-label.

---

## 6. User Personas & App Scope

| Persona | Daily Jobs | Mobile Priority |
|---|---|---|
| **Parent** | Check attendance, pay fees, read announcements, view results, message teacher | P0 — highest volume, highest engagement |
| **Student** | View timetable, check results, submit assignments, view homework | P0 — students use phones exclusively |
| **Teacher / Staff** | Mark attendance, enter marks, view timetable, manage leaves, announcements | P1 — saves significant classroom time |
| **Admin / Principal** | Approvals, reports, announcements, key KPIs | P2 — executive dashboard on mobile |
| **Super Admin** | School health monitoring, billing status | P3 — operational monitoring |

---

## 7. Phased Rollout

| Phase | Timeline | Scope |
|---|---|---|
| **Phase 1 — Foundation** | Months 1–3 | Auth, navigation shell, Parent App (attendance, fees, results, announcements) |
| **Phase 2 — Teacher & Student** | Months 3–5 | Teacher App (attendance marking, timetable, grades), Student App (results, assignments, timetable) |
| **Phase 3 — White Label & Build Automation** | Months 5–7 | White-label system, EAS build profiles, first dedicated school app launched |
| **Phase 4 — Advanced Features** | Months 7–10 | Offline sync, advanced push, Admin App, WhatsApp integration bridge |
| **Phase 5 — Scale & Optimize** | Months 10–12 | Performance optimization, monitoring, 100+ school rollout |

---

## 8. Key Metrics for Success

| Metric | Target (Month 12) |
|---|---|
| Schools on mobile platform | 100+ |
| Monthly Active Users | 50,000+ |
| Push notification delivery rate | >95% |
| App crash rate | <0.5% |
| Average session duration | 4+ minutes |
| Parent app rating (Play Store / App Store) | 4.4+ |
| Dedicated school apps generated | 20+ |
| Time to generate new dedicated app | <4 hours |

---

## 9. Investment Summary

| Area | Effort Estimate |
|---|---|
| Mobile foundation + auth | 3 sprints |
| Parent App (full scope) | 5 sprints |
| Teacher App (full scope) | 4 sprints |
| Student App (full scope) | 3 sprints |
| Admin App | 3 sprints |
| White-label platform | 4 sprints |
| Build automation | 2 sprints |
| Offline sync engine | 3 sprints |
| Push notification system | 2 sprints |
| Testing + QA | Continuous |
| **Total** | **~29 sprints (≈ 14.5 months, 2-week sprints)** |

Recommended team: 2 senior React Native engineers, 1 backend engineer (mobile API gaps), 1 DevOps engineer, 1 QA engineer, 1 product owner.

---

## 10. Critical Path

```
Month 1:  Repo setup → Auth → Parent App skeleton
Month 2:  Parent App (attendance + fees + results)
Month 3:  Teacher App (attendance marking) → Shared App beta
Month 4:  Student App → Push notifications
Month 5:  White-label system design → first school onboarded
Month 6:  Build automation → EAS pipelines
Month 7:  First dedicated school app in stores
Month 8:  Offline sync → Admin App
Month 9:  Advanced features → performance tuning
Month 10: 50 schools → monitoring + observability
Month 11: Scale testing → 500-school load test
Month 12: 100+ schools on mobile → roadmap v2
```

---

*This document is the entry point to the complete Vitana Mobile Platform Blueprint. See the [full documentation index](./README.md) for all architecture, epic, and implementation prompt documents.*
