# sms-api — Functional Document

> School Management System — Complete Feature Reference for Administrators and End Users

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

### 5.2 Timetable
- Period-wise timetable per class/section
- Teacher schedule view
- Conflict detection (same teacher in two classes)
- Print-ready timetable PDF

### 5.3 Assignments
- Create assignments per subject/class
- Set due dates, maximum marks
- Student submission tracking
- Marks entry + feedback

### 5.4 Examinations
- Create exams per class/subject
- Set max marks, pass marks, exam dates
- Batch marks entry
- Auto-grade calculation
- Result publication

### 5.5 Grades & CCE
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
- Academic year management
- Working days configuration
- Grade scale definition
- Email/SMS gateway configuration

### 16.3 Security Dashboard
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
- [x] PAN number validation and display masking
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
