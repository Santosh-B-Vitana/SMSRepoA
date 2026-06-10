# Vitana SMS — Features & Modules Reference

> **Vitana SMS** is a production-grade School Management System (ERP) built for Indian K-12 schools.  
> Stack: ASP.NET Core 8 · React 19 · SQL Server (AWS RDS) · Redis · AWS S3  
> **Version:** 2.9 | **Last Updated:** June 2026

---

## Table of Contents

1. [Super Admin Portal](#1-super-admin-portal)
2. [Authentication & Access Control](#2-authentication--access-control)
3. [Dashboard & Analytics](#3-dashboard--analytics)
4. [Student Management](#4-student-management)
5. [Admissions](#5-admissions)
6. [Staff Management](#6-staff-management)
7. [Academics](#7-academics)
8. [Attendance](#8-attendance)
9. [Examinations & Results](#9-examinations--results)
10. [Fee Management](#10-fee-management)
11. [Finance & Payroll](#11-finance--payroll)
12. [Communication & Announcements](#12-communication--announcements)
13. [Leave Management](#13-leave-management)
14. [Library](#14-library)
15. [Transport](#15-transport)
16. [Hostel](#16-hostel)
17. [Store / Inventory](#17-store--inventory)
18. [Documents & Certificates](#18-documents--certificates)
19. [Parent Portal](#19-parent-portal)
20. [Student Portal](#20-student-portal)
21. [Visitor Management](#21-visitor-management)
22. [Reports & DISE](#22-reports--dise)
23. [Settings & Configuration](#23-settings--configuration)
24. [Security & Audit](#24-security--audit)

---

## 1. Super Admin Portal

> Role: `super_admin` — manages multiple schools on the platform.

| Feature | Description |
|---------|-------------|
| **School Management** | List, add, edit and soft-delete schools. Each school record stores name, code, address, DISE code, board affiliation, logo, and contact details. |
| **School Onboarding Wizard** | 6-step guided wizard: (1) School info, (2) Admin account creation, (3) Academic year setup, (4) Class/section seeding, (5) Fee structure template, (6) Activation. Prevents re-onboarding a school that is already live. |
| **User Management** | Create and manage platform-level users across all schools. Assign roles (`super_admin`, `admin`, `staff`, `student`, `parent`). Reset passwords. |
| **Billing Management** | View and edit subscription plan (Standard / Pro / Enterprise), billing status (Active / Inactive / Suspended / Trial), expiry date, and renewal reminder days per school. Sends amber/red toast notifications to admins on login when subscription is expiring or expired. |
| **School Feature Permissions** | Enable or disable individual modules per school (e.g. Hostel, Transport, Online Exams) to match the purchased plan. |
| **IsOnboarded Detection** | Green "Onboarded" badge and disabled setup button for already-live schools, preventing accidental re-setup. |
| **Platform-level Analytics** | Aggregate statistics across all schools — total students, staff, fees collected, module usage. |

---

## 2. Authentication & Access Control

| Feature | Description |
|---------|-------------|
| **JWT Authentication** | Stateless token-based auth. Tokens expire after 60 min (configurable). Refresh handled on the client via TanStack Query. |
| **Role-Based Access Control (RBAC)** | Five roles: `super_admin`, `admin`, `staff`, `student`, `parent`. Each role gets a tailored sidebar, dashboard and route guards. |
| **Brute-Force Protection** | Redis-backed rate limiting: 5 failed login attempts trigger a 15-minute lockout. Counter resets on successful login. |
| **Permission Scopes & Tiers** | Fine-grained permissions beyond roles — scopes (Domain, Module, Action) and tiers (Academic, Finance & HR, Operations, Communication). Configurable per-role via Role Management UI. |
| **Role Management UI** | Admin can create custom roles, assign permission scopes and tiers, and preview what each role can access. |
| **Public Branding Endpoint** | `GET /api/settings/public-branding` returns school name, logo, and colours before login — used to pre-fill the login page with school identity. |
| **Unified Login** | Single `/login` route for Admin / Staff / Parent. Separate `/super-admin-login` route for platform admins. |
| **Password Security** | BCrypt hashing. Default credentials seeded on first run; admins are required to change them. |

---

## 3. Dashboard & Analytics

### Admin Dashboard
| Feature | Description |
|---------|-------------|
| **KPI Cards** | Total students, staff, attendance rate, fee collection summary for the current academic year. |
| **Fee Collection Chart** | Monthly bar/line chart of fee collected vs. outstanding across the year (Recharts). |
| **Attendance Overview** | Class-wise attendance heatmap for the current week. |
| **Upcoming Events** | Holiday calendar, exam schedule, and announcements merged into a single timeline. |
| **Billing Notification Toast** | Amber/red toast fires once per browser session when the school subscription is expiring or has expired. |

### Staff Dashboard
| Feature | Description |
|---------|-------------|
| **My Classes** | Quick tiles for each assigned class-section with today's attendance status. |
| **My Timetable** | Today's schedule showing subject, class, time slot. |
| **Pending Leaves** | Count of pending leave applications awaiting approval. |
| **Diary Reminders** | Today's diary entries to be posted for assigned classes. |

### Parent Dashboard
| Feature | Description |
|---------|-------------|
| **Child Profile Card** | Photo, class, section, roll number, attendance %. |
| **Fee Summary** | Outstanding dues, last payment date, and quick Pay button. |
| **Attendance Widget** | Child's monthly attendance percentage with present/absent breakdown. |
| **Announcements Feed** | School-wide and class-level announcements in a chronological feed. |
| **Diary View** | Read-only view of diary entries posted by class teachers. |

### Student Dashboard
| Feature | Description |
|---------|-------------|
| **Timetable** | Current day's class schedule. |
| **Attendance Summary** | Personal attendance percentage and subject-wise breakdown. |
| **Recent Results** | Latest exam results with grade and rank. |
| **Assignments Due** | List of upcoming assignment deadlines. |
| **Leave Status** | Status of pending leave requests. |

### Advanced Analytics
| Feature | Description |
|---------|-------------|
| **Exam Performance Trends** | Subject-wise score distribution across multiple exams and academic years. |
| **Class Analysis** | Class-level comparison — average marks, pass/fail ratio, toppers. |
| **Grade Distribution** | Board-aware grade breakdown (IB, CBSE, CAIE, state boards). |
| **Attendance Trends** | Daily/weekly/monthly attendance rates with anomaly detection. |
| **Fee Collection Analytics** | Collection efficiency %, pending by category, concession impact. |

---

## 4. Student Management

| Feature | Description |
|---------|-------------|
| **Student List** | Paginated, searchable, filterable table (by class, section, category, gender, status). |
| **Student Profile** | Full profile page: personal info, parents/guardians, academic history, fee ledger, attendance history, documents. |
| **Multi-step Student Registration** | 5-step form: (1) Personal details, (2) Parent/guardian, (3) Address, (4) Academic info, (5) Documents upload. |
| **Student Edit** | Edit any student field with audit trail. |
| **Soft Delete / Archive** | Deactivate students without deleting data; archived students excluded from active reports. |
| **India-Specific Fields** | Aadhaar (masked), caste category (General/OBC/SC/ST/EWS), religion, mother tongue, RTE eligibility, DISE student ID. |
| **Photo Upload** | Upload student photo (stored in AWS S3). |
| **Academic History** | Per-year class promotions and section assignments. |
| **Class Profile** | View all students assigned to a specific class-section. |
| **ID Card Generation** | Generate printable ID cards for students in bulk or individually. |

---

## 5. Admissions

| Feature | Description |
|---------|-------------|
| **Application Intake** | Create new admission applications (pending → interviewed → approved / waitlisted / rejected). |
| **5-Step Admission Form** | Student details, parent/guardian, address, academic preferences, document upload. |
| **Application Table** | Sortable/filterable table of all applications with inline status change. |
| **Interview Workflow** | Move application to `interviewed` status; add interview notes. |
| **Enrollment** | Approve → Enroll: admin enters admission number, system creates the student record formally via `POST /admissions/applications/{id}/enroll`. |
| **Duplicate Detection** | Warns if an application with the same name + DOB already exists. |
| **Edit & Delete** | Edit any non-enrolled application; delete with confirmation. Enrolled applications are locked (read-only). |
| **Admission Number Assignment** | Configurable prefix + auto-increment number assigned at enrollment. |

---

## 6. Staff Management

| Feature | Description |
|---------|-------------|
| **Staff List** | Paginated, searchable table with role, department, designation filters. |
| **Staff Profile** | Full profile: personal info, qualifications, experience, joining date, bank details, documents. |
| **6-Step Staff Registration** | (1) Personal, (2) Employment, (3) Qualifications, (4) Address, (5) Bank/Salary, (6) Documents. |
| **Staff Edit** | Edit any staff field with change audit log. |
| **Payroll Configuration** | Basic salary, HRA, DA, PF, ESI, and other allowances/deductions per staff. |
| **PF / ESI / UAN Compliance** | Manage Employee Provident Fund, Employee State Insurance, and UAN numbers per staff member. Compliant with Indian statutory requirements. |
| **Staff Tax (Form 16)** | Annual income, TDS, tax-saving declarations. Generate Form-16-like salary certificate. |
| **Leave Allocation** | Annual leave balances per leave type (CL, SL, EL, PL) per staff. |
| **Attendance (Admin View)** | Admin marks/edits staff daily attendance. |
| **Attendance (Staff Self-Service)** | Staff view their own attendance summary and request corrections. |
| **Class Assignments** | Assign staff as class teachers or subject teachers to specific class-sections. |
| **India-Specific Fields** | PAN, Aadhaar, PF number, ESI number, UAN, bank IFSC validation. |

---

## 7. Academics

### Academic Year Management
| Feature | Description |
|---------|-------------|
| **Create / Edit Academic Years** | Define start/end dates; set one year as active/current. |
| **Year Rollover** | At year-end, promote students to next class; archive previous year's data. |

### Class & Section Management
| Feature | Description |
|---------|-------------|
| **Class Manager** | Create classes (LKG–XII), assign board, configure passing percentage, set grade tiers. |
| **Section Manager** | Add multiple sections per class (A, B, C…), assign class teacher, set capacity. |
| **Class Detail** | View enrolled students, assigned subjects, timetable, and settings for each class-section. |
| **Board-Aware Settings** | Class settings pre-fill passing % from the assigned board (e.g. 33% for CBSE). Class-level grade tier overrides take precedence over school and board defaults. |

### Subject Management
| Feature | Description |
|---------|-------------|
| **Subject Catalogue** | Add subjects with code, name, type (Theory / Practical / Co-Scholastic). |
| **Subject Assignment** | Assign subjects to classes; link to specific teachers. |
| **Subject-wise Credit Hours** | Define weekly periods per subject per class. |

### Timetable
| Feature | Description |
|---------|-------------|
| **Timetable Builder** | Drag-and-drop period assignment: class, subject, teacher, room per time slot. |
| **Conflict Detection** | Warns on teacher double-booking or room conflicts. |
| **Substitution Management** | Mark a teacher absent and assign a substitute for the day. |
| **Print / Export** | Generate printable timetable per class or per teacher. |

### Curriculum Planner (Syllabus)
| Feature | Description |
|---------|-------------|
| **Chapter / Unit Planning** | Define syllabus chapters per subject-class-year. |
| **Lesson Plans** | Attach lesson plan documents per chapter. |
| **Coverage Tracking** | Mark chapters as completed; track curriculum coverage %. |
| **Teacher View** | Staff see "My Curriculum" — their assigned subjects and chapter completion status. |

### Board Configuration
| Feature | Description |
|---------|-------------|
| **Multi-Board Support** | 15 boards: CBSE, ICSE, ISC, IB, CAIE (Cambridge), and 10 Indian state boards (MH, TN, KA, AP, GJ, RJ, UP, MP, WB, KL). |
| **School-Level Board Overrides** | Override passing % and grading scale for any configured board at the school level. |
| **Class-Level Overrides** | Further override grade tiers at the class level (highest priority in the chain). |
| **Grade Scale Display** | Colour-coded grade chips in results (IB: 1–7, CAIE: A*–U, CBSE: A1–E2). |

---

## 8. Attendance

### Student Attendance
| Feature | Description |
|---------|-------------|
| **Daily Attendance** | Class teacher marks Present / Absent / Late for each student per day. |
| **Bulk Mark** | Mark all present with one click; individually mark exceptions. |
| **Offline Attendance** | Export attendance sheet to Excel; import back after offline data collection. |
| **Attendance Reports** | Student-wise, class-wise, subject-wise attendance summaries. |
| **Shortage Alerts** | Flag students below attendance threshold (configurable %). |
| **Monthly Summary** | Calendar heatmap showing P/A/L per day per student. |

### Staff Attendance
| Feature | Description |
|---------|-------------|
| **Daily Staff Attendance** | Admin or HR marks staff Present / Absent / Half-day / On-Leave per day. |
| **Teacher Attendance View** | Teachers can view their own attendance history. |
| **Monthly Reports** | Staff attendance summary with leave balance impact. |

---

## 9. Examinations & Results

### Exam Setup
| Feature | Description |
|---------|-------------|
| **Exam Types** | Configure exam types: Unit Test, Mid-Term, Final, Quarterly, etc. |
| **Exam Schedule** | Create exam timetable with date, subject, time, venue, and max marks. |
| **Mark Entry** | Enter marks per student per subject. Bulk import via Excel. |
| **Theory + Practical** | Separate mark entry for theory and practical components. |

### Online Examinations
| Feature | Description |
|---------|-------------|
| **Question Bank** | Create MCQ, short-answer, and descriptive questions with tags. |
| **Online Test Creation** | Assemble tests from question bank; set duration, marks, instructions. |
| **Student Attempt** | Students attempt tests in-browser with timer and auto-submit. |
| **Auto-Grading** | MCQ responses auto-graded; descriptive flagged for manual review. |
| **Result Publication** | Publish results; students and parents see scores after release. |

### Results & Report Cards
| Feature | Description |
|---------|-------------|
| **Results Manager** | Compute totals, percentages, grades, rank within class. |
| **Board-Aware Grading** | Grade calculated from the configured board's scale (class → school → board → system fallback). |
| **Report Card Generation** | PDF report cards generated with QuestPDF: student photo, marks, grades, attendance %, teacher remarks, principal signature. |
| **CCE / Co-Scholastic** | CBSE-style Continuous & Comprehensive Evaluation grading for Work Education, Art, Sports etc. |
| **Result Portal** | Students view their results online via a dedicated portal. |
| **Exam Performance Reports** | Subject-wise analytics, class toppers, grade distribution, pass/fail statistics. |

### Assignments
| Feature | Description |
|---------|-------------|
| **Assignment Creation** | Teachers create assignments with title, description, due date, subject, class. |
| **Student Submission** | Students submit work (file or text) via the student portal. |
| **Grading & Feedback** | Teacher reviews submission, assigns marks, adds comments. |
| **Status Tracking** | Pending / Submitted / Graded / Late status per student per assignment. |

---

## 10. Fee Management

| Feature | Description |
|---------|-------------|
| **Fee Structure Setup** | Define fee heads (Tuition, Library, Lab, Sports, Transport, etc.) per class per academic year. |
| **Fee Head Overrides** | Per-student overrides on individual fee heads (structural exemptions stored in `FeeHeadOverrides` JSON column — does not affect concession figures). |
| **Fee Ledger** | Full per-student fee ledger: total amount, paid, pending, late fee, due date. |
| **Payment Collection** | Collect payment (cash/cheque/online) via collect-payment UI; generates receipt with receipt number. |
| **Fee Concessions** | Apply RTE, sibling, merit, or custom concessions reducing `DiscountAmount`. Remove concession at any time (logs to `FeeAuditLog`). |
| **Late Fee** | Auto-calculate late fee after due date (configurable rate per day or fixed). |
| **Online Payment (Cashfree)** | Integrated with Cashfree payment gateway. Parents pay via UPI, NetBanking, Cards, or Wallets. Webhook handles payment confirmation. Refund workflow supported. |
| **Wallet** | School wallet for advance deposits. Balance deducted against dues. |
| **Payment Gateway** | Admin configures Cashfree merchant credentials via Settings. |
| **Fee Reports** | Class-wise collection summary, defaulter list, concession report, receipt-wise detail. |
| **Bulk Fee Assignment** | Assign fee structure to all students in a class with one action. |
| **Parent Fee View** | Parents see only their child's fees; can initiate online payment. |
| **Student Fee Portal** | Students see their own fee summary and payment history. |
| **RTE Concession Workflow** | Dedicated RTE (Right to Education) fee waiver workflow with govt. reimbursement tracking. |

---

## 11. Finance & Payroll

### Finance Dashboard
| Feature | Description |
|---------|-------------|
| **Income Summary** | Total fee collected, other income sources, monthly trend (Recharts bar + line). Petty cash excluded from income aggregate. |
| **Expense Tracking** | Log expenses by category (Salary, Utilities, Maintenance, Stationery, etc.). |
| **Petty Cash Management** | Separate petty cash register with voucher-based debit/credit. |
| **Budget vs. Actuals** | Budget utilization percentage per expense category per month. |
| **P&L Overview** | Simple income–expense surplus/deficit for any date range. |

### Payroll
| Feature | Description |
|---------|-------------|
| **Monthly Payroll Run** | Generate salary slips for all active staff for a selected month. |
| **Salary Components** | Basic, HRA, DA, TA, Medical Allowance, other allowances. |
| **Deductions** | PF employee share, ESI employee share, TDS, LWF, professional tax, advances. |
| **Net Pay Calculation** | Auto-computed gross pay − deductions = net pay. |
| **Payslip PDF** | Printable/downloadable salary slip per staff per month. |
| **PF / ESI Challan Reports** | Monthly PF (ECR) and ESI challan-ready reports for statutory filing. |

### Staff Tax (Form 16)
| Feature | Description |
|---------|-------------|
| **Annual Salary Summary** | Gross salary, taxable income, standard deduction, HRA exemption. |
| **TDS Deducted** | Month-wise TDS breakup. |
| **Tax Saving Declarations** | 80C (LIC, PPF, ELSS), 80D (Mediclaim), HRA, LTA, NPS. |
| **Form 16 Generation** | Part A (employer TDS certificate) and Part B (computation). |

---

## 12. Communication & Announcements

### Announcements
| Feature | Description |
|---------|-------------|
| **Create Announcement** | Admin/staff create announcements with title, body, priority (Low / Normal / High / Urgent), audience (All / Class / Role-specific), and expiry date. |
| **Audience Targeting** | Send to all school, specific class-sections, specific roles, or individual users. |
| **Parent Announcements** | Parents see announcements relevant to their child's class. |
| **Pin / Archive** | Pin critical announcements to the top; auto-archive after expiry. |

### Notifications
| Feature | Description |
|---------|-------------|
| **In-App Notifications** | Bell icon with unread count; real-time notification feed per user. |
| **Notification Types** | Fee due, attendance shortage, exam result published, leave approved/rejected, new announcement, assignment graded. |
| **Mark as Read / Clear All** | Per-user notification management. |

### Diary (Staff–Parent Communication)
| Feature | Description |
|---------|-------------|
| **Daily Diary** | Class teachers post daily diary entries (homework, class activities, reminders) per class. |
| **Parent Diary View** | Parents read diary entries for their child's class. |
| **Staff Diary** | Staff maintain a personal teaching diary (lesson notes, observations). |

### School Connect
| Feature | Description |
|---------|-------------|
| **Messaging** | Direct messages between staff and parents within the platform. |
| **Group Chats** | Class-level group channels for teacher-parent communication. |
| **Broadcast** | Staff broadcast messages to all parents of a class. |

---

## 13. Leave Management

### Staff Leave
| Feature | Description |
|---------|-------------|
| **Leave Application** | Staff apply for leave with type (CL/SL/EL/PL), from–to dates, and reason. |
| **Approval Workflow** | Admin/principal approves or rejects with remarks. Email/in-app notification sent. |
| **Leave Balance** | Real-time deduction from annual leave balance on approval. |
| **Leave Calendar** | Month-view calendar showing who is on leave on each day. |
| **Admin Leave Management** | Admin view: all pending applications, bulk approve/reject, leave summary per staff. |

### Student Leave
| Feature | Description |
|---------|-------------|
| **Student Leave Request** | Students (or parents) submit leave requests with reason and dates. |
| **Teacher Approval** | Class teacher approves/rejects; approved leaves marked in attendance. |
| **Leave History** | Full history of leave requests per student. |

---

## 14. Library

| Feature | Description |
|---------|-------------|
| **Book Catalogue** | Add books with ISBN, title, author, publisher, edition, category, copy count. |
| **Book Issuance** | Issue book to student or staff; track issue date and due date. |
| **Return & Fine** | Process return; auto-calculate overdue fine (configurable rate). |
| **Search & Filter** | Search by title, author, ISBN, category; filter by availability. |
| **Library Reports** | Books issued per class, overdue list, popular books, fine collected. |
| **Digital Resources** | Attach links to e-books or digital resources per subject. |

---

## 15. Transport

| Feature | Description |
|---------|-------------|
| **Route Management** | Define bus routes with stops, arrival/departure times. |
| **Vehicle Management** | Register vehicles with reg. number, capacity, driver, route assignment. |
| **Student Transport Assignment** | Assign students to a bus route and stop. |
| **Driver / Staff Management** | Store driver details (licence, phone, Aadhaar). |
| **Transport Fee** | Transport fee linked to fee management module (route-based pricing). |
| **Tracking Integration** | Placeholder for GPS tracker integration. |
| **Transport Reports** | Students per route, vehicle utilisation, fee collection by route. |

---

## 16. Hostel

| Feature | Description |
|---------|-------------|
| **Hostel Block / Room Management** | Create blocks, floors, rooms; set capacity and type (single/double/dormitory). |
| **Student Allocation** | Assign students to rooms; track occupancy. |
| **Hostel Fee** | Hostel fee linked to fee management (room-type based pricing). |
| **Warden Management** | Assign staff as warden per block. |
| **Attendance (Hostel)** | Daily hostel roll-call attendance separate from academic attendance. |
| **Hostel Reports** | Occupancy %, vacant rooms, student-room list. |

---

## 17. Store / Inventory

| Feature | Description |
|---------|-------------|
| **Item Catalogue** | Add inventory items (books, stationery, uniform, equipment) with unit and reorder level. |
| **Stock Inward** | Record stock received with supplier, quantity, rate, invoice number. |
| **Stock Issue** | Issue items to staff or students; deduct from stock. |
| **Low Stock Alerts** | Highlight items below reorder level. |
| **Inventory Valuation** | Total stock value report using weighted average cost. |
| **Purchase Orders** | Create PO for supplier; link to inward stock. |

---

## 18. Documents & Certificates

| Feature | Description |
|---------|-------------|
| **Document Upload** | Upload and categorise student/staff documents (Aadhaar, birth certificate, PAN, TC, mark sheets). |
| **Document Verification** | Mark documents as verified by admin; show verification status per document. |
| **Certificate Generation** | Generate bonafide certificate, transfer certificate (TC), character certificate, and attendance certificate as PDFs (QuestPDF). |
| **Custom Certificate Templates** | Admin can define custom certificate templates. |
| **Bulk Download** | Download all documents for a student as a ZIP. |
| **ID Cards** | Generate printable ID cards for students (with photo, class, roll no.) and staff (with designation). |
| **Report Card Documents** | Link generated report card PDFs to student document records. |

---

## 19. Parent Portal

| Feature | Description |
|---------|-------------|
| **Child Profile View** | Read-only view of child's full profile. |
| **Attendance View** | Child's daily attendance, monthly summary, shortage alerts. |
| **Fee View & Payment** | Outstanding fees, payment history, Cashfree online payment. |
| **Exam Results** | View published exam results and report cards. |
| **Announcements** | School-wide and class-level announcements. |
| **Diary View** | Read diary entries posted by the class teacher. |
| **Notifications** | In-app notification feed (fee due, attendance alert, result published). |
| **Leave Request** | Submit leave request on behalf of child. |
| **Communication** | Message class teacher via School Connect. |
| **Multi-Child Support** | Parents with multiple children can switch between child profiles. |

---

## 20. Student Portal

| Feature | Description |
|---------|-------------|
| **Profile View** | View own profile. |
| **Timetable** | Current day and weekly class schedule. |
| **Attendance Summary** | Personal attendance % with subject-wise breakdown. |
| **Exam Results** | View published results and grades. |
| **Result Portal** | Dedicated portal to check results by exam/academic year. |
| **Assignments** | View assigned homework; submit work (file upload or text). |
| **Leave Request** | Apply for leave; track approval status. |
| **Notifications** | Notification feed. |
| **Fee Summary** | View own fee dues and payment history. |
| **Library** | View issued books and due dates. |

---

## 21. Visitor Management

| Feature | Description |
|---------|-------------|
| **Visitor Log** | Record visitor name, contact, purpose, whom to meet, entry/exit time. |
| **ID Capture** | Optional Aadhaar / driving licence scan for visitor verification. |
| **Pass Generation** | Print/display visitor pass with unique token. |
| **Expected Visitors** | Pre-register expected guests for faster check-in. |
| **Reports** | Daily visitor log, frequent visitor history, department-wise visits. |

---

## 22. Reports & DISE

### Academic Reports
| Feature | Description |
|---------|-------------|
| **Student Marks Report** | Subject-wise marks for all students in a class for a selected exam. Export to Excel/PDF. |
| **Exam Summary** | Class toppers, highest/lowest/average score, pass %, grade distribution. |
| **Subject Performance** | Subject-wise class performance trend across multiple exams. |
| **Class Analysis** | Side-by-side class comparison (useful for schools with parallel sections). |
| **Grade Distribution** | Board-aware grade breakdown pie/bar chart. |
| **Exam Performance** | Student-level performance trend across the academic year. |

### Attendance Reports
| Feature | Description |
|---------|-------------|
| **Class Attendance Summary** | Month-wise attendance % per class. |
| **Student-wise Report** | Individual student attendance calendar and summary. |
| **Shortage List** | Students below the configured attendance threshold. |
| **Staff Attendance Report** | Monthly staff attendance summary. |

### Fee Reports
| Feature | Description |
|---------|-------------|
| **Collection Summary** | Total collected vs. outstanding per class per month. |
| **Defaulter List** | Students with pending fees sorted by amount. |
| **Concession Report** | Total concessions given by type and class. |
| **Receipt Register** | Date-wise receipt log with amount and payment mode. |

### DISE Report
| Feature | Description |
|---------|-------------|
| **DISE Data Entry** | Enter school infrastructure, resource, and enrolment data as per DISE format. |
| **Student Enrolment Data** | Class-wise enrolment by gender and category (for government reporting). |
| **DISE Export** | Export in Excel/CSV format compatible with UDISE+ portal submission. |

---

## 23. Settings & Configuration

### School Settings
| Feature | Description |
|---------|-------------|
| **School Profile** | Name, address, phone, email, logo, website, DISE code, affiliation number. |
| **Academic Year Settings** | Current academic year, term definitions. |
| **Grading Settings** | Default grade scale, pass percentage (overridden by board config). |
| **Board Configuration** | Add/manage curriculum boards; set school-level overrides. |
| **Feature Toggles** | Enable/disable modules (Library, Transport, Hostel, Online Exams, etc.) visible in sidebar. |
| **Branding** | Upload school logo, set theme colour. |

### User & Role Settings
| Feature | Description |
|---------|-------------|
| **Role Management** | Create custom roles; assign permission scopes and tiers. |
| **User Accounts** | View, reset password, deactivate user accounts. |

### Fee & Finance Settings
| Feature | Description |
|---------|-------------|
| **Fee Heads** | Define global fee heads (Tuition, Library, Lab, Sports, etc.). |
| **Academic Year Fee Structure** | Clone previous year's fee structure or create fresh. |
| **Late Fee Configuration** | Rate type (daily/fixed), grace period. |
| **Payment Gateway** | Cashfree merchant credentials (API key, secret). |

### Communication Settings
| Feature | Description |
|---------|-------------|
| **Email (SMTP)** | Configure sender email, SMTP server, port, SSL. |
| **SMS Gateway** | Placeholder for SMS provider configuration. |
| **Notification Preferences** | Which events trigger in-app / email / SMS notifications. |

---

## 24. Security & Audit

| Feature | Description |
|---------|-------------|
| **Security Dashboard** | Admin view: active sessions, recent login attempts, locked accounts, rate-limit breaches. |
| **Audit Trails** | Soft delete and update history tracked via `CreatedAt`, `UpdatedAt`, `DeletedAt` fields with user attribution. |
| **Fee Audit Log** | Every fee change (concession apply/remove, fee head override, payment) logged to `FeeAuditLog` table. |
| **JWT Token Expiry** | Tokens expire after 60 min (120 min in local dev). |
| **CORS Protection** | Only whitelisted origins allowed. |
| **Rate Limiting** | Login: 5 attempts / 15 min lockout (configurable). |
| **Health Checks** | `/health` endpoint and `/health-ui` dashboard checking DB, Redis, and external service connectivity. |
| **Structured Logging** | Serilog structured logs to console + file (`logs/`). OpenTelemetry traces via OTLP exporter. |

---

## India-Specific Features Summary

| Feature | Details |
|---------|---------|
| **Aadhaar** | 12-digit validation, display masking (XXXX-XXXX-1234) |
| **PAN** | Format validation (AAAAA9999A), display masking |
| **IFSC** | Bank IFSC format validation (used for staff salary bank details) |
| **RTE Concession** | Dedicated workflow for Right to Education fee waivers + govt. reimbursement tracking |
| **Category Fields** | General / OBC / SC / ST / EWS (student & staff) |
| **DISE Reports** | UDISE+ compatible data export for government reporting |
| **PF / ESI / UAN** | Full PF (ECR), ESI, and UAN compliance for staff payroll |
| **Cashfree** | UPI, NetBanking, Debit/Credit Cards, Wallets |
| **State Boards** | MH, TN, KA, AP/TS, GJ, RJ, UP, MP, WB, KL boards with their grading scales |
| **Curriculum Boards** | CBSE, ICSE, ISC, IB, CAIE with correct pass% and grade scales seeded |

---

## Module Roles Matrix

| Module | super_admin | admin | staff | student | parent |
|--------|:-----------:|:-----:|:-----:|:-------:|:------:|
| Super Admin Portal | ✅ | — | — | — | — |
| School Management | ✅ | — | — | — | — |
| Student Management | — | ✅ | View | Self | Child |
| Admissions | — | ✅ | — | — | — |
| Staff Management | — | ✅ | Self | — | — |
| Academics | — | ✅ | View/Edit | View | View |
| Attendance | — | ✅ | Mark | View | View |
| Examinations | — | ✅ | Enter Marks | View | View |
| Fee Management | — | ✅ | — | View | View/Pay |
| Finance & Payroll | — | ✅ | — | — | — |
| Communication | — | ✅ | ✅ | View | View |
| Leave Management | — | ✅ | Apply | Apply | Apply |
| Library | — | ✅ | ✅ | View | — |
| Transport | — | ✅ | — | View | View |
| Hostel | — | ✅ | — | View | View |
| Store | — | ✅ | — | — | — |
| Documents | — | ✅ | View | View | View |
| Visitor Management | — | ✅ | — | — | — |
| Reports & DISE | — | ✅ | Limited | — | — |
| Settings | ✅ | ✅ | — | — | — |
| Security Dashboard | ✅ | ✅ | — | — | — |

---

*Document generated June 2026 — Vitana SMS v2.9*
