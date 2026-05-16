# sms-api — Technical Document

> **Version 2.6** · ASP.NET Core 8 · .NET 8 · React 19 · SQL Server · **Release Candidate**  
> **Last Updated:** May 16, 2026 (Session 7) | **Project:** SMSRepoA

---

## Changelog — May 16, 2026 (Session 7)

| Area | Change |
|------|--------|
| **`Controllers/AuthController.cs` — Staff login guard** | Added a live `StaffMember` DB query at login time for staff/teacher/principal/hrmanager roles (mirrors the existing parent/student guard). If `StaffMember.Status == "inactive"`, login returns 401 immediately — even when `UserLogin.Status` is stale/active. Falls back to email lookup if `LinkedEntityId` is null. |
| **`Extensions/AuthExtensions.cs` — `OnTokenValidated`** | Extended the per-request JWT validation hook to also query `StaffMember.Status` for staff roles. After deactivation, the **next API call** from an existing staff session fails with 401, forcing logout with no delay. Uses `LinkedEntityId` for the primary lookup with email fallback. |
| **`Controllers/StaffController.cs` — `DeactivateStaff` / `ReactivateStaff`** | Replaced the unreliable email-only `UserLogin` lookup with a `LinkedEntityId`-first lookup (`u.LinkedEntityId == id && u.LinkedEntityType == "staff"`) and email fallback. `DeactivateStaff` now also clears `RefreshTokenHash` and `RefreshTokenExpiry` to invalidate active refresh-token sessions. |
| **`Services/StaffService.cs` — `UpdateStaffAsync` + `BulkUpdateStaffStatusAsync`** | Both update paths now use the same `LinkedEntityId`-first + email-fallback pattern to sync `UserLogin.Status`. When setting inactive, refresh tokens are cleared. |
| **`ui/src/components/staff/StaffDeactivateDialog.tsx`** | New two-step deactivation dialog: step 1 shows pending assignment count (warns if ungraded work exists); step 2 shows confirmation with three downloadable HR documents — **Experience Certificate**, **Relieving Letter**, **No Dues Certificate** (PDF via `professionalPdfGenerator.ts`). |
| **`ui/src/components/examinations/ExamResultsTab.tsx`** | Replaced the old status-dropdown filter with a cascading **Class + Section** filter. Results now load per class/section, matching the same UX pattern used elsewhere in Examinations. |
| **`ui/src/utils/professionalPdfGenerator.ts`** | Added three staff-specific document generators: `generateExperienceCertificate`, `generateRelievingLetter`, `generateNoDuesCertificate`. Used by `StaffDeactivateDialog`. |

### Staff deactivation auth flow (after fix)

```
Admin clicks "Deactivate"  →  DeactivateStaff (StaffController)
    → StaffMember.Status = "inactive"
    → UserLogin found via LinkedEntityId (reliable) or email fallback
    → UserLogin.Status = "inactive"
    → UserLogin.RefreshTokenHash = null          ← refresh token invalidated
    → SaveChangesAsync

Staff tries fresh login  →  AuthController Login
    → isStaffRole check
    → SELECT Status FROM StaffMembers WHERE Id = LinkedEntityId  ← live DB
    → Status == "inactive" → 401 Unauthorized

Staff has EXISTING JWT session  →  Any API call
    → OnTokenValidated (AuthExtensions)
    → SELECT StaffMember.Status WHERE Id = LinkedEntityId  ← live DB, per request
    → Status == "inactive" → context.Fail() → 401 Unauthorized → frontend redirects to login
```

### Root cause of the pre-fix failure

| Issue | Symptom | Fix |
|-------|---------|-----|
| Email-based UserLogin lookup failed silently | `UserLogin.Status` stayed `"active"` after deactivation | Use `LinkedEntityId` as primary key; email as fallback |
| `OnTokenValidated` only checked `UserLogin.Status` | Existing JWT sessions never invalidated | Now also checks `StaffMember.Status` directly |
| Old server binary running (file lock) | Code changes compiled but never loaded | Kill server before build; confirmed with `dotnet run --no-build` after clean build |

---

## Changelog — May 15, 2026 (Session 6)

