# AI Support Runbook — SMSRepoA

Last Updated: May 25, 2026
Audience: Developers and AI coding agents supporting production-like environments

## Purpose

This runbook captures the most recent high-impact changes and the exact verification workflow needed for fast, safe support.

Use this first when handling login, branding, RBAC, or finance-income issues.

## Recent Changes (May 22-25, 2026)

1. Unified login UX for Admin, Staff, and Parent in one entry screen.
2. Super admin remains a dedicated route (`/super-admin-login`) and role.
3. Pre-login school branding is dynamic via host/subdomain or explicit school code.
4. School branding cache added in frontend (`localStorage`) to keep login identity stable after session expiry.
5. Wallet/finance fix: petty cash removed from aggregated income sources.
6. Hardcoded `cms1` reference cleaned from code comments.

## Support-Critical File Map

Backend:
- `Controllers/SettingsController.cs`
- `Services/FinanceService.cs`
- `Controllers/WalletController.cs`

Frontend:
- `ui/src/pages/Login.tsx`
- `ui/src/contexts/SchoolContext.tsx`
- `ui/src/services/api/settingsApi.ts`
- `ui/src/pages/Finance.tsx`
- `ui/src/components/wallet/WalletManager.tsx`
- `ui/src/App.tsx`

## Login and Branding Architecture

### Entry Routes
- `/login`: Unified role-selection and login flow for Admin/Staff/Parent.
- `/super-admin-login`: Dedicated super admin login route.

### Branding Resolution Order
`GET /api/settings/public-branding` resolves school branding in this order:
1. `schoolCode` query parameter
2. `host` query parameter
3. request host subdomain (for example: `schoola.domain.com` -> `schoola`)

If no school is resolved, API returns safe fallback branding (`VEDA`).

### Frontend Branding Behavior
`SchoolContext` behavior:
- Logged out: fetches public branding and writes cache.
- Logged in: fetches `/settings/school/me` and refreshes cache.
- On failure: falls back to cached branding to avoid broken login identity.

## Finance Guardrails

`GetAggregatedIncomeSourcesAsync` must not include petty cash as an income source.

Expected behavior:
- Income tab totals should be computed from visible income sources only.
- Petty cash remains available in petty cash workflow/reporting, not in income-source aggregation.

## Fast Triage Playbooks

### A) Login page shows wrong school name/logo
1. Call `GET /api/settings/public-branding` with `schoolCode` and confirm response.
2. Validate host/subdomain parsing in `SettingsController`.
3. Check browser `localStorage` key: `school_branding_cache`.
4. Confirm school has `School.Logo` or fallback `SchoolSettings` key (`logo_url` / `school_logo_url`).

### B) Super admin login entry confusion
1. Confirm `/super-admin-login` route exists in `ui/src/App.tsx`.
2. Confirm login UI has dedicated super admin link where intended.
3. Confirm role checks in login flow reject cross-role misuse.

### C) Petty cash appears under income
1. Verify backend aggregation in `FinanceService` has no petty-cash income bucket.
2. Verify frontend filters in finance/wallet views still exclude `PETTY_CASH`.
3. Validate totals are recomputed after filtering.

## Regression Checklist Before Commit

Backend:
- Build API and verify no compile errors in touched files.
- Smoke test:
  - `GET /api/settings/public-branding`
  - `GET /api/settings/school/me` (authenticated)

Frontend:
- Verify `/login` role picker flow.
- Verify `/super-admin-login` back navigation and login flow.
- Verify school logo/name appear from configured branding.
- Verify finance income sources do not list petty cash.

Search hygiene:
- Ensure no stale host examples remain (`cms1` references removed).

## AI Agent Working Rules

1. Prefer minimal diffs; do not refactor unrelated areas.
2. Keep RBAC server-side authoritative; UI role selection is UX only.
3. Treat branding endpoints as anonymous/public-safe, not data-heavy.
4. After UI edits in login flow, always validate both desktop and mobile layouts.
5. Update this runbook whenever auth/branding/finance behavior changes.
