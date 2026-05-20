# sms-api — Functional Document

> School Management System — Complete Feature Reference for Administrators and End Users

**Version:** 2.8 | **Last Updated:** May 21, 2026 (Session 10) | **Project:** SMSRepoA

---

## Changelog — May 21, 2026 (Session 10)

| Area | Change |
|------|--------|
| **Billing Management — Super Admin** | Super admins can now manage subscription billing for every school directly from the platform. A dedicated **Billing** tab has been added to the Super Admin Dashboard, listing all schools with their current plan, billing status, expiry date, and days remaining. Clicking a school row populates an inline edit form where the super admin can update: **Plan** (Standard / Pro / Enterprise), **Status** (Active / Inactive / Suspended / Trial), **Expiry Date**, and **Renewal Reminder Days** (1–365). Saving writes changes immediately to the database via `PUT /api/school-feature-permissions/schools/{id}/billing`. |
| **Billing Management — Super Admin Header Dropdown** | The **Billing** menu item in the super admin header dropdown opens a role-aware `BillingDialog`. For super admins, this is a full management form with a school selector (synced to the header school context switcher), all four editable fields, and a Save button. For admin users, the same menu item opens a read-only view (see below). |
| **Billing Notifications — Admin Login Toast** | When an admin logs in, the dashboard automatically checks the school's billing status via `GET /api/school-feature-permissions/billing-notification`. If the subscription is expiring soon or has expired, a toast notification fires: amber `toast.warning` for upcoming expiry, red `toast.error` for critical (≤ 7 days or already expired). The toast shows only once per browser session — subsequent navigations do not repeat it (gated via `sessionStorage`). |
| **Billing Dialog — Admin Read-Only View** | The **Billing** item in the admin header dropdown opens a read-only billing card showing the school's current plan badge (colour-coded), status badge, expiry date, and a "Contact Vitana" call-to-action. An amber banner appears when the subscription is expiring soon; a red banner appears when it is expired. No editable fields are shown to admin users. |
| **Super Admin UI Fixes (previous session carry-over)** | `MobileBottomNav` now returns `null` for `super_admin` users — the mobile bottom bar was previously showing generic navigation items that don't apply to the super admin role. `AuthContext` was updated to use lazy state initialization, eliminating a black screen / dark flash on first load. |

### Billing severity model

| Severity | Condition | UI behaviour |
|----------|-----------|--------------|
| `info` | Expiry is more than `renewalReminderDays` away | No warning — `hasWarning: false` |
| `warning` | Within `renewalReminderDays` of expiry | Amber toast on admin login; amber banner in Billing dialog |
| `critical` | Expired **or** ≤ 7 days remaining | Red `toast.error` on login; red banner in Billing dialog |

### Billing plan tiers

| Plan | Target school size | Default |
|------|--------------------|---------|
| Standard | Small schools (< 500 students) | ✅ |
| Pro | Medium schools (500–2000 students) | |
| Enterprise | Large chains / group schools | |

---

## Changelog — May 19, 2026 (Session 9)

| Area | Change |
|------|--------|
| **Super Admin — IsOnboarded Detection** | The School Management table in the super-admin portal now shows whether a school has already been onboarded. A green **🚀 Onboarded** pill badge appears below the school name for schools that have a live Admin login. The "Setup" (rocket) button is disabled with 40% opacity and a `not-allowed` cursor for onboarded schools — preventing accidental re-runs of the onboarding wizard. The Onboarding Wizard itself now blocks re-entry: if you type a school code that belongs to an already-onboarded school, a 🚫 message appears explaining the school is already fully set up, and the Next button is disabled. This is distinct from the ⚠️ message shown when a code is in use by a non-onboarded school. No database schema change was required — `IsOnboarded` is computed at query time from the presence of an Admin-role `UserLogin` for the school. |
| **Examinations — Co-Scholastic tab renamed** | The Co-Scholastic tab in the Examinations module has been renamed to **"Co-Scholastic & CCE"** to accurately reflect that this tab covers both Co-Scholastic grading areas and the CCE (Continuous and Comprehensive Evaluation) framework. |
| **Examinations — CCE Report Cards tab renamed** | Inside the Co-Scholastic & CCE tab, the "Report Cards" sub-tab has been renamed to **"CCE Report Cards"** to distinguish it clearly from the main Examinations report cards. |
| **Admissions Module — Re-enabled in Admin Sidebar** | Admissions Management is now visible in the admin/super-admin sidebar under **PEOPLE & ENROLLMENT**, between Staff and the Academics section. The module was previously implemented but its navigation link had been removed. The route (`/admissions`) was already protected and wired; only the sidebar entry was missing. |
| **Admissions — Applications Table Actions** | The actions column in the Admissions table has been upgraded from a plain status dropdown to a full action set: (1) **Status dropdown** — move applications between Pending → Interviewed → Approved → Waitlisted → Rejected; (2) **Enroll button** (purple, appears only when status is `approved`) — prompts for an admission number and formally enrolls the student; (3) **Edit button** (pencil icon) — opens the full admission form in edit mode; (4) **Delete button** (red trash icon) — confirms and removes the application. Enrolled applications are locked (Edit/Delete disabled, status dropdown disabled). |
| **Admissions — Enroll Workflow** | When an approved application is enrolled, the admin is prompted to enter an admission number. The system calls the dedicated `POST /admissions/applications/{id}/enroll` endpoint (not just a status update), which assigns the admission number and marks the student as enrolled. This is the correct production flow — enrollment is a distinct business action from a status change. |

