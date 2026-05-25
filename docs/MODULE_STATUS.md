# Module Status — SMS API

**Last Updated:** May 25, 2026 (Session 11) | **Project:** SMSRepoA (Release Candidate)  
**Test Suite:** 724/724 unit tests passing

---

## Overall Status

| Metric | Value |
|--------|-------|
| Unit Tests | **724 / 724 passing (100%)** |
| Integration Tests | 8 / 26 passing (JWT factory limitation — see [TESTING_INFRASTRUCTURE.md](./TESTING_INFRASTRUCTURE.md)) |
| Production-Ready Modules | **7** |
| Release Status | Release Candidate |

---

## Module Readiness

| Module | Status | Unit Tests | Notes |
|--------|--------|-----------|-------|
| **Super Admin Portal** | ✅ Production Ready | ✅ | School listing, onboarding wizard, module permissions; **IsOnboarded detection (Session 9)** — `GetAllSchoolsAsync` now derives `IsOnboarded` from the presence of an Admin `UserLogin` for the school (no DB migration needed); School Management table shows a green `🚀 Onboarded` badge per school and disables the Setup button for already-onboarded schools; wizard shows a `🚫` blocking message and prevents re-running setup on onboarded schools; **Billing Management (Session 10)** — super admin dashboard has a dedicated Billing tab listing all schools with plan, status, expiry, days-until-expiry; inline edit form lets super admin update plan/status/expiry/reminder days; header dropdown Billing menu item opens role-aware dialog |
| **Billing Management** | ✅ Production Ready | ✅ | **New — Session 10 (May 21 2026).** Super admin manages school subscriptions: plan (Standard / Pro / Enterprise), status (Active / Inactive / Suspended / Trial), expiry date, renewal reminder days. Admin dashboard shows a billing notification toast once per session (sessionStorage-gated) when subscription is expiring or expired — severity: `info` (healthy) / `warning` (within reminder window) / `critical` (≤ 7 days or expired). Admin user header dropdown Billing item opens a read-only view with plan badge, expiry info, amber/red warning banner. All powered by 3 new REST endpoints on `SchoolFeaturePermissionsController`. DB migration adds 4 columns to `Schools` table. |
| **Auth / JWT** | ✅ Production Ready | ✅ | Role-based, brute-force lockout, Redis-backed; principal role can now switch academic year context; **Staff deactivation guard (May 16 2026)** — login blocked if `StaffMember.Status = "inactive"` (live DB check, mirrors parent guard); `OnTokenValidated` kills existing sessions immediately on deactivation; **Unified login UX (May 25 2026)** — Admin/Staff/Parent now use one role-first login screen while keeping role-claim validation and route guards authoritative |
| **Student Management** | ✅ Production Ready | ✅ | Full CRUD, ID cards, PDF export; Staff Parent tab (GuardianStaffId) added May 2026 |
| **Staff Management** | ✅ Production Ready | ✅ | 6-step registration, payroll, contracts; Children linking (edit mode) added May 2026; PAN uppercase fix; **Two-step Deactivation Dialog (May 16 2026)** — step 1 shows pending assignment count, step 2 shows confirmation + downloadable Experience Certificate / Relieving Letter / No Dues Certificate; **UserLogin sync fix** — `DeactivateStaff` now reliably marks `UserLogin.Status = "inactive"` + clears refresh token via `LinkedEntityId` lookup |
| **Admissions** | ✅ Production Ready | ✅ | 5-step wizard, RTE support, CSV export; **Admin sidebar re-enabled (Session 9)** — module visible in PEOPLE & ENROLLMENT nav for admin/super_admin; `admissionService.ts` auth migrated from `localStorage.token` to `sessionStorage auth_session`; table actions upgraded with dedicated Enroll (for approved applications), Edit, and Delete buttons |
| **Fee Management** | ✅ Production Ready | ✅ | Cashfree PG, receipts, concessions; STAFF_CHILD concession type tracked via GuardianStaffId; Parent portal fee breakdown shows itemised components + non-itemised gap + module fees (transport/hostel pro-rata) with correct Grand Total; **Fee Heads** (normalised label catalogue); **Fee Terms** (installment schedule per structure); **Receipt Templates** (school branding); **Bulk Payment Upload** (CSV, 500 rows); **Promote Fee Structure** (clone to new year with % increment); **Deleted Transactions audit** — all added May 2026; **Fee Head Overrides (May 19 2026)** — per-student structural exemptions (e.g. Library Fee waived) stored as JSON in `FeeHeadOverrides` column, reduce `TotalAmount` directly without affecting `DiscountAmount`, saved via `PATCH /fees/records/{id}/fee-head-overrides`, restored on dialog reopen; **Remove Concession (May 19 2026)** — "Remove" button in concession panel zeroes `DiscountAmount` via `POST /fees/records/{id}/remove-discount`; **Fee dialog live display fix (May 19 2026)** — concession badge, Total Payable, Amount Paid now read from `activeRecord` (live-refreshed) instead of stale initial prop |
| **Attendance** | ✅ Production Ready | 16/16 | Staff + student tracking |
| **Academics** | ✅ Production Ready | 70/70 | Classes (school-wide, no year filter), subjects from live API, teacher search bar in assign dialog |
| **Academic Year Management** | ✅ Production Ready | ✅ | Single active year enforced; status driven by IsCurrent flag; admin + principal header selector with historical indicator |
| **Leave Management** | ✅ Production Ready | 30/30 | Balance tracking, approvals, overlap detection |
| **Communication** | ✅ Production Ready | 89/89 | Messages, announcements, templates |
| **Payroll** | ✅ Production Ready | 30/30 | Salary slips, allowances, deductions |
| **Assignments** | ✅ Production Ready | 40/40 | Homework, submissions, grading; Staff assignments page fully rewritten — class-grouped with per-class colour coding, section sub-tabs, clickable cards with submission/grading detail sheet; tiles refresh live after grading; **Parent notifications** on grade (and on new assignment) — end-to-end via `StudentGuardians → UserLogins` email join |
| **Examinations** | ✅ Production Ready | ✅ | Marks entry, grade reports, rank generation; **Hall Tickets** (bulk-generate with prefix, per-class filter, CSV export, print); **Co-Scholastic Grading** (A+→E grade per area per term, area CRUD); **Promote Exam Structure** — added May 2026; **Exam Marks Entry (admin + staff)** — end-to-end fixed May 13, 2026; **Exams tab in My Classes** — shows all class exams (not just assigned); **ExamResultsTab Class + Section filter (May 16 2026)** — replaced status dropdown with Class + Section cascading filter, loads results per class/section |
| **Finance / Budget** | ✅ Production Ready | ✅ | Income, expenses, petty cash; **Aggregation correction (May 25 2026)** — petty cash is excluded from aggregated income sources and income tab totals are recomputed from visible rows only |
| **Reports** | ✅ Production Ready | ✅ | PDF/CSV export for all modules |
| **Staff-Student Guardian Relationship** | ✅ Production Ready | ✅ | GuardianStaffId on Student entity; bidirectional link/unlink UI; fee concession eligible |
| **Notifications** | ✅ Production Ready | ✅ | Real DB-backed; parent receives notifications for: Fee reminders, Exam, Announcements, Attendance, **Assignment Graded** (new May 13 2026), New Assignment. `GET /api/notifications/my` returns unread count + paginated list. Parent portal bell icon + Notifications page both real (no mock data). |

