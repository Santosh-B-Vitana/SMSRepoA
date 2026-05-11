# sms-api — Functional Document

> School Management System — Complete Feature Reference for Administrators and End Users

**Version:** 2.2 | **Last Updated:** May 11, 2026 | **Project:** SMSRepoA

---

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

### 8.4 Fee Reports
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