### Admissions module — full workflow for support staff

| Stage | Action | Status |
|-------|--------|--------|
| Application received | Admin creates new application via "+ New Application" | `pending` |
| Initial review | Admin changes status dropdown | `pending` → `interviewed` / `waitlisted` |
| Interview scheduled | Admin sets status to `interviewed` | `interviewed` |
| Decision | Admin approves or rejects | `approved` / `rejected` |
| Enrollment | Admin clicks purple Enroll button, enters admission number | `enrolled` |
| Edit/Delete | Available for any non-enrolled application | — |

---

## Changelog — May 19, 2026 (Session 8)

| Area | Change |
|------|--------|
| **Fee Management — Fee Head Overrides** | Structural fee exemptions (e.g. "Library Fee waived for this student") are now handled as a **direct reduction to `TotalAmount`**, not as concessions. Admins click the ✎ pencil icon next to any fee head (Tuition, Library, Lab, etc.) in the fee dialog, enter a reduced amount, and click **Save Fee Head Changes**. The override is stored in a new `FeeHeadOverrides` JSON column on the fee record and survives dialog close/reopen. This is an architectural correction — fee head adjustments were previously (incorrectly) going into `DiscountAmount` which bloated the concession figure and made reports misleading. |
| **Fee Management — Remove Concession** | Admins can now remove an active concession directly from the fee dialog. When a concession is applied (`DiscountAmount > 0`), a red **Remove** button appears in the concession panel. Clicking it zeroes out `DiscountAmount`, recalculates `PendingAmount = TotalAmount + LateFee − PaidAmount`, and logs the action to `FeeAuditLog`. Previously, the only way to remove a concession was a direct database edit. |
| **Fee Dialog — Live Concession Display** | Fixed: the concession badge in the dialog header and the "Applied / Headroom" info line were reading from the initial prop (`record`) instead of the freshly-fetched live record (`activeRecord`). After applying or removing a concession, the displayed concession amount, the "Total Payable" row, and the "Amount Paid" row now all update immediately without requiring the dialog to be closed and reopened. |
| **Fee Dialog — Total Payable recalculates after concession** | Fixed: the "Total Payable" and "Outstanding Balance" figures in the fee breakdown table now correctly reflect any concession change applied during the same dialog session. Previously they stayed frozen at the value when the dialog first opened. |

### Fee Head Override vs. Concession — key distinction for support staff

| | Fee Head Override | Concession / Waiver |
|---|---|---|
| **What it does** | Reduces the fee head amount for this student permanently | Applies a discount credited against the existing fee total |
| **Affects** | `TotalAmount` (directly reduced) | `DiscountAmount` (additive, up to 75% cap) |
| **Shows up as** | Amended fee structure for the student | Concession/discount on receipts and reports |
| **Reversible?** | Must re-enter full gross amount via pencil edit | Yes — use the "Remove" button in the concession panel |
| **Use case** | Student is genuinely exempt from a fee category (e.g. staff child, scholarship) | Partial waiver for financial hardship, merit award, sibling discount |

---

## Changelog — May 16, 2026 (Session 7)

