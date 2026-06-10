# Vitana Mobile Platform — Documentation Index

> **Version:** 1.0  
> **Date:** June 2026  
> **Classification:** Internal Architecture Document  
> **Author:** Platform Architecture Team

---

## Overview

This directory contains the complete architecture blueprint, epic documentation, and Cursor implementation prompts for the Vitana Mobile Platform — a world-class enterprise-grade mobile platform supporting 1,000+ schools, white-label dedicated apps, offline-first operation, and real-time push notifications from a single React Native codebase.

---

## Document Index

### Start Here

| Document | Description |
|---|---|
| [**00 — Execution Order**](./00-execution-order.md) | **READ FIRST.** Exact prompt execution sequence, dependency graph, parallel tracks, critical path, quick reference card |

### Foundation Documents

| Document | Description |
|---|---|
| [01 — Executive Summary](./01-executive-summary.md) | Vision, objectives, strategic overview, phased rollout, key metrics |
| [02 — ERP Analysis](./02-erp-analysis.md) | Full analysis of the existing Vitana SMS ERP, modules, multi-tenancy, and branding |
| [03 — API Analysis](./03-api-analysis.md) | Complete API catalog, gap analysis, missing endpoints, mobile API requirements |
| [04 — Technology Recommendation](./04-technology-recommendation.md) | React Native vs Flutter vs KMP comparison; selection of Expo SDK 52 |
| [05 — Repository Strategy](./05-repository-strategy.md) | Monorepo structure, shared packages, pnpm workspace, CI path filters |

### Architecture Documents

| Document | Description |
|---|---|
| [06 — Mobile Architecture](./06-mobile-architecture.md) | Folder structure, navigation, state management, networking, auth flow, performance |
| [07 — Feature Flag Architecture](./07-feature-flag-architecture.md) | Built-in feature flag system, app config endpoint, dynamic navigation, version gates |
| [08 — White Label Architecture](./08-white-label-architecture.md) | Dedicated school apps, asset pipeline, build-time + runtime branding |
| [09 — Push Notification Architecture](./09-push-notification-architecture.md) | FCM/APNS, notification categories, deep linking, tenant isolation, preferences |
| [10 — Offline Architecture](./10-offline-architecture.md) | SQLite schema, write queue, sync engine, conflict resolution, offline bundle |

### Platform & Deployment

| Document | Description |
|---|---|
| [11 — Build Automation](./11-build-automation.md) | EAS Build, GitHub Actions workflows, signing, school app generation |
| [12 — Deployment Strategy](./12-deployment-strategy.md) | Play Store + App Store deployment, OTA updates, versioning, rollback |

### Planning Documents

| Document | Description |
|---|---|
| [13 — Feature Inventory](./13-feature-inventory.md) | Complete feature inventory for all 5 roles, classified Must/Should/Could/Future |
| [14 — Epics & User Stories](./14-epics-and-user-stories.md) | 18 epics with acceptance criteria, story points, and dependencies |
| [15 — Roadmap & Sprint Plan](./15-roadmap-and-sprint-plan.md) | 28-sprint plan across 5 phases, 14 months |
| [16 — Risk Analysis](./16-risk-analysis.md) | Risk register, mitigation strategies, contingency plans |

---

## Epic Documents (`epics/`)