| **School Branding (Pre-login)** | ✅ Production Ready | ✅ | Anonymous endpoint `GET /api/settings/public-branding` resolves school identity from query/host/subdomain and feeds unified login branding via `SchoolContext`; fallback branding is returned safely when school cannot be resolved |

---

## Staff Login Sub-Modules (7 Sub-Modules)

All staff-facing modules are production-ready and fully hardened.

| Sub-Module | Tests | Hardening |
|-----------|-------|-----------|
| Attendance | 16/16 | Date validation, future date rejection, pagination |
| Academics | 70/70 | Grade tiers, class assignments, timetable |
| Leave Management | 30/30 | Date range, overlap detection, balance enforcement |
| Communication | 89/89 | Length validation, recipient type, multi-channel |
| Payroll | 30/30 | Year/month validation, pagination, audit trail |
| Assignments | 40/40 | Due date, max marks bounds, duplicate prevention; UI: class-grouped sections, clickable cards → detail sheet (submission stats, grading progress, description); tiles refresh after grading; parent notified on grade |
| Exam Marks Entry | ✅ | Admin (Examinations → Results tab) and Staff (My Classes → Exams tab); shows all class exams; email-based staff ID resolution; class-level access; FK-safe audit trail |
| My Classes | ✅ | Staff class assignment, student lists, assignments tab (fixed arg order), exam marks tab (all class exams) |

---

## Hardening Standards Applied Across All Modules

- **Input validation:** Enum, date range, length, boundary conditions
- **Pagination:** Page 0 → normalized to 1; pageSize > 100 → capped at 100
- **Soft delete:** All records soft-deleted; no hard deletes except admin restore
- **Error consistency:** 400/401/403/404/500 with standard ProblemDetails envelope
- **Tenant isolation:** Multi-tenancy via EF Core global query filters
- **Audit trail:** `CreatedBy`, `ModifiedBy`, `CreatedAt`, `ModifiedAt` on all entities
- **PII masking:** Aadhaar/PAN/phone masked in logs

---

**For full test details:** [TESTING_INFRASTRUCTURE.md](./TESTING_INFRASTRUCTURE.md)  
**For architecture:** [TECHNICAL_DOCUMENT.md](./TECHNICAL_DOCUMENT.md)