| Area | Change |
|------|--------|
| **Staff Deactivation — Two-Step Dialog** | The "Deactivate" action on a staff profile now opens a two-step dialog. **Step 1:** Shows the number of pending (ungraded) assignments the staff member still owns — warns the admin before proceeding. **Step 2:** Confirmation with three immediately downloadable HR documents: **Experience Certificate**, **Relieving Letter**, and **No Dues Certificate** (generated as PDFs with school branding). |
| **Staff Deactivation — Portal Access Revoked** | When a staff member is deactivated, their portal login is now blocked immediately: `UserLogin.Status` is set to `"inactive"` and their refresh token is cleared. Any active browser session is terminated on the next API call — no manual intervention required. |
| **Staff Login — Inactive Guard** | Even if `UserLogin.Status` is stale, an inactive staff member cannot log in. The login endpoint queries `StaffMember.Status` directly at login time, identical to how parent/student deactivation is enforced. |
| **Exam Results — Class + Section Filter** | The Examination Results tab now has a cascading **Class → Section** filter instead of a status dropdown. Admins select a class, then a section, and results load for that group. Matches the UX pattern used in attendance and assignments. |

---

## Changelog — May 15, 2026 (Session 6)

| Area | Change |
|------|--------|
| **Student CSV Import — Generous Parser** | `ParseStudentCsv` completely rewritten. Accepts column aliases (`fname`, `dob`, `mobile`, `aadhar`, etc.), 15 date formats (DD/MM/YYYY, YYYY-MM-DD, d MMM yy, …), gender shortcuts (`M`→`male`, `F`→`female`, `boy`, `girl`), status aliases (`enrolled`→`active`, `passed`→`graduated`), and boolean variants (`yes`/`y`/`1`→true). Blank rows silently skipped. Aadhar normalised to 12 plain digits; PAN auto-uppercased. |
| **Staff CSV Import — Rewritten** | `ParseStaffCsv` replaced from brittle positional column access (col[0]…col[30]) to header-name lookup. Supports column aliases (`empid`, `fulltime`, `joining_date`, etc.). Uses same flexible date/gender/status normalisation as student parser. `Experience` and `Salary` parse silently with a warning if non-numeric; never block the row. |
| **Student Service — Better Validation Errors** | `BulkImportStudentsAsync` now: allows `AdmissionDate` up to 30 days in the future (advance registrations); auto-defaults blank `AdmissionDate` to today; auto-corrects common `Category` typos (`gen`→`General`, `obc-a`→`OBC`); validates PAN length (exactly 10 chars) and Aadhar digit count (exactly 12); all error messages include the actual bad value and a plain-English correction hint. |
| **Staff Service — Normalisation Before Validation** | `ValidateCreateRequest` now normalises gender (`M`→`male`, `Working`→`active`, `Full Time`→`permanent`, etc.) before the HashSet check, so common input variations don't fail validation. PAN length check added. Error messages include the bad value and accepted alternatives. |
| **Import UI — Row-Badge Errors (`ImportButton.tsx`)** | Each error now shows a monospace badge with the row identifier extracted from the backend string (`[ADM-001]`, `Row 3`, or `File error`). Partial-success amber banner shown when some rows imported and some skipped. `catch` block now surfaces `detail` (inner exception text) for SQL truncation errors. Fixed duplicate `ImportButton` declaration that caused `SyntaxError: Identifier already declared` crash on the Students page. |
| **Import UI — Row-Badge Errors (`DataImportManager.tsx`)** | Settings → Data Import page applies the same `parseImportError` helper. Stats replaced with a 2-column imported/skipped grid. Row badges on every error line. Partial-success amber alert instead of silent amber border. |


| Area | Change |
|------|--------|
| **Parent Notifications — Assignment Graded** | When a staff member grades a student's assignment, the student's parent(s) now automatically receive a real-time notification. The notification appears in the parent portal under **Notifications → Assignments tab**. Content includes the assignment title, marks scored, total marks, percentage, and any feedback left by the teacher. Example: *"Assignment 'Muryphy law' has been graded. Marks: 23/40 (57.5%). Feedback: Good effort."* |
| **Parent Notifications — New Assignment** | Fixed: when a new assignment is created for a class, the notification broadcast to parents now correctly reaches all parents registered via the `StudentGuardians` table (was querying wrong/empty legacy tables). |
| **Assignment Tiles — Live Refresh** | Staff assignment tiles (submitted count, graded count, average score) now update immediately when the grading sheet is closed, without requiring a manual page refresh. |
| **My Classes → Assignments Tab** | Fixed: assignments now correctly load in the staff **My Classes** class profile under the Assignments tab. Previously, no assignments appeared due to an API argument order bug. |
| **Staff Sidebar** | Removed the standalone **Grades** navigation item from the staff sidebar. Exam results and grade data remain accessible through the **Examinations** module. |
| **My Classes → Exam Marks Tab** | Renamed from "My Exams" to **"Exams"**. Now shows all published exams for the class (not just exams explicitly assigned to the teacher), ensuring staff can always view and enter marks for their classes. |

