# Module Status — SMS API

**Last Updated:** May 11, 2026 | **Project:** SMSRepoA (Release Candidate)  
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
| **Auth / JWT** | ✅ Production Ready | ✅ | Role-based, brute-force lockout, Redis-backed; principal role can now switch academic year context |
| **Student Management** | ✅ Production Ready | ✅ | Full CRUD, ID cards, PDF export; Staff Parent tab (GuardianStaffId) added May 2026 |
| **Staff Management** | ✅ Production Ready | ✅ | 6-step registration, payroll, contracts; Children linking (edit mode) added May 2026; PAN uppercase fix |
| **Admissions** | ✅ Production Ready | ✅ | 5-step wizard, RTE support, CSV export |
| **Fee Management** | ✅ Production Ready | ✅ | Cashfree PG, receipts, concessions; STAFF_CHILD concession type tracked via GuardianStaffId |
| **Attendance** | ✅ Production Ready | 16/16 | Staff + student tracking |
| **Academics** | ✅ Production Ready | 70/70 | Classes (school-wide, no year filter), subjects from live API, teacher search bar in assign dialog |
| **Academic Year Management** | ✅ Production Ready | ✅ | Single active year enforced; status driven by IsCurrent flag; admin + principal header selector with historical indicator |
| **Leave Management** | ✅ Production Ready | 30/30 | Balance tracking, approvals, overlap detection |
| **Communication** | ✅ Production Ready | 89/89 | Messages, announcements, templates |
| **Payroll** | ✅ Production Ready | 30/30 | Salary slips, allowances, deductions |
| **Assignments** | ✅ Production Ready | 40/40 | Homework, submissions, grading |
| **Examinations** | ✅ Production Ready | ✅ | Marks entry, grade reports, rank generation |
| **Finance / Budget** | ✅ Production Ready | ✅ | Income, expenses, petty cash |
| **Reports** | ✅ Production Ready | ✅ | PDF/CSV export for all modules |
| **Staff-Student Guardian Relationship** | ✅ Production Ready | ✅ | GuardianStaffId on Student entity; bidirectional link/unlink UI; fee concession eligible |

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
| Assignments | 40/40 | Due date, max marks bounds, duplicate prevention |
| My Classes | ✅ | Staff class assignment, student lists |

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
