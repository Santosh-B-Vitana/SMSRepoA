# sms-api — Technical Document

> **Version 2.9** · ASP.NET Core 8 · .NET 8 · React 19 · SQL Server · **Release Candidate**  
> **Last Updated:** May 21, 2026 (Session 10) | **Project:** SMSRepoA

---

## Changelog — May 21, 2026 (Session 10)

| Area | Change |
|------|--------|
| **`Models/Entities/School.cs` — Billing fields** | Added 4 new properties: `BillingPlan` (`nvarchar(50)`, default `"Standard"`), `BillingStatus` (`nvarchar(20)`, default `"Active"`), `BillingExpiryDate` (`datetime2`, nullable), `RenewalReminderDays` (`int`, default `30`). All decorated with `[MaxLength]` where applicable. |
| **`Models/DTOs/SchoolFeaturePermissionDTOs.cs` — Billing DTOs** | Added 3 new DTOs: `SchoolBillingDto` (read model with computed `DaysUntilExpiry`, `IsExpiringSoon`, `IsExpired`), `UpdateSchoolBillingRequest` (partial update; `RenewalReminderDays` has `[Range(1, 365)]`), and `BillingNotificationDto` (notification payload with `HasWarning`, `Message`, `Severity`, and subscription facts). |
| **`Services/ISchoolFeaturePermissionService.cs` — Billing interface** | Added 3 method signatures: `GetSchoolBillingAsync(Guid)`, `UpdateSchoolBillingAsync(Guid, UpdateSchoolBillingRequest)`, `GetBillingNotificationAsync(Guid)`. |
| **`Services/SchoolFeaturePermissionService.cs` — Billing implementation** | Implemented all 3 methods plus a private `BuildBillingDto` helper. `GetBillingNotificationAsync` computes severity: `critical` if expired or `daysUntilExpiry ≤ 7`; `warning` if within `RenewalReminderDays`; `info` otherwise (sets `HasWarning = false`). `UpdateSchoolBillingAsync` only updates fields that are non-null in the request (partial update pattern). |
| **`Controllers/SchoolFeaturePermissionsController.cs` — Billing endpoints** | Added 3 endpoints under `api/school-feature-permissions`: `GET schools/{schoolId}/billing` (`[Authorize(Roles = "SuperAdmin,Admin")]`), `PUT schools/{schoolId}/billing` (`[Authorize(Roles = StatusConstants.Roles.SuperAdmin)]`), `GET billing-notification` (`[Authorize]` — any authenticated user, scoped by tenant context). |
| **`Migrations/20260520000000_AddBillingToSchool.cs`** | Manually authored EF Core migration. `Up()` adds 4 columns to `Schools` with correct defaults. `Down()` drops them. Applied to live DB via direct `sqlcmd` (server was running; `dotnet ef` was blocked by the locked process). Row manually inserted into `__EFMigrationsHistory` so EF does not re-run on startup. |
| **`Migrations/AppDbContextModelSnapshot.cs`** | Billing properties inserted into the `Schools` entity block in the snapshot (after `SchoolCode`, before the next property group). |
| **`ui/src/services/api/superAdminApi.ts` — Billing types + API functions** | Added 3 TypeScript interfaces: `SchoolBilling`, `UpdateBillingRequest`, `BillingNotification`. Added 3 exported API functions: `getSchoolBilling(schoolId)`, `updateSchoolBilling(schoolId, data)`, `getBillingNotification()`. All use existing `apiGet`/`apiPut` helpers (envelope auto-unwrapped). |
| **`ui/src/components/layout/UserMenuDropdown.tsx` — Role-aware BillingDialog** | `BillingDialog` replaced with a role-branching wrapper: `super_admin` → `SuperAdminBillingManager` (school selector synced to `useSuperAdminSchool()` context, editable plan/status/expiry/reminder form, Save button calling `updateSchoolBilling`); all other roles → `AdminBillingViewer` (read-only card with plan badge, status badge, expiry date, amber/red warning banner). `PLAN_COLORS` and `STATUS_COLORS` constant maps control badge styling. |
| **`ui/src/pages/dashboards/SuperAdminDashboard.tsx` — Billing tab** | Added `"Billing"` tab between Feature Toggles and Quick Links. Tab content: school selector, expiry warning alerts, clickable all-schools list (with plan/status/days badges), inline edit form (plan dropdown, status dropdown, expiry date input, reminder days input), Save button with loading state. All wired to `superAdminApi.getSchoolBilling` / `updateSchoolBilling`. |
| **`ui/src/pages/dashboards/AdminDashboard.tsx` — Billing notification toast** | New `useEffect` on mount calls `getBillingNotification()`. If `hasWarning`, fires `toast.error` (critical) or `toast.warning` (warning) with the server-generated message. `sessionStorage` key `billing_notif_shown` gates the call so the toast appears at most once per browser session. Errors are silently ignored (non-blocking). |
| **`ui/src/components/layout/MobileBottomNav.tsx`** | Returns `null` for `super_admin` — prevents the mobile tab bar from showing irrelevant navigation items to super admin users. |
| **`ui/src/contexts/AuthContext.tsx`** | Lazy state initialization added to eliminate the black screen / dark flash on first load. `useState` now uses an initializer function that reads `sessionStorage` synchronously before first render. |