## Changelog — May 12, 2026

| Area | Change |
|------|--------|
| **Fee Heads** | New tab in Fee Management: normalised, reusable label catalogue (e.g. Tuition Fee, Lab Fee, Sports Fee). Each head has a name, optional description, and active toggle. School-scoped, unique names enforced. Used as the source of truth when building fee structures, ensuring consistent naming across classes and years. |
| **Fee Terms / Installment Schedule** | New tab: define installment schedules per fee structure. Select a structure, add named terms (e.g. Q1, Q2, Q3, Q4) each with a due date and amount. Parents see terms in their fee portal. |
| **Receipt Templates** | New tab: school branding for printed receipts — header/footer text, logo URL, primary colour, default/active flags. Multiple templates supported; one marked as default is used for all system-generated receipts. |
| **Bulk Fee Payment Upload** | New tab: accountants upload a CSV of fee payments (up to 500 rows) in one shot. Client parses CSV, shows preview table, POSTs to API. Result summary lists successes and failed rows with reasons. CSV template available for download. |
| **Promote Fee Structure** | New action on Fee Terms tab: clone an entire fee structure (with all component amounts) to a new academic year. Optional % increment applied uniformly to all amounts (e.g. 5% annual hike). |
| **Deleted Transactions Audit** | Backend admin endpoint `GET /api/fees/deleted-transactions` surfaces soft-deleted payment records via `IgnoreQueryFilters()` — full audit trail for accountants and super-admins. |
| **Hall Tickets** | New tab in Examination Manager: bulk-generate hall tickets for an exam (select class → exam → enter prefix → generate). Each student gets a unique ticket number (prefix + sequence). View all tickets, export CSV, print. |
| **Co-Scholastic Grading** | New tab in Examination Manager with two sub-tabs: (1) **Student Grading** — search student, pick term (Term 1/Term 2/Annual), assign A+/A/B+/B/C+/C/D/E grade per area; (2) **Manage Areas** — CRUD for school-defined co-scholastic areas (Sports, Arts, Discipline, etc.). |
| **Promote Exam Structure** | Clone an existing exam schedule to a new academic year. |
| **EF Migration applied** | `AddFeeTermsCoScholasticReceiptTemplate` — 6 new tables created and applied on backend startup. |
| **v1 Gap Audit (read-only)** | Full comparison of v1 (vitana-veda-dotnetf) vs SMSRepoA. Result: 85–90% feature-complete. Three critical gaps identified for India market leadership: GPS transport tracking, biometric attendance integration, background job scheduler. |

## Changelog — May 10–11, 2026

| Area | Change |
|------|--------|
| **Assignments (Staff UI)** | Complete rewrite: assignments grouped by class name (not class ID), sections listed under each class; colour-coded class pills in filter bar; section sub-tabs when a class has multiple sections; every assignment card is now clickable → side panel shows submission count, grading count, progress bar, description, assigned-by; section label shown on each card tile |
| **Parent Fee Portal** | Fee breakdown now shows: listed components sub-total + "Other fee heads (not itemised)" gap line + Fee Structure Total + Module Fees (pro-rata) + **Grand Total** — all numbers reconcile to the Pending balance; percentage bars use component sum not stale DB total |
| **Report Pages Bugfix** | Orphaned JSX closing blocks removed from `SubjectPerformance.tsx`, `GradeDistribution.tsx`, `StudentMarks.tsx` — these caused "Failed to fetch dynamically imported module" for the entire Assignments page via Vite's module graph |
| Academic Year Management | Current column removed; status now driven by `isCurrent` flag only; one active year enforced at DB level |
| Academic Year Selector (Header) | Extended to Principal role; amber "Historical" indicator when viewing a past year |
| Subjects Tab (Class Profile) | Subjects loaded from real school API; teacher assignment uses live search bar instead of static dropdown |
| Student Form | Class dropdown no longer filtered by year (classes are school-wide); defaults to current academic year for enrollment |
| Staff Form — PAN | PAN input now converts to uppercase before Zod validation (fixes silent rejection of lowercase input) |
| Staff Form — Children | Edit mode: link/unlink enrolled students as staff member's children (enables fee concession eligibility) |
| Student Edit | New "Staff Parent" tab: search and link a staff member as the student's guardian |
| Guardian-Staff Relationship | `GuardianStaffId` on `Student` entity; bidirectional: staff profile shows linked children, student profile shows linked staff guardian |

