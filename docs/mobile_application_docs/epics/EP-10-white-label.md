# EP-10: White Label Architecture

> **Epic ID:** EP-10  
> **Priority:** P1  
> **Estimated Sprints:** 3  
> **Phase:** 3  
> **Related Docs:** [08-white-label-architecture](../08-white-label-architecture.md) · [11-build-automation](../11-build-automation.md) · [PROMPT-06](../12-cursor-prompts/PROMPT-06-white-label.md)

---

## Business Objective

White-label dedicated school apps are Vitana's most compelling commercial differentiator. Schools with their own branded app on parents' phones have dramatically higher engagement and a strong switching barrier. This feature unlocks the premium tier revenue model.

**Commercial model:**
- Standard tier: Shared Vitana App (included).
- Enterprise tier: Dedicated school app (paid add-on, ₹15,000–50,000/year).

## Technical Objective

Implement the complete white-label system: dynamic app.config.js, school asset pipeline, EAS build profiles, runtime branding, and dedicated app generation in under 4 hours.

---

## Current State Analysis

The existing backend has:
- `GET /api/settings/public-branding` — school name, logo URL, primary color (minimal).
- School logo uploaded and stored in S3.
- No splash screen, app icon, or extended branding support.

The mobile app has `app.config.js` (static, Vitana only). No dynamic configuration.

---

## What Gets White Labeled

| Asset | Type | Phase 1 | Phase 2 |
|---|---|---|---|
| App icon | Build-time | ✅ | — |
| Splash screen | Build-time | ✅ | — |
| App name | Build-time | ✅ | — |
| Package name | Build-time | ✅ | — |
| Primary color | Build + Runtime | ✅ | — |
| Accent color | Runtime | ✅ | — |
| School logo (header) | Runtime | ✅ | — |
| Font selection | Runtime | — | ✅ |
| Dark mode colors | Runtime | — | ✅ |
| Store screenshots | Build-time | Vitana template | School custom |
| Deep customization | Build | — | ✅ |

---

## Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | `SCHOOL_ID` env var at build time selects school config |
| FR-2 | App icon, splash, package name injected at build time |
| FR-3 | School primary/accent color applied to all UI elements at runtime |
| FR-4 | School logo displayed in app header post-login |
| FR-5 | Dedicated apps skip the school domain entry screen |
| FR-6 | Shared app shows school branding only post-login |
| FR-7 | Branding resets to Vitana defaults on logout in shared app |
| FR-8 | `inject-school-config.js` downloads school assets from S3 in < 60 seconds |
| FR-9 | All school asset directories excluded from git (except `vitana/`) |
| FR-10 | EAS `school-production` build profile generates correct app |

---

## User Stories

**EP-10-US-01: Build dedicated school app** (SP: 13)
**EP-10-US-02: Runtime branding in shared app** (SP: 5)
**EP-10-US-03: School asset upload (backend admin panel)** (SP: 8)
**EP-10-US-04: White-label onboarding checklist** (SP: 3)

**Total:** 29 story points / 3 sprints

---

## Sprint Breakdown

| Sprint | Scope |
|---|---|
| Sprint 11 | `app.config.js`, `school-configs.json`, `inject-school-config.js`, default Vitana assets |
| Sprint 12 | EAS build profiles, build automation wired (PROMPT-07) |
| Sprint 13 | Pilot school onboarding, first dedicated app build and QA |

---

## Future Enhancements

- School-provided custom font from Google Fonts.
- Automatic screenshot generation with school branding composited onto templates.
- School admin self-service asset upload (no Vitana DevOps intervention).
- School owns their Apple/Google developer account (app transfer flow).