### Billing severity algorithm

```csharp
// Services/SchoolFeaturePermissionService.cs  GetBillingNotificationAsync()
int? days = school.BillingExpiryDate.HasValue
    ? (int)Math.Ceiling((school.BillingExpiryDate.Value - DateTime.UtcNow).TotalDays)
    : null;

bool expired    = days.HasValue && days.Value <= 0;
bool critical   = expired || (days.HasValue && days.Value <= 7);
bool warning    = !critical && days.HasValue && days.Value <= school.RenewalReminderDays;
bool hasWarning = critical || warning;

severity = critical ? "critical" : warning ? "warning" : "info";
```

### Migration deployment pattern (billing columns — same as previous session)

1. Server was running; `dotnet ef migrations add` would fail because the Debug exe was locked.
2. Columns applied directly via `sqlcmd` `ALTER TABLE` statements.
3. Migration file hand-authored (`Up()` / `Down()` SQL written manually).
4. Row inserted into `__EFMigrationsHistory`:
   ```sql
   INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion)
   VALUES ('20260520000000_AddBillingToSchool', '8.0.0');
   ```
5. `AppDbContextModelSnapshot.cs` updated manually to match.

### JWT role claim — how `SuperAdmin` is resolved

```csharp
// Services/TokenService.cs  NormalizeRole()
"super_admin" or "superadmin" => "SuperAdmin"
```

The `superadmin` DB user has `Role = "superadmin"` which normalises to `"SuperAdmin"` in the JWT `ClaimTypes.Role` claim. The `[Authorize(Roles = "SuperAdmin")]` attribute matches this exactly.

---

## Changelog — May 19, 2026 (Session 9)

| Area | Change |
|------|--------|
| **`Services/SchoolFeaturePermissionService.cs` — `GetAllSchoolsAsync`** | `IsOnboarded` is now computed at query time inside the `Select` projection: `IsOnboarded = _context.UserLogins.Any(u => u.SchoolId == s.Id && u.Role == "Admin")`. No EF migration or schema change is required — the value is derived from the existing `UserLogins` table and is recalculated on every request. |
| **`Models/DTOs/SchoolFeaturePermissionDTOs.cs` — `SchoolListDto`** | Added `bool IsOnboarded` property. No annotation needed (no DB column). |
| **`ui/src/services/api/superAdminApi.ts` — `SchoolListItem`** | Added `isOnboarded: boolean` to the TypeScript interface. |
| **`ui/src/pages/superadmin/SchoolManagement.tsx`** | School name cell now wraps the name in a `<div className="flex flex-col">` and renders a green pill badge `🚀 Onboarded` when `school.isOnboarded`. Actions column: per-row Rocket button is `disabled` + `opacity-40 cursor-not-allowed` when `isOnboarded`; active indigo otherwise. |
| **`ui/src/pages/superadmin/SchoolOnboardingWizard.tsx`** | Replaced `existingCodes: Set<string>` with `existingSchools: SchoolListItem[]`. Derived: `matchingSchool`, `codeAlreadyExists`, `codeIsOnboarded`. `validateStep` now differentiates: *"already fully onboarded — cannot run setup again"* vs *"code already in use"*. `StepSchoolProfile` receives `codeIsOnboarded: boolean` prop and renders a `🚫` blocking message for onboarded vs `⚠️` for code-taken. 409 handler refreshes the schools list. |
| **`ui/src/contexts/LanguageContext.tsx`** | `'exams.tabs.cce'` key changed from `'Co-Scholastic'` to `'Co-Scholastic & CCE'`. Applied to both `en` and `hi` locale maps. |
| **`ui/src/pages/CCEManagement.tsx`** | `reportcards` `TabsTrigger` label changed from `'Report Cards'` to `'CCE Report Cards'`. |
| **`ui/src/components/layout/AppSidebar.tsx` — admin nav `PEOPLE & ENROLLMENT`** | Added `{ title: t('nav.admissions'), url: "/admissions", icon: UserPlus, moduleKey: "admissions" }` after the Staff entry. `UserPlus` was already imported. `'nav.admissions'` translation key already existed (`'Admissions'` / `'प्रवेश'`). The route `/admissions` and the `ModuleGuard` wrapper were already in `App.tsx` — only the sidebar entry was missing. |
| **`ui/src/services/admissionService.ts` — `getAuthHeaders()`** | **Security fix.** Was reading the JWT from `localStorage.getItem('token')` (wrong key — the app stores auth in `sessionStorage`). Replaced with: (1) parse `sessionStorage.getItem('auth_session')` → `.token`; (2) fallback to `localStorage.getItem('authToken')`; (3) final fallback to `localStorage.getItem('token')` for legacy compatibility. Matches the pattern used by `ui/src/services/api/apiClient.ts`. |
| **`ui/src/components/admissions/AdmissionsManager.tsx`** | Destructures `enrollApplication` and `deleteAdmission` from `useAdmissions`. Added `handleEnroll(id)` (prompts for admission number, calls `enrollApplication` mutation) and `handleDelete(id, name)` (confirm dialog, calls `deleteAdmission` mutation). Actions column now renders: status dropdown (non-enrolled statuses) + conditional purple **Enroll** button (visible when `status === "approved"`, calls `enrollApplication`) + **Edit** pencil button (opens form in edit mode) + red **Delete** trash button. All action buttons are `disabled` when `status === "enrolled"`. |