---

## 🔑 Demo Credentials (Testing & Development)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@vitanaschools.edu` | `admin-dev-change-me` |

> ⚠️ **Note**: These credentials are for demonstration, testing, and development purposes only. In production, use secure authentication with encrypted credentials.

---

## 1. System Overview

**sms-api** is a production-grade School Management System (ERP) designed specifically for Indian K-12 schools. It covers the full student lifecycle from admission through alumni, with deep India-specific compliance (Aadhaar, PAN, RTE, PF/ESI/UAN, Cashfree payments, INR formatting).

### User Roles
| Role | Access Level |
|---|---|
| `super_admin` | Multi-school management, all modules |
| `admin` | Single-school full access |
| `staff` | Academic modules, own attendance, communication |
| `student` | Own profile, marks, attendance, fees |
| `parent` | Child's profile, marks, attendance, fee payment |

---

## 2. Admissions Module

### 2.1 Online Admission Application (5-Step Wizard)

**Step 1 — Student Information**
- Full name (First + Last), Date of Birth, Gender
- Blood Group, Nationality, Religion
- Category: General / OBC / SC / ST / EWS (for RTE eligibility)
- Aadhaar Number (12-digit, validated + masked on display)

**Step 2 — Contact Details**
- Email address (valid format)
- Mobile number (10-digit Indian)
- Current address, City, State (dropdown with all Indian states), Pincode (6-digit)

**Step 3 — Academic Details**
- Class Applied For, Academic Year
- Previous School Name, Previous Class, Previous Percentage
- Transfer Certificate number

**Step 4 — Parent/Guardian Details**
- Father's Name, Occupation, Mobile
- Mother's Name, Occupation, Mobile
- Guardian phone (if different)
- Annual Household Income (for RTE concession eligibility)

**Step 5 — Additional Information**
- Special Needs (Y/N, with details if yes)
- Extracurricular interests
- Medical conditions / allergies
- Remarks

### 2.2 Admission Management (Admin)
- View all applications with status filters (Pending, Approved, Rejected, Enrolled)
- Search by student name, parent name, mobile
- Filter by class, academic year, category
- Approve/Reject with remarks
- Bulk export to CSV/Excel
- Auto-generate admission number on approval
- Convert approved admission to enrolled student

---

## 3. Student Management

### 3.1 Student Profile
- Personal info, contact details, guardian info
- Academic history (class, section, roll number)
- Attendance record with calendar view
- Fee payment history
- Examination marks + grade reports
- Certificates & documents
- **Guardian Staff Link (new May 2026):** From the "Staff Parent" tab in Student Edit, an admin can search for and link a staff member as the student's guardian. This creates a `GuardianStaffId` FK on the student record and is used for staff-child fee concession eligibility.

### 3.2 ID Cards
- Auto-generate student ID cards (PDF)
- Bulk print for entire class/section
- QR code with student ID

### 3.3 Student Reports
- Exam Performance: subject-wise marks, rank, grade
- Attendance Summary: monthly, annual, pending leaves
- Fee Statement: paid, pending, concessions

---

## 4. Staff Management

### 4.1 Staff Registration (6-Step Wizard)

**Step 1 — Basic Information**
- Name, Designation, Department, Email, Mobile
- Joining Date, Status (Active, Inactive, On Leave, Probation), Address

**Step 2 — Personal Details**
- Date of Birth, Gender, Nationality, Religion, Marital Status

**Step 3 — Professional Details**
- Employment Type (Full-Time, Part-Time, Contract, Guest, Intern)
- Total Experience, Confirmation Date
- Monthly Salary, Annual Leave Entitlement, Working Days
- Subjects/Specialization

**Step 4 — ID & Banking**
- Aadhaar Number (12-digit, validated, masked on display)
- PAN Number (validated format, masked)
- Passport Number (optional)
- Bank Name, Account Number, IFSC Code
- PF Number, ESI Number, UAN Number

**Step 5 — Medical Information**
- Blood Group, Known Allergies, Chronic Conditions
- Emergency Contact (Name, Mobile, Relationship)

**Step 6 — Compliance**
- Highest Qualification, University, Year of Passing
- Verification checklist: Background check, Police clearance, Medical checkup, Document consent
- **Staff's Children (edit mode only, new May 2026):** Link enrolled students as the staff member's children. Search students by name and link/unlink them. Linked children appear in the staff profile and qualify for staff-child fee concessions. Uses the same `GuardianStaffId` FK on the Student entity.