| Epic | Document | Priority | Phase |
|---|---|---|---|
| EP-01: Authentication | [EP-01-authentication.md](./epics/EP-01-authentication.md) | P0 | 1 |
| EP-02: Mobile Foundation | [EP-02-mobile-foundation.md](./epics/EP-02-mobile-foundation.md) | P0 | 1 |
| EP-03: Parent App | [EP-03-parent-app.md](./epics/EP-03-parent-app.md) | P0 | 1–2 |
| EP-04: Teacher App | [EP-04-teacher-app.md](./epics/EP-04-teacher-app.md) | P0 | 2 |
| EP-05: Student App | [EP-05-student-app.md](./epics/EP-05-student-app.md) | P0 | 2 |
| EP-06: Push Notifications | [EP-06-push-notifications.md](./epics/EP-06-push-notifications.md) | P0 | 2 |
| EP-07: Fee Module | [EP-07-fee-module.md](./epics/EP-07-fee-module.md) | P0 | 1 |
| EP-08: Examinations | [EP-08-examinations.md](./epics/EP-08-examinations.md) | P1 | 2–3 |
| EP-09: Feature Flags | [EP-09-feature-flags.md](./epics/EP-09-feature-flags.md) | P1 | 1–2 |
| EP-10: White Label | [EP-10-white-label.md](./epics/EP-10-white-label.md) | P1 | 3 |
| EP-11: Build Automation | [EP-11-build-automation.md](./epics/EP-11-build-automation.md) | P1 | 3 |
| EP-12: Offline Sync | [EP-12-offline-sync.md](./epics/EP-12-offline-sync.md) | P1 | 2–3 |
| EP-13: Admin App | [EP-13-admin-app.md](./epics/EP-13-admin-app.md) | P1 | 3 |
| EP-14: Teacher Marks & Assignments | [EP-14-teacher-marks-assignments.md](./epics/EP-14-teacher-marks-assignments.md) | P1 | 3 |
| EP-15: Communication & Messaging | [EP-15-communication-messaging.md](./epics/EP-15-communication-messaging.md) | P2 | 3–4 |
| EP-16: Analytics & Observability | [EP-16-analytics-observability.md](./epics/EP-16-analytics-observability.md) | P2 | 3 |
| EP-17: Deployment | [EP-17-deployment.md](./epics/EP-17-deployment.md) | P1 | 3 |
| EP-18: WhatsApp Integration | [EP-18-whatsapp-integration.md](./epics/EP-18-whatsapp-integration.md) | P2 | 4 |

---

## Cursor Implementation Prompts (`12-cursor-prompts/`)

These prompts are ready to be executed by Cursor agents. Each is self-contained with full context, requirements, constraints, acceptance criteria, and definition of done.

| Prompt | Description | Sprint | Points |
|---|---|---|---|
| [PROMPT-01](./12-cursor-prompts/PROMPT-01-project-setup.md) | Mobile project setup, monorepo, shared packages, navigation skeleton | 1 | 27 |
| [PROMPT-02](./12-cursor-prompts/PROMPT-02-authentication.md) | Login, token refresh, biometric unlock, school domain entry | 2 | 18 |
| [PROMPT-03](./12-cursor-prompts/PROMPT-03-parent-app.md) | Complete Parent App: attendance, fees, results, announcements, diary | 3–6 | 42 |
| [PROMPT-04](./12-cursor-prompts/PROMPT-04-teacher-app.md) | Teacher App: timetable, offline attendance, student list, leave management | 7–8 | 38 |
| [PROMPT-05](./12-cursor-prompts/PROMPT-05-push-notifications.md) | FCM/APNS push, device registration, deep links, notification center | 10 | 16 |
| [PROMPT-06](./12-cursor-prompts/PROMPT-06-white-label.md) | White label system: app.config.js, asset injection, runtime branding | 11–13 | 34 |
| [PROMPT-07](./12-cursor-prompts/PROMPT-07-build-automation.md) | GitHub Actions: PR preview, staging, production, OTA, school builds | 12 | 18 |
| [PROMPT-08](./12-cursor-prompts/PROMPT-08-student-app.md) | Student App: timetable, results, assignments, submission, fees | 9 | 27 |
| [PROMPT-09](./12-cursor-prompts/PROMPT-09-admin-app.md) | Admin App: dashboard, approvals, announcements, reports | 14 | 24 |
| [PROMPT-10](./12-cursor-prompts/PROMPT-10-feature-flags.md) | Feature flag system: app-config endpoint, FeatureGuard, dynamic nav | 7–10 | 18 |
| [PROMPT-11](./12-cursor-prompts/PROMPT-11-mobile-api-gaps.md) | Backend: all missing mobile APIs (dashboard aggregations, FCM, payment) | 3–14 | 28 |
| [PROMPT-12](./12-cursor-prompts/PROMPT-12-offline-sync.md) | Advanced offline: marks drafts, diary queue, morning bundle, conflict resolution | 12 & 15 | 24 |
| [PROMPT-13](./12-cursor-prompts/PROMPT-13-examinations-marks.md) | Examinations: marks entry grid, SQLite draft, results viewing, assignments | 14 | 35 |
| [PROMPT-14](./12-cursor-prompts/PROMPT-14-communication-messaging.md) | Direct messaging, announcements, broadcast, read receipts, push integration | 19–20 | 26 |
| [PROMPT-15](./12-cursor-prompts/PROMPT-15-analytics-monitoring.md) | Sentry crash reporting, Amplitude analytics, source maps, error boundaries | 17–18 | 29 |
| [PROMPT-16](./12-cursor-prompts/PROMPT-16-deployment-release.md) | Store setup, screenshots, review notes, release runbook, OTA procedures | 13–14 | 37 |