| Area | Change |
|------|--------|
| **`Controllers/StaffController.cs` — `ParseStaffCsv`** | Replaced positional column access (`cols[0]`…`cols[30]`) with header-name lookup using `CanonCol()` (strips spaces/underscores/hyphens, lowercases) plus a `StaffColAliases` dictionary. `ParseFlexDate` handles 15 date formats. `NormalizeGender`, `NormalizeEmpType`, and `NormalizeStatus` local functions auto-correct common aliases. `Experience` and `Salary` parse silently (non-numeric → warning + default, not skip). Added `CanonCol` private static helper to `StaffController`. |
| **`Controllers/StudentsController.cs` — `ParseStudentCsv`** | Existing generous parser confirmed working. Column aliases cover 17 field groups. `CleanAadhar` strips non-digits for 12-digit normalisation; `CleanPan` uppercases. |
| **`Services/StudentService.cs` — `BulkImportStudentsAsync`** | `AdmissionDate` future cap raised from +1 day to **+30 days** (advance registrations). Blank `AdmissionDate` auto-defaults to `DateTime.UtcNow`. `Category` auto-corrects `gen`→`General`, `obc-a`/`obc-b`→`OBC`, `sc/st`→`SC`. PAN validated to exactly 10 characters. Aadhar validated to exactly 12 digits and stored normalised. All errors include the offending value and a correction hint. Duplicate errors now include the admission number. |
| **`Services/StaffService.cs` — `ValidateCreateRequest`** | Gender/status/employmentType normalised (switch expression) before `ValidXxx.Contains()` check. Alias map: `M`→`male`, `Working`→`active`, `Full Time`→`permanent`, `Disabled`→`inactive`, `Fired`→`terminated`, etc. PAN length validated. `DateOfBirth == default` now produces a clear error instead of the previous `>= DateTime.UtcNow.Date` which silently passed `default(DateTime)`. |
| **`ui/src/components/common/ImportButton.tsx`** | Added `parseImportError(msg)` helper that extracts `rowRef` and `detail` from backend strings (`[ADM-001] ...`, `Row 3: ...`, or plain text → `File error`). Error list now renders a monospace `Badge` per error with `rowRef`. Partial-success amber `Alert` shown when `successCount > 0 && failureCount > 0`. `catch` block surfaces `respData.detail` (inner exception). **Fixed**: duplicate `ImportButton` declaration removed — the old component body was accidentally left after the rewrite, causing `SyntaxError: Identifier 'ImportButton' has already been declared` on all pages using import. |
| **`ui/src/components/superadmin/DataImportManager.tsx`** | Added `parseImportError` helper (duplicate of ImportButton's — both self-contained). Error list replaced with row-badge layout. Stats replaced with a 2-column imported/skipped grid. Partial-success amber `Alert` added. `Badge` and `Info` imported from shadcn/lucide. |

### CSV import architecture (both student and staff)

```
Browser  →  multipart/form-data POST  →  Controller (ParseXxxCsv)
                                            ↓ header-name lookup (CanonCol + aliases)
                                            ↓ ParseFlexDate (15 formats)
                                            ↓ NormalizeGender / NormalizeStatus / etc.
                                            ↓ (List<CreateXxxRequest>, List<string> errors)
                                         Service (BulkImportXxxAsync)
                                            ↓ per-row required-field + enum validation
                                            ↓ duplicate-number check (DB + batch)
                                            ↓ SaveChangesAsync (EF Core)
                                         BulkOperationResult { successCount, failureCount, errors }
                                            ↓
Browser  ←  parseImportError()  ←  ImportButton / DataImportManager
                                    row badge per error  |  partial-success banner
```

### Error string format (backend → frontend)

Backend emits errors in one of two forms:

| Format | Example | Frontend display |
|--------|---------|-----------------|
| `[{identifier}] {message}` | `[ADM-001] Gender 'M' is not recognised…` | Badge: `ADM-001` |
| `[Row {n}] {message}` | `[Row 3] DateOfBirth '99/99/9999' is not…` | Badge: `Row 3` |
| Plain text | `The CSV file is empty.` | Badge: `File error` |

---

## Changelog — May 13, 2026 (Session 5)

| Area | Change |
|------|--------|
| **AssignmentService — `NotifyParentOnGradeAsync`** | New private method fires a `Notification` record for each parent when their child's assignment is graded. Looks up parent login IDs via `StudentGuardians → UserLogins` email join (NOT `Guardians`/`GuardianStudents` which are empty). Sets `RecipientType = "Parent"`, `Type = "Assignment"`, `ActionUrl = "/parent-assignments"`. Called from both `GradeSubmissionAsync` (student self-submits then gets graded) and `StaffMarkSubmissionAsync` (staff marks via roster endpoint). |
| **AssignmentService — `NotifyParentsAsync`** | Existing new-assignment notification method fixed from incorrect `GuardianStudents`/`Guardians` table join to the correct `StudentGuardians → UserLogins` email join. |
| **Parent schema clarification** | Parent portal accounts live exclusively in `StudentGuardians` (columns: `Id, StudentId, SchoolId, Name, Surname, Email, HasPortalAccess, UserLoginId, ...`). The `Guardians` and `GuardianStudents` tables are empty legacy tables. Always use: `from sg in _context.StudentGuardians join ul in _context.UserLogins on sg.Email equals ul.Email`. |
| **Frontend — `AssignmentManager.tsx`** | `onClose` handler on `AssignmentGradingSheet` now also calls `loadAssignments()` — assignment tiles (submission count, graded count, avg score) now refresh immediately after closing the grading sheet. |
| **Frontend — `StaffMyClassDetail.tsx`** | Fixed argument order bug in `loadAssignments`: `.getAssignments(assignment.classId, undefined, undefined, 1, 100)` — the missing `undefined` for `subjectId` caused the `page` argument to be passed as `subjectId`, so no assignments loaded in the My Classes → Assignments tab. |
| **Frontend — `AppSidebar.tsx`** | Removed `Grades` nav item from all three staff designation blocks (Principal/VP, Head of Department, Class Teacher/Teacher). Grades data is accessible via Examinations; a standalone Grades sidebar entry was redundant. |
| **Frontend — `StaffExamMarksTab.tsx`** | Rewritten to use `getExamSetups({ classId, academicYear, pageSize: 100 })` instead of `getMyExamAssignments(academicYear)` filtered by classId. This shows all published exams for the class (not just exams explicitly assigned to the teacher), making it consistent with actual school workflows. Sidebar label changed from "My Exams" to "Exams". |

### Parent notification data flow

```
Staff grades submission
  → GradeSubmissionAsync / StaffMarkSubmissionAsync
    → NotifyParentOnGradeAsync(studentId, schoolId, assignment, marks, feedback)
      → LINQ join: StudentGuardians.Email = UserLogins.Email
        WHERE sg.StudentId = studentId AND ul.Role = "parent" AND ul.Status = "active"
      → INSERT Notifications (RecipientId = UserLogin.Id, RecipientType = "Parent",
                               Type = "Assignment", Title = "Assignment Graded: {title}",
                               Content = "Marks: X/Y (Z%). Feedback: ...")
        → Parent sees notification in /api/notifications/my (ParentNotifications.tsx)
```

### Parent identity resolution pattern

```
StudentGuardians.Email  =  UserLogins.Email  ← reliable join
UserLogins.LinkedEntityId  =  StudentGuardians.Id  (when portal access created)
UserLogins.Role  =  "parent"
Notifications.RecipientId  =  UserLogins.Id
```

---

## Changelog — May 13, 2026 (Session 4)

| Area | Change |
|------|--------|
| **ExamSetupController** — role comparison | `GetUserId()` role claim is title-case (`"Teacher"`, `"Admin"`). Fixed `isAdmin` check by calling `.ToLowerInvariant()` before comparison; admin was always treated as staff, causing 403 on marks endpoints. |
| **ExamSetupService — `GetExamSetupsForStaffAsync`** | Replaced `UserLogin.Id`-based lookup with email → `StaffMember.Email` resolution (same pattern as `AcademicsService`). `UserLogin.Id` ≠ `StaffMember.Id`; FK joins use `StaffMember.Id` exclusively. Result: staff now correctly sees exam setups via both explicit subject assignment and class-level teacher assignment. |
| **ExamSetupService — `GetMarksEntrySheetAsync`** | Access check rewritten: resolves caller email → `StaffMember.Id`; if subject has `AssignedStaffId` that does not match the resolved ID, grants access anyway when the staff has an active `TeacherAssignment` for the exam's class (class-level access). |
| **ExamSetupService — `SaveBulkMarksAsync`** | Same email-based resolution as above. `EnteredByStaffId` field now stores the resolved `StaffMember.Id` (nullable — null for admins who have no `StaffMember` record), fixing FK constraint violation against `dbo.StaffMembers`. |
| **Frontend — `StaffExamMarksTab.tsx`** | Fixed field name mismatches: `setup.totalSubjects` → `setup.subjectCount`, `setup.subjectsWithMarks` → `setup.marksEnteredCount` (matching `ExamSetupBasicDto`). |
| **Frontend — `MarksEntryGrid.tsx`** | Added null-safe rows loading (`data.rows ?? (data as any).students ?? []`) + `Users` icon import + empty-state UI when no students enrolled. |

### Identity resolution pattern (critical — follow for all staff endpoints)

```
JWT NameIdentifier  =  UserLogin.Id          (login record)
UserLogin.LinkedEntityId  →  StaffMember.Id  (staff entity)  ← NOT always populated
StaffMember.Email  =  UserLogin.Email        ← reliable cross-table join
TeacherAssignment.StaffId  =  StaffMember.Id ← always uses StaffMember.Id
ExamSetupSubject.AssignedStaffId  =  StaffMember.Id
ExamMarksEntry.EnteredByStaffId   =  StaffMember.Id (FK)
```

**Use email-based lookup** (not `LinkedEntityId`) to resolve `UserLogin → StaffMember`:
```csharp
var staffMemberId = await _context.StaffMembers
    .Where(s => s.Email == userEmail && s.SchoolId == schoolId && !s.IsDeleted)
    .Select(s => (Guid?)s.Id)
    .FirstOrDefaultAsync();
```

---

## Changelog — May 12, 2026

| Area | Change |
|------|--------|
| **EF Migration** | `AddFeeTermsCoScholasticReceiptTemplate` — adds 6 new tables: `FeeHeads`, `FeeStructureComponents`, `FeeTerms`, `ReceiptTemplates`, `CoScholasticAreas`, `CoScholasticAssessments` |
| **`FeeHead` entity** | Normalized fee label catalogue per school (name, description, isActive); unique index on `SchoolId + Name`; full CRUD at `GET/POST/PUT/DELETE /api/fees/heads` |
| **`FeeStructureComponent` entity** | Maps a `FeeHead` to a `FeeStructure` with amount override; unique index on `StructureId + HeadId`; cascade delete when structure deleted |
| **`FeeTerm` entity** | Installment terms per fee structure (termName, dueDate, amount, decimal 12,2); endpoints `GET/POST /api/fees/structures/{id}/terms` |
| **`ReceiptTemplate` entity** | School branding for printed receipts (headerText, footerText, logoUrl, primaryColor, isDefault, isActive, nvarchar columnConfigJson); CRUD at `GET/POST/PUT /api/fees/receipt-templates` |
| **Fees — Promote Fee Structure** | `POST /api/fees/structures/{id}/promote` — clones a fee structure to a new academic year with optional % increment on all component amounts |
| **Fees — Bulk Payment Upload** | `POST /api/fees/bulk-payment-upload` — accepts up to 500 payment rows as JSON, creates `FeePayment` records in a single transaction |
| **Fees — Deleted Transactions** | `GET /api/fees/deleted-transactions` — uses `IgnoreQueryFilters()` to surface soft-deleted payment records for audit/admin review |
| **`FeeAuditLog` query filter fix** | Added explicit `HasQueryFilter(f => f.SchoolId == _currentSchoolId)` in `ConfigureFees` — non-`BaseEntity` table now respects multi-tenant isolation |
| **`CoScholasticArea` entity** | School-defined activity areas (Sports, Arts, Discipline, etc.); unique index on `SchoolId + Name`; CRUD at `GET/POST/PUT/DELETE /api/examinations/coscholastic/areas` |
| **`CoScholasticAssessment` entity** | Per-student grade (A+/A/B+/B/C+/C/D/E) per area per term per year; upsert-batch endpoint `POST /api/examinations/coscholastic/batch`; composite index on `SchoolId + StudentId + AreaId + AcademicYear + Term` |
| **Hall Tickets** | `POST /api/examinations/{examId}/hall-tickets/generate-bulk` (with prefix, class filter); `GET /api/examinations/{examId}/hall-tickets`; `GET /api/examinations/{examId}/hall-tickets/{studentId}` |
| **Exam — Promote Structure** | `POST /api/examinations/{id}/promote` — clones exam structure to a new academic year |
| **Frontend — feeApi.ts** | Added types + functions for FeeHead, FeeTerm, ReceiptTemplate, promoteFeeStructure, bulkUploadPayments, getDeletedTransactions |
| **Frontend — examinationApi.ts** | Added types + functions for HallTicket, generateHallTickets, getHallTickets, getHallTicket, promoteExamStructure, CoScholasticArea, CoScholasticAssessment, getCoScholasticAreas, createCoScholasticArea, getStudentCoScholastic, saveCoScholasticAssessments |
| **7 new UI components** | `FeeHeadsManager`, `FeeTermsPanel`, `ReceiptTemplateManager`, `BulkFeePaymentUpload`, `PromoteFeesDialog`, `HallTicketManager`, `CoScholasticGrading` |
| **Fees.tsx** | Tabs expanded from 5 → 9: added `feeheads`, `feeterms` (with inline PromoteFeesDialog), `bulkpayment`, `receipttemplates` |
| **ExaminationManager.tsx** | Tabs expanded from 4 → 6: added `halltickets`, `coscholastic` |
| **v1 vs SMSRepoA audit** | Read-only gap analysis: 85–90% feature-complete; 3 critical gaps identified — GPS tracking, biometric integration, background job scheduler |

## Changelog — May 10–11, 2026

| Area | Change |
|------|--------|
| `Student` entity | Added `GuardianStaffId (Guid?)` FK → `Staff.Id`; EF migration `20260510082118_AddGuardianStaffIdToStudent` |
| `AcademicYears` | `IsCurrent (bool)` flag is now the single source of truth for the active year; UI status column removed |
| Academic Year enforcement | `SetCurrentAcademicYearAsync` atomically clears all other rows' `IsCurrent` before marking the new one |
| `X-Academic-Year` header | Injected by `apiClient.ts` from `localStorage['selectedAcademicYearName']` on every request |
| Header selector access | Expanded from `admin` to `admin + principal` roles |
| Staff Form — PAN | `onChange` handler now calls `.toUpperCase()` before the Zod resolver runs (prevents silent uppercase-mismatch validation failures) |
| Classes — no year filter | Frontend no longer filters classes by academic year (Classes are school-wide, not year-scoped) |

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        React 19 SPA (ui/)                       │
│  React Router v6 · TanStack Query v5 · react-hook-form · Zod   │
│  shadcn/ui · Tailwind CSS · Recharts · Framer Motion · jsPDF   │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS / REST + JWT
┌────────────────────────▼────────────────────────────────────────┐
│              ASP.NET Core 8 Web API (sms-api.csproj)            │
│  42+ Controllers · JWT Auth · Redis · Rate Limiting · OTLP      │
└────────────────────────┬────────────────────────────────────────┘
                         │ EF Core 8
┌────────────────────────▼────────────────────────────────────────┐
│                  PostgreSQL (via Npgsql)                         │
│  Soft delete · Audit trails · India-specific columns            │
└─────────────────────────────────────────────────────────────────┘
        │                       │                      │
   Redis Cache           S3/MinIO Storage        Cashfree PG
  (Brute-force,         (Documents, Photos,       (Fee payments,
  Login attempts)        ID cards, Reports)        Refunds)
```

---

## 2. Backend Stack

| Layer | Technology |
|---|---|
| Runtime | .NET 8 / ASP.NET Core 8 |
| ORM | Entity Framework Core 8 + Npgsql |
| Auth | JWT Bearer + Redis-backed brute-force protection |
| Cache | `ICacheService` → Redis (`StackExchange.Redis`) with fallback |
| File storage | `IFileStorageService` → AWS S3 / MinIO / local disk |
| Payments | Cashfree Payments v2 (create orders, webhooks, refunds) |
| Observability | OpenTelemetry (OTLP exporter) + Serilog + Seq sink |
| Health | `Microsoft.Extensions.Diagnostics.HealthChecks.UI` |
| API docs | Swagger / OpenAPI (Swashbuckle) |
| Testing | xUnit + 724 passing unit tests |
| Containerisation | Docker + docker-compose.yml |

---

## 3. Frontend Stack

| Layer | Technology |
|---|---|
| Framework | React 19.2.5 |
| Routing | React Router v6 (lazy-loaded routes) |
| Data fetching | TanStack Query v5.83 |
| Form handling | react-hook-form + @hookform/resolvers/zod + Zod |
| UI primitives | shadcn/ui (Radix UI) + Tailwind CSS |
| Charts | Recharts |
| Animation | Framer Motion |
| PDF export | jsPDF |
| Toast | sonner |
| Testing | Vitest + React Testing Library |

---

## 4. Project Structure

```
sms-api/
├── Controllers/         # 42+ ASP.NET Core controllers
├── Models/              # Domain entities (EF Core)
├── Services/            # Business logic services
├── Data/                # DbContext + repositories
├── Migrations/          # EF Core migrations
├── Middleware/          # Auth, error, CORS middleware
├── Validators/          # FluentValidation validators
├── Infrastructure/      # Redis, S3, Cashfree services
├── Application/         # CQRS handlers / features
├── Utils/               # Helpers (masking, date utils, etc.)
├── SmsApi.Tests/        # 724 unit tests (xUnit)
├── Program.cs           # App bootstrap (DI, middleware)
├── appsettings.json     # Base configuration
├── appsettings.Development.json
├── appsettings.Production.json
├── Dockerfile
├── docker-compose.yml
└── ui/                  # React 19 SPA
    └── src/
        ├── pages/       # 60+ lazy-loaded pages
        ├── components/  # Feature + UI components
        ├── services/    # API clients (TanStack Query)
        ├── schemas/     # Zod validation schemas
        ├── contexts/    # React context providers
        ├── hooks/       # Custom hooks
        └── lib/         # Utilities (cn, formatters)
```

---

## 5. Backend Modules

### 5.1 Authentication & Security
- JWT Bearer tokens (configurable expiry)
- Redis-backed login attempt tracking (5 attempts → 15 min lockout)
- Rate limiting via ASP.NET Core middleware
- RBAC: `super_admin`, `admin`, `principal`, `staff`, `student`, `parent`
- **Academic year context**: All API requests carry `X-Academic-Year` header (set by `apiClient.ts` from localStorage). Backend controllers scope queries to the requested year. `principal` role can switch years via the header dropdown; `staff`/`student`/`parent` are locked to the current year.
- Aadhaar masking (first 8 digits replaced with `****`)
- PAN masking (middle 5 chars masked); input validation enforces `[A-Z]{5}[0-9]{4}[A-Z]{1}` — input auto-uppercased before validation

### 5.2 Academic Management
| Feature | Endpoints |
|---|---|
| Classes & Sections | `/api/academics/classes`, `/sections` |
| Subjects & Curriculum | `/api/academics/subjects` |
| Timetable | `/api/academics/timetable` |
| Assignments | `/api/assignments` |
| Examinations | `/api/examinations` |
| Grades & CCE | `/api/grades`, `/api/cce` |
| Attendance | `/api/attendance`, `/api/staffattendance` |

> **Classes are school-wide** — no `AcademicYearId` FK on the `Classes` table. The year context scopes transactional data (fees, exams, enrollments) but not the class catalogue itself.

### 5.3 Student & Staff Management
- Student lifecycle: admission → enrollment → profile → TC
- Staff employment: contract, permanent, guest, probation
- PF, ESI, UAN compliance fields
- Emergency contacts + medical information
- Bank account details (encrypted at rest)
- **Staff → Children link:** `Student.GuardianStaffId` (nullable FK to `Staff.Id`). Set via `PATCH /api/students/{id}/guardian-staff`. Used by fee concession module to flag staff-child students.
- **Guardian search endpoints:** `GET /api/staff/{id}/children` returns linked students; `GET /api/students?guardianStaffId=...` filters by guardian staff.

### 5.4 Finance Management
- Double-entry accounts (ASSET, LIABILITY, EQUITY, INCOME, EXPENSE)
- Income sources: Fee, Store, Donation, Other
- Expense categories with budget allocation
- Petty cash workflow (request → approve/reject)
- Store sales tracking
- Monthly trend reports + budget utilization analytics

### 5.5 Fee Management
- Fee structures per class/academic year
- Cashfree integration (create payment link → webhook → status update)
- RTE fee concessions (income-based eligibility)
- Partial payments + installments
- PDF receipt generation (jsPDF on frontend)
- **Fee Heads**: normalised label catalogue — `GET/POST/PUT/DELETE /api/fees/heads`
- **Fee Terms**: installment schedule per structure — `GET/POST /api/fees/structures/{id}/terms`
- **Promote Fee Structure**: clone to new year with % increment — `POST /api/fees/structures/{id}/promote`
- **Receipt Templates**: school branding — `GET/POST/PUT /api/fees/receipt-templates`
- **Bulk Payment Upload**: up to 500 rows JSON — `POST /api/fees/bulk-payment-upload`
- **Deleted Transactions**: soft-delete audit (IgnoreQueryFilters) — `GET /api/fees/deleted-transactions`

### 5.6 India-Specific Features
| Feature | Detail |
|---|---|
| Aadhaar validation | 12-digit numeric, masked in display |
| PAN validation | Standard regex `[A-Z]{5}[0-9]{4}[A-Z]{1}` |
| IFSC validation | 11-char, first 4 alpha + 5th `0` |
| RTE Concessions | Annual income threshold check |
| Indian states | Full dropdown in admission & address forms |
| Category fields | General / OBC / SC / ST / EWS |
| PF/ESI/UAN | Payroll compliance fields |
| Cash on hand | INR currency formatting throughout |

---

## 6. Frontend Architecture

### 6.1 Route Structure
```
/ (Login)
/dashboard          → role-based dashboard redirect
/admissions         → 5-step admission wizard
/students           → student management
/staff              → staff management
/academics          → classes, subjects, timetable
/attendance         → attendance management
/examinations       → exams, results
/grades             → gradebook
/fees               → fee management
/finance            → finance dashboard (income, expenses, budget)
/library            → library management
/transport          → transport management
/hostel             → hostel management
/communication      → messaging & announcements
/security           → security dashboard (login attempts, Redis)
/reports/*          → exam, marks, class analysis reports
/analytics          → school analytics charts
/superadmin/*       → school management, user management
```

### 6.2 Form Architecture (Production Grade)
All major forms use the following pattern:
```tsx
useForm<FormData>({
  resolver: zodResolver(schema),
  mode: "onChange",
  defaultValues: { ... },
})
```

Multi-step wizards with per-step validation:
```tsx
const handleNext = async () => {
  const stepKeys = Object.keys(STEP_SCHEMAS[step].shape) as (keyof FormData)[];
  const valid = await form.trigger(stepKeys);
  if (valid) setStep(s => s + 1);
};
```

### 6.3 API Integration Pattern
```typescript
// Services use apiClient (axios instance with JWT interceptor)
export const financeApi = {
  getStats: () => apiClient.get<FinanceStatsDto>('/finance/stats').then(r => r.data),
  // ...
};

// Components use TanStack Query
const { data, isLoading } = useQuery({
  queryKey: ['finance-stats'],
  queryFn: financeApi.getStats,
});

const mutation = useMutation({
  mutationFn: financeApi.addIncome,
  onSuccess: () => { toast.success('Income recorded'); queryClient.invalidateQueries(...); },
});
```

---

## 7. Database Schema (Key Tables)

All entities extend `BaseEntity`:
```sql
-- BaseEntity columns (present on every table)
Id          UUID           PRIMARY KEY DEFAULT gen_random_uuid()
CreatedAt   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
UpdatedAt   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
CreatedBy   UUID           NULLABLE (FK → Users.Id)
UpdatedBy   UUID           NULLABLE (FK → Users.Id)
IsDeleted   BOOLEAN        NOT NULL DEFAULT FALSE
DeletedAt   TIMESTAMPTZ    NULLABLE
RowVersion  BYTEA          -- optimistic concurrency
```

```sql
-- Core entities
Students (Id, SchoolId, Name, FirstName, MiddleName, LastName,
          AdmissionNumber, DateOfBirth, Gender, Status,
          ClassId, SectionId, AcademicYearId,
          GuardianStaffId UUID NULLABLE REFERENCES Staff(Id),  -- ← new May 2026
          AadharNumber[masked], ParentId, PhotoUrl, ...)

Staff    (Id, SchoolId, EmployeeId, FirstName, LastName, Email, Phone,
          DateOfBirth, Gender, Department, Designation,
          PanNumber[masked], AadharNumber[masked],
          BankAccountNumber[encrypted], PfNumber, EsiNumber, UanNumber, ...)

AcademicYears (Id, SchoolId, Name, StartDate, EndDate,
               IsCurrent BOOLEAN NOT NULL DEFAULT FALSE,  -- single true per school
               Status VARCHAR(20), ...)

-- Note: Only ONE AcademicYear per school may have IsCurrent=TRUE at any time.
-- SetCurrentAcademicYearAsync atomically updates this with a single transaction.

Classes  (Id, SchoolId, Name, SectionCount, ...)
-- Note: No AcademicYearId — classes are school-wide configurations.

Sections (Id, ClassId, Name, MaxStrength, ...)

Subjects       (Id, SchoolId, Name, Code, Type[Core/Elective], ...)
ClassSubjects  (Id, ClassId, SubjectId, TeacherId NULLABLE, AcademicYearId, ...)

-- Finance
FinanceAccounts    (Id, SchoolId, Name, Type[ASSET/LIABILITY/EQUITY/INCOME/EXPENSE], Balance)
FinanceTransactions(Id, AccountId, CategoryId, Amount, Type[DEBIT/CREDIT], Date, Description, ...)
FinanceCategories  (Id, SchoolId, Name, Type[INCOME/EXPENSE], Budget)
PettyCashEntries   (Id, SchoolId, Amount, Purpose, Status[PENDING/APPROVED/REJECTED], ...)
StoreSales         (Id, SchoolId, Amount, ItemsCount, PaymentMethod, InvoiceNumber, ...)

-- Fees
FeeStructures (Id, ClassId, AcademicYearId, ComponentName, Amount, DueDate, LateFeePct)
FeePayments   (Id, StudentId, AcademicYearId, Amount, Status[PENDING/PAID/FAILED],
               CashfreeOrderId, PaymentDate, ...)
FeeConcessions(Id, StudentId, Type[RTE/MERIT/STAFF_CHILD/OTHER], DiscountAmount, ApprovedBy)

-- Academic
Examinations (Id, SchoolId, ClassId, SubjectId, Name, MaxMarks, PassMarks, ExamDate, ...)
ExamResults  (Id, ExaminationId, StudentId, MarksObtained, Grade, ...)
Attendance   (Id, StudentId, ClassId, SectionId, Date, Status[Present/Absent/Late/Excused])
```

**Key index recommendations:**
```sql
CREATE INDEX idx_students_school ON "Students"("SchoolId") WHERE "IsDeleted" = FALSE;
CREATE INDEX idx_students_guardian_staff ON "Students"("GuardianStaffId") WHERE "GuardianStaffId" IS NOT NULL;
CREATE INDEX idx_academic_years_current ON "AcademicYears"("SchoolId") WHERE "IsCurrent" = TRUE;
CREATE INDEX idx_class_subjects_class ON "ClassSubjects"("ClassId");
CREATE INDEX idx_attendance_student_date ON "Attendance"("StudentId", "Date");
CREATE INDEX idx_fee_payments_student ON "FeePayments"("StudentId");
```

---

## 8. Observability & Infrastructure

### 8.1 Logging
```
Serilog → Console → File (logs/*.log) → Seq (OTLP)
  structured JSON logs
  enriched with: TraceId, UserId, SchoolId, Method, StatusCode
```

### 8.2 Health Checks
- `/health` — liveness probe
- `/health/ready` — readiness (DB + Redis)
- `/health-ui` — dashboard UI

### 8.3 Docker
```yaml
# docker-compose.yml
services:
  sms-api:   ASP.NET Core 8 API (port 5092)
  postgres:  PostgreSQL 16 (port 5432)
  redis:     Redis 7 (port 6379)
  seq:       Seq log aggregator (port 5341)
```

---

## 9. Testing

| Layer | Location | Count | Status |
|-------|----------|-------|--------|
| Unit Tests | `SmsApi.Tests/` | 724 | ✅ All passing |
| Integration Tests | `SmsApi.IntegrationTests/` | 8/26 | 🟡 JWT factory limitation |
| Frontend | `ui/src/tests/` | 10 | ✅ Passing |

**Run all tests:**
```bash
dotnet test SmsApi.Tests
dotnet test SmsApi.IntegrationTests
```

For detailed test architecture, known issues, and templates see [TESTING_INFRASTRUCTURE.md](./TESTING_INFRASTRUCTURE.md).

---

## 10. Documentation Index

| Document | Purpose |
|----------|---------|
| [TECHNICAL_DOCUMENT.md](./TECHNICAL_DOCUMENT.md) | Architecture, stack, database schema |
| [FUNCTIONAL_DOCUMENT.md](./FUNCTIONAL_DOCUMENT.md) | Feature reference for all modules |
| [AWS_MIGRATION_GUIDE.md](./AWS_MIGRATION_GUIDE.md) | AWS RDS setup, full schema, seed data for fresh deployment |
| [API_DOCS.md](./API_DOCS.md) | REST API reference with examples |
| [CODING_AGENT_GUIDELINES.md](./CODING_AGENT_GUIDELINES.md) | Patterns for developers and AI agents |
| [DEFAULT_CREDENTIALS.md](./DEFAULT_CREDENTIALS.md) | Development credentials and JWT config |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Docker, cloud, migration, env vars |
| [TESTING_INFRASTRUCTURE.md](./TESTING_INFRASTRUCTURE.md) | Test setup, patterns, known issues |
| [MODULE_STATUS.md](./MODULE_STATUS.md) | Production readiness per module |

---

## 10. Configuration Reference

```json
// appsettings.json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=smsdb;Username=postgres;Password=..."
  },
  "JwtSettings": {
    "Secret": "...",
    "Issuer": "SmsApi",
    "Audience": "SmsApiClient",
    "ExpirationInMinutes": 60
  },
  "Redis": {
    "ConnectionString": "localhost:6379"
  },
  "Storage": {
    "Provider": "S3",  // or "Local"
    "S3": {
      "BucketName": "sms-uploads",
      "Region": "ap-south-1",
      "AccessKey": "...",
      "SecretKey": "..."
    }
  },
  "Cashfree": {
    "AppId": "...",
    "SecretKey": "...",
    "BaseUrl": "https://api.cashfree.com/pg"
  },
  "Serilog": {
    "WriteTo": [
      { "Name": "Console" },
      { "Name": "File", "Args": { "path": "logs/log-.txt", "rollingInterval": "Day" } },
      { "Name": "Seq", "Args": { "serverUrl": "http://localhost:5341" } }
    ]
  }
}
```

---

## 11. Running Locally

```bash
# 1. Start infrastructure
docker-compose up -d postgres redis seq

# 2. Run migrations
cd sms-api
dotnet ef database update

# 3. Start API
dotnet run

# 4. Start frontend (in separate terminal)
cd ui
pnpm install
pnpm dev
```

Default URL: API → `http://localhost:5092`, UI → `http://localhost:5173`

---

## 12. Deployment

```bash
# Build production Docker image
docker build -t sms-api:latest .

# Run all services
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f sms-api
```