### 4.2 Staff Attendance
- Daily attendance marking (Present / Absent / Late / Half-day)
- Monthly summary reports
- Leave balance tracking
- Staff leave application workflow

### 4.3 Leave Management
- Staff leave application (Casual, Medical, Earned, Maternity)
- Admin approval workflow
- Leave balance auto-deduction
- Leave calendar view

---

## 5. Academic Management

### 5.1 Class & Section Management
- Create classes (Grade 1 – Grade 12 + pre-primary)
- Add sections with max strength
- Assign class teacher
- Subject-class-section mapping
- Classes are **school-wide** configurations (not tied to a specific academic year); the same class structure applies across all years

### 5.2 Subjects & Class Profile
- School-level subject catalogue (Maths, Science, English, Hindi, Social Studies, Physics, Chemistry, Biology, Computer Science, Physical Education, etc.)
- Assign subjects to specific classes
- Each assignment records the subject, class, and an optional assigned teacher
- **Subject assignment dialog (updated May 2026):** Teacher field is now a live **search bar** — type a name and matching staff appear in a dropdown. Replaces the old static dropdown. Subject list loads from the real school database (no mock data).
- Subjects visible in class profile across Timetable, Exam, and Grade modules

### 5.3 Timetable
- Period-wise timetable per class/section
- Teacher schedule view
- Conflict detection (same teacher in two classes)
- Print-ready timetable PDF