### IsOnboarded — how it works (no migration needed)

```csharp
// Services/SchoolFeaturePermissionService.cs  GetAllSchoolsAsync()
Select: new SchoolListDto {
  // ... other fields ...
  IsOnboarded = _context.UserLogins
    .Any(u => u.SchoolId == s.Id && u.Role == "Admin")
}
```

The logic: a school is considered onboarded once the wizard has created an Admin `UserLogin` for it. No extra column or nullable flag is needed on `School`.

### Admissions auth pattern — before and after

```ts
// BEFORE (broken — always null in production)
const token = localStorage.getItem('token');

// AFTER (matches AuthContext / apiClient)
let token: string | null = null;
try {
  const raw = sessionStorage.getItem('auth_session');
  if (raw) token = JSON.parse(raw)?.token ?? null;
} catch { /* ignore */ }
if (!token) token = localStorage.getItem('authToken') ?? localStorage.getItem('token');
```

---

## Changelog — May 19, 2026 (Session 8)

| Area | Change |
|------|--------|
| **`Models/Entities/Fee.cs` — `FeeRecord.FeeHeadOverrides`** | New nullable `string?` property (`[MaxLength(2000)]`) added to `FeeRecord`. Stores per-student fee head exemptions as a JSON dictionary (e.g. `{"libraryFee":0,"labFee":500}`). This is the persisted store for structural fee overrides that reduce `TotalAmount` directly. |
| **`Models/DTOs/FeeDTOs.cs` — `FeeRecordResponse`** | `FeeHeadOverrides` property added to the response DTO so the fee dialog can restore saved overrides when reopened. |
| **`Services/FeeService.cs`** | `FeeHeadOverrides` mapped in both `GetFeeRecordByIdAsync` (single record) and `GetFeeRecordsAsync` (list) projections. |
| **`Controllers/FeesController.cs` — `PATCH records/{id}/fee-head-overrides`** | New endpoint: merges the submitted `overrides` dict with any existing overrides on the record, computes `overrideReduction` by comparing each head's new value against the gross structure value, sets `TotalAmount = structureGross − overrideReduction`, recalculates `PendingAmount`, writes the merged dict as JSON to `FeeHeadOverrides`, audit-logs with action `"fee_head_override"`. Does **not** touch `DiscountAmount`. Authorised roles: Admin, Principal, Finance, FinanceOfficer, Accountant. |
| **`Controllers/FeesController.cs` — `POST records/{id}/remove-discount`** | New endpoint: sets `DiscountAmount = 0`, resets `PendingAmount = TotalAmount + LateFeeAmount − PaidAmount`, sets `BalanceAmount = PendingAmount`, marks `Status = "paid"` if `PendingAmount ≤ 0`, audit-logs with action `"discount_removed"`. Authorised roles: Admin, Principal, Finance, FinanceOfficer, Accountant (not Teacher/Staff). |
| **`Controllers/FeesController.cs` — new DTOs** | `FeeHeadOverridesRequest { Overrides: Dictionary<string,decimal>; AppliedBy?: string }` and `RemoveDiscountRequest { Reason?: string; RemovedBy?: string }` added near `InlineDiscountRequest`. |
| **`Migrations/20260518181950_AddFeeHeadOverridesColumn.cs`** | EF migration that adds `FeeHeadOverrides NVARCHAR(2000) NULL` to `FeeRecords`. **Note:** this column was applied to the live database via direct `ALTER TABLE` before the server restarted (to avoid a downtime window). The migration was then inserted into `__EFMigrationsHistory` so EF does not try to run it again on startup. |
| **`Migrations/AppDbContextModelSnapshot.cs`** | `FeeHeadOverrides` property block added to the `FeeRecords` entity in the snapshot (between `DueDate` and `FeeStructureId`). |
| **`ui/src/services/api/feeApi.ts`** | `FeeRecord` interface: added `feeHeadOverrides?: string \| null`. New exported functions: `applyFeeHeadOverrides(recordId, overrides, appliedBy?)` (PATCH) and `removeDiscount(recordId, reason?, removedBy?)` (POST). Both functions added to the `feeApi` export object. |
| **`ui/src/pages/Fees.tsx` — handleApplyAdjustments** | Replaced the old `inline-discount` call with `applyFeeHeadOverrides`. Guard changed from `adjustmentDelta <= 0` to `Object.keys(headOverrides).length === 0`. Response `feeHeadOverrides` JSON merged into `confirmedOverrides`. 75% cap check removed (doesn't apply to structural overrides). |
| **`ui/src/pages/Fees.tsx` — handleRemoveConcession** | New handler: calls `removeDiscount`, refreshes `liveRecord`, recalculates amount field. Uses `setApplyingConcession` as loading state flag. |
| **`ui/src/pages/Fees.tsx` — Remove button** | Added to the concession panel: visible only when `activeRecord.discountAmount > 0` and `canEditFees`. Red destructive button triggers `handleRemoveConcession`. |
| **`ui/src/pages/Fees.tsx` — dialog open effect** | After fetching fresh record, parses `fresh.feeHeadOverrides` JSON into `confirmedOverrides` state so saved overrides are restored when the dialog reopens. |
| **`ui/src/pages/Fees.tsx` — stale prop bug fix (5 locations)** | `record.discountAmount`, `record.totalAmount`, `record.lateFeeAmount`, `record.paidAmount` in the fee breakdown table, the concession badge header, and the fallback grid were all reading from the initial prop (`record`), which never changes. All five replaced with `activeRecord.*` so displayed values reflect the live-fetched record after any concession operation. |

### Fee amount architecture (post-session 8)

```
FeeRecord fields:
  TotalAmount      = gross fee structure total − FeeHeadOverrides reduction
                     (updated by PATCH fee-head-overrides)
  DiscountAmount   = concession/waiver applied (additive, 75% cap)
                     (updated by POST inline-discount; zeroed by POST remove-discount)
  PaidAmount       = sum of completed FeePayment records
  PendingAmount    = TotalAmount + LateFeeAmount − PaidAmount − DiscountAmount
  FeeHeadOverrides = JSON dict {"headKey": reducedAmount, ...}
                     (null = no overrides; gross values come from FeeStructure)

UI display:
  Sub-total      = activeRecord.totalAmount − adjustmentDelta − activeRecord.discountAmount
  Total Payable  = activeRecord.totalAmount − activeRecord.discountAmount
                   + activeRecord.lateFeeAmount − pendingHeadAdjustmentDelta + extraCharges
  Outstanding    = activeRecord.pendingAmount + transportFee + hostelFee
```

### Migration deployment pattern (lesson learned this session)

When using `dotnet ef migrations add --no-build`, the tool uses the **already-compiled** assembly. If the model has been changed but `dotnet build` was not run first, the migration's `Up()` will be empty (no model diff detected). Fix:

1. Always run `dotnet build SmsApi.csproj` before `dotnet ef migrations add`
2. If a migration was created empty, **manually write** the correct `Up()` / `Down()` SQL
3. Apply the column directly to the live DB if the server is currently running (avoids downtime)
4. Insert a row into `__EFMigrationsHistory` to prevent EF from trying to run it again on next startup:
   ```sql
   INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion)
   VALUES ('20260518181950_AddFeeHeadOverridesColumn', '8.0.11');
   ```

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