**Total Implementation Points:** 451 story points across 16 prompts.

---

## How to Use This Documentation

### For Product Owners

Start with:
1. [01 — Executive Summary](./01-executive-summary.md) — understand the vision.
2. [13 — Feature Inventory](./13-feature-inventory.md) — understand what's being built.
3. [15 — Roadmap & Sprint Plan](./15-roadmap-and-sprint-plan.md) — understand the timeline.
4. [16 — Risk Analysis](./16-risk-analysis.md) — understand the risks.

### For Mobile Engineers

Start with:
1. [04 — Technology Recommendation](./04-technology-recommendation.md) — understand the tech choices.
2. [06 — Mobile Architecture](./06-mobile-architecture.md) — your primary reference.
3. [05 — Repository Strategy](./05-repository-strategy.md) — understand the monorepo.
4. [12-cursor-prompts/PROMPT-01](./12-cursor-prompts/PROMPT-01-project-setup.md) — start here for implementation.

### For Backend Engineers

Start with:
1. [03 — API Analysis](./03-api-analysis.md) — understand what APIs are needed.
2. [12-cursor-prompts/PROMPT-11](./12-cursor-prompts/PROMPT-11-mobile-api-gaps.md) — backend implementation tasks.
3. [09 — Push Notification Architecture](./09-push-notification-architecture.md) — Firebase integration.

### For DevOps Engineers

Start with:
1. [11 — Build Automation](./11-build-automation.md) — EAS + GitHub Actions.
2. [12 — Deployment Strategy](./12-deployment-strategy.md) — store deployment.
3. [08 — White Label Architecture](./08-white-label-architecture.md) — school app generation.
4. [12-cursor-prompts/PROMPT-07](./12-cursor-prompts/PROMPT-07-build-automation.md) — CI/CD implementation.

### For Sales / Business Teams

Start with:
1. [01 — Executive Summary](./01-executive-summary.md) — vision, metrics, investment.
2. [08 — White Label Architecture](./08-white-label-architecture.md) Section 2 — app variants.
3. [13 — Feature Inventory](./13-feature-inventory.md) — feature-by-feature breakdown.

---

## Key Architectural Decisions

| Decision | Choice | Document |
|---|---|---|
| Mobile framework | React Native + Expo SDK 52 | [04-technology-recommendation](./04-technology-recommendation.md) |
| Repository structure | Monorepo (`mobile/` + `packages/`) | [05-repository-strategy](./05-repository-strategy.md) |
| Navigation | Expo Router v4 (file-based) | [06-mobile-architecture](./06-mobile-architecture.md) |
| State management | TanStack Query v5 + Zustand | [06-mobile-architecture](./06-mobile-architecture.md) |
| Styling | NativeWind v4 (Tailwind for RN) | [06-mobile-architecture](./06-mobile-architecture.md) |
| Feature flags | Built in-house (no external SaaS) | [07-feature-flag-architecture](./07-feature-flag-architecture.md) |
| Build automation | EAS Build + GitHub Actions | [11-build-automation](./11-build-automation.md) |
| OTA updates | Expo EAS Update (channel-based) | [12-deployment-strategy](./12-deployment-strategy.md) |
| Offline storage | expo-sqlite + Drizzle ORM | [10-offline-architecture](./10-offline-architecture.md) |
| Push notifications | Firebase (unified FCM + APNS) | [09-push-notification-architecture](./09-push-notification-architecture.md) |

---

## Vitana SMS System Context

This mobile platform extends the existing **Vitana SMS v2.9**:
- **Backend:** ASP.NET Core 8, SQL Server (per-tenant DB), Redis, AWS S3
- **Web frontend:** React 19 + Vite 6 at `ui/` directory
- **API base URL:** `https://api.vitanasms.com/api`
- **Standard response envelope:** `{ success, data, message, timestamp, correlationId }`
- **Auth:** JWT Bearer, 60-minute expiry, refresh token rotation
- **Tenancy:** Database-per-tenant; `SchoolId` in JWT; `X-Academic-Year` header
- **Feature reference:** [docs/FEATURES_AND_MODULES.md](../FEATURES_AND_MODULES.md)

---

*Generated June 2026 — Vitana Platform Architecture Team*