### 5.4 Assignments
- Create assignments per subject/class (select class then subject populates from staff's teaching load)
- Set due dates, maximum marks, publish now or save as draft
- **Staff "My Assignments" dashboard** (new May 2026):
  - 4 stat cards: Total Created, Due This Week, Active, Students Reached
  - Assignments grouped by **class name** at top level; sections listed underneath (with sub-header when multiple sections exist)
  - Per-class colour coding with filter pills and section sub-tabs
  - Clickable cards → slide-in detail panel showing: full title, subject + class/section tags, due date countdown, submission count, graded count, grading progress bar, description/instructions
  - Section label (`Class 10 · B`) shown on each card tile
  - Search by title or subject; status filter (Active / Draft / Completed / Overdue)
- Student submission tracking
- Marks entry + feedback

### 5.5 Examinations
- Create exams per class/subject
- Set max marks, pass marks, exam dates
- Batch marks entry
- Auto-grade calculation
- Result publication

### 5.5a Hall Tickets (new May 2026)
- Bulk-generate hall tickets for any scheduled exam
- Workflow: select class → select exam → enter ticket prefix (e.g. `MAY26`) → Generate
- System assigns sequential ticket numbers (prefix + zero-padded sequence, e.g. `MAY26-001`)
- View all tickets in a table (ticket number, student name, class, section)
- **Export CSV** of the full ticket list
- **Print** button triggers browser print with formatted ticket layout
- Accessible from the **Hall Tickets** tab in Examination Manager

### 5.5b Co-Scholastic Grading (new May 2026)
Two-tab panel inside Examination Manager:

**Student Grading tab:**
- Search student by name
- Select assessment term: Term 1 / Term 2 / Annual
- View all configured co-scholastic areas for the school
- Assign a grade (A+, A, B+, B, C+, C, D, E) per area
- Save all grades in a single batch upsert

**Manage Areas tab:**
- CRUD for school-defined co-scholastic activity areas
- Examples: Sports & Games, Art & Craft, Music, Discipline, Community Service
- Area names are unique per school
- Areas appear in student grading, report cards, and transcripts

### 5.6 Grades & CCE
- Letter grades with GPA calculation
- CCE (Continuous Comprehensive Evaluation) support
- Co-scholastic areas grading
- Grade cards generation

---

## 6. Attendance Management

### 6.1 Student Attendance
- Daily roll-call per section
- Biometric / QR code integration ready
- Bulk mark attendance for section
- Late marking with reason
- Attendance reports: monthly, annual, below 75% alerts

### 6.2 Staff Attendance
- Daily staff attendance
- Leave integration
- Salary deduction calculations

---

## 7. Finance Management

### 7.1 Finance Dashboard
**Key Metrics at a Glance:**
- Total Income (with today's income)
- Total Expenses (with today's expenses)
- Net Surplus / Deficit
- Cash on Hand
- Pending Petty Cash approvals

### 7.2 Income Recording
- Select account and category
- Income sources: Fee, Store Sales, Donation, Other
- Date, amount (₹), description
- Automatic account balance update

### 7.3 Expense Recording
- Select account and category
- Expense sources: General, Petty Cash, Store, Donation, Other
- Date, amount (₹), description
- Budget utilization tracking

### 7.4 Petty Cash Workflow
1. Staff submits petty cash request (date, amount, purpose, optional receipt)
2. Admin reviews pending requests
3. Approve → auto-debit from petty cash account
4. Reject with remarks
5. Full audit trail

### 7.5 Store Sales
- Record uniform/book/stationery sales
- Invoice number tracking
- Payment method (Cash, UPI, Card)
- Daily/monthly store revenue reports

### 7.6 Budget Management
- Allocate annual budget per category
- Real-time utilization % tracking
- Color-coded alerts: > 90% utilization = red
- Budget vs Actual bar charts

### 7.7 Reports & Analytics
- Monthly income vs expenses trend (6 months)
- Income by category (pie chart)
- Expenses by category (pie chart)
- Budget utilization progress bars
- Aggregated income sources comparison (this month / last month / YTD)

---

## 8. Fee Management

### 8.1 Fee Structures
- Define fee components per class per academic year
- Tuition fee, lab fee, sports fee, hostel fee, etc.
- Set due dates, late fee rules

### 8.1a Parent Fee Breakdown (new May 2026)
The fee breakdown section in the parent portal now shows a fully reconciled breakdown:
1. **Listed components** — each itemised fee head with % and amount
2. **Other fee heads (not itemised)** — gap between listed components and the fee structure total (shown only if > ₹0)
3. **Fee Structure Total** — the base billed amount from the fee record
4. **Module Fees (pro-rata)** — transport + hostel monthly fees prorated to month join date (shown only if applicable)
5. **Grand Total** — equals `Fee Structure Total + Module Fees`, matching the Pending balance exactly

Percentage bars use the listed component sum as denominator for accuracy.

### 8.2 Online Fee Payment (Cashfree Integration)
- Student/parent initiates payment from portal
- Cashfree payment gateway (UPI, Net Banking, Card, Wallet)
- Real-time webhook confirmation
- Automatic payment status update
- PDF receipt generation

### 8.3 RTE Fee Concessions
- Annual income-based eligibility check
- Automatic full/partial concession calculation
- Concession approval workflow
- Government reporting export

### 8.4 Fee Heads Manager (new May 2026)
- Normalised catalogue of reusable fee head labels at school level
- Each head: name, optional description, active/inactive toggle
- Used when building fee structures to ensure consistent naming across classes and years
- Full CRUD table with inline toggle; unique names enforced per school
- Accessible from the **Fee Heads** tab in Fee Management

### 8.5 Fee Terms / Installment Schedule (new May 2026)
- Define installment schedules per fee structure
- Each term: term name (e.g. Q1 April, Q2 July), due date, amount
- Multiple terms per structure; students/parents see upcoming due dates in their portal
- **Promote Fee Structure**: from the Fee Terms panel, clone any structure to a new academic year with optional uniform % increment on all amounts
- Accessible from the **Fee Terms** tab in Fee Management

### 8.6 Receipt Templates (new May 2026)
- School branding configuration for printed fee receipts
- Fields: header text, footer text, logo URL, primary colour
- One template marked as default is used for all system-generated receipts
- Multiple templates supported per school (e.g. school fee receipt vs hostel receipt)
- Accessible from the **Receipt Templates** tab in Fee Management

### 8.7 Bulk Fee Payment Upload (new May 2026)
- Accountants upload a CSV file with up to 500 payment rows
- Client-side CSV parse → preview table before confirmation
- POST to API processes all rows in a single transaction
- Result summary shows: success count, failed rows with reason
- CSV template downloadable from the upload panel
- Accessible from the **Bulk Payment** tab in Fee Management

### 8.8 Fee Reports
- Class-wise collection summary
- Defaulter list (overdue payments)
- Day-book (daily collection report)
- Annual fee statement per student

---

## 9. Communication & Notifications

### 9.1 Announcements
- School-wide announcements
- Target by role (all, staff only, parent/student)
- Rich text with attachments
- Push notification delivery

### 9.2 Messaging
- Staff-to-parent direct messaging
- Circular distribution
- SMS integration ready (configurable)

### 9.3 Notifications
- Fee payment reminders
- Attendance alerts (below threshold)
- Exam schedule notifications
- Result publication alerts

---

## 10. Library Management

- Book catalog with ISBN, author, publisher, category
- Issue and return tracking
- Due date management + fine calculation
- Student borrowing history
- Low stock alerts

---

## 11. Transport Management

- Route definition with stops and timings
- Vehicle assignment (bus number, driver, capacity)
- Student-route assignment
- Transport fee integration with Fee module

---

## 12. Hostel Management

- Room and dormitory allocation
- Student hostel assignment
- Hostel fee integration
- Room availability tracking

---

## 13. Health Records

- Student medical records
- Vaccination tracking
- Sick bay visit logs
- Medical emergency contacts
- Health condition alerts (staff visibility)

---

## 14. Documents & Certificates

- Upload and manage school documents
- Generate and issue:
  - Transfer Certificate (TC)
  - Character Certificate
  - Bonafide Certificate
  - Migration Certificate
  - Study Certificate
- Digital signatures (configurable)
- Document request workflow (staff/student/parent)

---

## 15. Analytics & Reports

### 15.1 School Analytics
- Enrollment trends (monthly/yearly)
- Gender distribution
- Category distribution (GEN/OBC/SC/ST/EWS)
- Fee collection efficiency
- Attendance compliance rates

### 15.2 Academic Reports
- Exam summary (class-wise pass/fail percentage)
- Exam performance (subject-wise average, topper list)
- Student marks detail
- Class analysis (comparative)
- Grade distribution
- Subject performance over time

### 15.3 Advanced Analytics
- Custom date range reports
- Cross-module data correlation
- Export to PDF / Excel

---

## 16. System Administration

### 16.1 Role Management
- Create custom roles with granular permissions
- Assign staff to roles
- Module-level access control

### 16.2 School Settings
- School profile (name, logo, address, contact)
- **Academic Year Management (updated May 2026)**
  - Create, edit, and delete academic years
  - Exactly **one** year is active at a time (`IsCurrent = true`); setting a new year active automatically deactivates all others at the DB level
  - Status column reflects the `isCurrent` flag, not date arithmetic
  - Active year cannot be deleted (protected in UI)
  - Previous / upcoming years show as "Inactive"
- Working days configuration
- Grade scale definition
- Email/SMS gateway configuration

### 16.3 Academic Year Selector (Global Header)
- Admins and Principals can switch the viewing context to any configured year via the header dropdown
- When viewing a **historical year**, the selector turns amber and shows a "Historical" label — a warning note clarifies that no changes affect the current live year
- Staff and Parents are locked to the active year (read-only badge, no dropdown)
- The selected year is persisted in `localStorage` (`selectedAcademicYearName`) and sent as the `X-Academic-Year` header on every API request, enabling all modules (fees, exams, students, attendance) to scope data to the selected year

### 16.4 Security Dashboard
- Live login attempt monitoring
- Failed login alerts by IP / user
- Redis-backed lockout management
- Audit log export

### 16.4 Super Admin Panel
- Multi-school management
- School creation and configuration
- Cross-school reports
- User management across schools

---

## 17. Parent Portal Features

| Feature | Description |
|---|---|
| Child Profile | View complete student profile |
| Attendance | Daily attendance calendar |
| Marks | Subject-wise marks and grades |
| Fee Payment | Online fee payment via Cashfree |
| Fee Statement | Payment history and receipts |
| Notifications | School announcements, fee reminders |
| Communication | Message to class teacher |

---

## 18. Student Portal Features

| Feature | Description |
|---|---|
| Dashboard | Attendance %, upcoming exams, pending fees |
| My Marks | Subject-wise marks, grade card |
| Timetable | Class schedule |
| Assignments | Pending and submitted assignments |
| Notifications | Announcements, exam alerts |

---

## 19. India Compliance Checklist

- [x] Aadhaar number validation and display masking
- [x] PAN number validation (`[A-Z]{5}[0-9]{4}[A-Z]{1}`) — input auto-converts to uppercase before validation (updated May 2026)
- [x] IFSC code validation
- [x] RTE (Right to Education) fee concession workflow
- [x] Category fields: General, OBC, SC, ST, EWS
- [x] All Indian states dropdown
- [x] 10-digit Indian mobile validation
- [x] 6-digit Indian pincode validation
- [x] PF (Provident Fund) number field
- [x] ESI (Employee State Insurance) number field
- [x] UAN (Universal Account Number) field
- [x] INR currency formatting (₹ with en-IN locale)
- [x] Cashfree payment gateway (Indian payment methods)
- [x] Annual income-based RTE eligibility
