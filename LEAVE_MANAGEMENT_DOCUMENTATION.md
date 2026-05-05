# Industry-Grade Leave Management System

## 📋 Overview

This leave management system provides enterprise-level leave request and approval workflows for **staff members**, **students**, and **administrators**. It's designed to handle multiple use cases including digital workers, digitally illiterate staff, and parent-initiated requests, following best practices from top Indian ERP solutions (SAP, Tally, Oracle NetSuite).

## 🎯 Key Features

### 1. **Staff Leave Management**
**Location**: `/leave-management` (Staff Portal)

#### Features:
- ✅ **Real-time Leave Balance Tracking**
  - View allocated days per leave type
  - Track used, pending, and remaining days
  - Visual progress bars for quick status overview
  - Annual leave allocation management

- ✅ **Leave Request Submission**
  - Calendar-based date selection
  - Multiple leave type support (Sick, Casual, Earned, Unpaid, etc.)
  - Minimum 10-character reason requirement
  - Auto-validation of leave balance
  - Date range validation

- ✅ **Request History & Status Tracking**
  - View all past and current requests
  - Status indicators: Pending, Approved, Rejected, Cancelled
  - Expandable details with approver remarks
  - Timestamp tracking for each request

- ✅ **Leave Type Configuration**
  - Configurable leave types with daily limits
  - Paid/Unpaid leave distinction
  - Carry-forward policies
  - Document requirements per type
  - Minimum notice period enforcement

### 2. **Admin Leave Management Dashboard**
**Location**: `/admin-leave-management` (Admin Portal)

#### Features:
- ✅ **Comprehensive Request Overview**
  - Pending count with visual alerts
  - Approval rate metrics
  - Historical statistics (approved, rejected)
  - Separated staff/student request tracking

- ✅ **Advanced Filtering & Search**
  ```
  Filters:
  - Request type (All, Staff, Student)
  - Status (Pending, Approved, Rejected)
  - Leave type (Sick, Casual, etc.)
  - Date range (Today, This Week, This Month, All)
  - Full-text search (Applicant name, Leave type)
  ```

- ✅ **Leave Request Approval Workflow**
  - One-click approve/reject buttons
  - Remarks/comments for approvals and rejections
  - Leave request details modal with:
    - Applicant information
    - Leave dates and duration
    - Reason for leave
    - Current status
  - Real-time status updates

- ✅ **Direct Leave Marking** (For Digital Illiterate Staff)
  ```
  Use Case: Staff cannot use portal, admin marks leave directly
  
  Process:
  1. Click "Mark Leave Directly" button
  2. Select staff member
  3. Select leave type
  4. Enter dates
  5. Add admin remarks
  6. Auto-approves and creates entry
  7. Staff notified of status
  ```

- ✅ **Analytics Dashboard**
  - Total pending approvals
  - Approval rate percentage
  - Staff vs Student request breakdown
  - Average approval time
  - Trends and patterns

### 3. **Student Leave Management (Parent Portal)**
**Location**: `/student-leave-request` (Parent Portal)

#### Features:
- ✅ **Leave Balance Card for Each Child**
  - Student name and roll number
  - Total allocated days
  - Days already used
  - Days remaining
  - Leave type classification
  - Quick-action "Request Leave" button

- ✅ **Parent Leave Request Form**
  - Multi-child support (view all children)
  - Leave type selection with descriptions
  - Date range picker with validation
  - Days preview with balance check
  - Reason requirement (10 chars minimum)
  - Document upload support (medical certificates, etc.)
  - Emergency contact information
  - Pre-validation to prevent insufficient balance requests

- ✅ **Request Notifications**
  - Real-time notification center
  - Request submitted confirmation
  - Approval notifications
  - Rejection with reason
  - Admin direct marking notifications
  - Unread count badge
  - Timestamped history

- ✅ **Leave History & Status Tracking**
  - Table view of all student leave requests
  - Status badges with color coding
  - Leave type and duration display
  - Sortable and filterable history

## 🏗️ Architecture

### Component Structure
```
📁 Components/
├── 📁 leave/
│   ├── AdminLeaveManagementEnhanced.tsx     (Admin Dashboard)
│   ├── StaffLeaveManagerEnhanced.tsx        (Staff Portal)
│   └── ParentStudentLeaveRequest.tsx        (Parent Portal)
└── 📁 communication/ (Legacy components)
    ├── AdminLeaveManagement.tsx
    └── StaffLeaveManager.tsx

📁 Pages/
├── AdminLeaveManagement.tsx                 (/admin-leave-management)
├── LeaveManagement.tsx                      (/leave-management)
└── StudentLeaveRequest.tsx                  (/student-leave-request)

📁 Services/
└── api/
    └── leaveManagementApi.ts                (API Interface)
```

### API Endpoints Used
```
GET  /api/attendance/leave-requests           - Fetch all leave requests
GET  /api/attendance/leave-requests/{id}      - Fetch specific request
POST /api/attendance/leave-requests           - Create new request
PUT  /api/attendance/leave-requests/{id}/approve  - Approve request
PUT  /api/attendance/leave-requests/{id}/reject   - Reject request
GET  /api/attendance/leave-types              - Fetch available leave types
GET  /api/attendance/leave-types/{applicableFor} - Leave types for Staff/Student
```

### Data Models
```typescript
LeaveRequest {
  id: string
  applicantId: string
  applicantName: string
  applicantType: "Staff" | "Student" | "Parent"
  leaveTypeId: string
  leaveTypeName: string
  startDate: Date
  endDate: Date
  totalDays: number
  reason: string
  status: "Pending" | "Approved" | "Rejected" | "Cancelled"
  applicationDate: Date
  approvedByStaffId?: string
  approvedDate?: Date
  approverRemarks?: string
}

LeaveType {
  id: string
  name: string
  applicableTo: "Staff" | "Student" | "Both"
  maxDaysPerYear: number
  isPaid: boolean
  requiresDocument: boolean
  minNoticeDays: number
}

LeaveBalance {
  leaveTypeId: string
  allocatedDays: number
  usedDays: number
  pendingDays: number
  remainingDays: number
  carryForwardDays: number
}
```

## 📊 Workflow Diagrams

### Staff Leave Request Flow
```
┌─────────────────────────────────────────────────────────────────┐
│ STAFF MEMBER                                                    │
│                                                                 │
│ 1. Views Leave Balance Card                                    │
│    └─ Shows: Allocated, Used, Pending, Remaining Days         │
│                                                                 │
│ 2. Clicks "Apply for Leave"                                    │
│    └─ Form opens with date picker                              │
│                                                                 │
│ 3. Fills Request Details                                        │
│    ├─ Selects leave type                                        │
│    ├─ Picks start & end dates                                   │
│    ├─ Enters reason (min 10 chars)                              │
│    └─ System validates balance                                  │
│                                                                 │
│ 4. Submits Request → API → Database                             │
│                                                                 │
│ ↓ Status: PENDING                                               │
│                                                                 │
│ 5. Request appears in History with "Pending" badge             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ ADMIN                                                            │
│                                                                 │
│ 1. Views Admin Leave Dashboard                                 │
│    ├─ Sees statistics: 5 Pending, 22 Approved, 3 Rejected     │
│    ├─ Approval Rate: 88%                                       │
│    └─ Can filter by type, status, date range                  │
│                                                                 │
│ 2. Locates Staff's Request in Table                           │
│    └─ Shows: Name, Type, Dates, Days, Status                  │
│                                                                 │
│ 3. Clicks Approve/Reject Button                               │
│    └─ Opens dialog with request details                        │
│                                                                 │
│ 4. Adds Remarks/Reason                                         │
│    └─ Optional comments for documentation                      │
│                                                                 │
│ 5. Confirms Action → API → Database                            │
│    └─ Updates leave balance if approved                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAFF MEMBER - NOTIFICATION                                    │
│                                                                 │
│ Status Updated: APPROVED/REJECTED                              │
│ Receives notification in app:                                  │
│ ✓ Approval confirmed for Jan 15-20 (3 days)                   │
│ OR                                                              │
│ ✗ Request rejected - Insufficient balance                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Digital Illiterate Staff - Direct Marking Flow
```
┌─────────────────────────────────────────────────────────────────┐
│ SCENARIO: Staff cannot access system (digital illiterate)      │
│                                                                 │
│ Physical Process:                                               │
│ • Staff member visits admin office                             │
│ • Tells admin: "I need leave on Jan 15-17"                    │
│ • Admin notes the information                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ ADMIN - DIRECT MARKING                                          │
│                                                                 │
│ 1. Clicks "Mark Leave Directly" button (+ icon)                │
│                                                                 │
│ 2. Fills Dialog Form:                                           │
│    ├─ Staff Member: "John Smith" (autocomplete)               │
│    ├─ Leave Type: "Sick Leave" (dropdown)                     │
│    ├─ Start Date: 2024-01-15                                   │
│    ├─ End Date: 2024-01-17                                     │
│    └─ Admin Remark: "Medical issue - staff visited office"    │
│                                                                 │
│ 3. Clicks "Mark Leave" Button                                  │
│    └─ System creates leave request                             │
│    └─ Auto-approves (admin authority)                          │
│    └─ Updates staff's leave balance                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ RESULT                                                          │
│                                                                 │
│ ✓ Leave marked: Jan 15-17 (3 days)                             │
│ ✓ Status: APPROVED                                              │
│ ✓ Admin record: "Medical issue - staff visited office"        │
│ ✓ Leave balance updated                                        │
│ ✓ Audit trail maintained                                       │
│                                                                 │
│ Staff sees in their history:                                   │
│ [APPROVED] Sick Leave - Jan 15-17 (3 days)                    │
│ Remark: Admin direct marking - Medical issue                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Parent Student Leave Request Flow
```
┌─────────────────────────────────────────────────────────────────┐
│ PARENT/GUARDIAN                                                 │
│                                                                 │
│ 1. Login to Parent Portal                                      │
│    └─ Navigate to "Student Leave Management"                   │
│                                                                 │
│ 2. View Children Cards (if multiple)                           │
│    ├─ Child 1: Arjun (Total: 10 days, Used: 2, Remaining: 8) │
│    ├─ Child 2: Priya (Total: 10 days, Used: 0, Remaining: 10)│
│    └─ Quick-action button per child                            │
│                                                                 │
│ 3. Clicks "Request Leave" for Arjun                           │
│                                                                 │
│ 4. Opens Request Dialog:                                        │
│    ├─ Leave Type: "Medical" (description shown)               │
│    ├─ Start Date: 2024-01-20 (calendar)                       │
│    ├─ End Date: 2024-01-22                                     │
│    ├─ Days Preview: 3 days (Remaining: 8 ✓)                   │
│    ├─ Reason: "Doctor's appointment required"                │
│    ├─ Document: Upload medical certificate (optional)         │
│    └─ Emergency Contact: +91-98765-43210                       │
│                                                                 │
│ 5. Submits Request                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ ADMIN - STUDENT LEAVE REVIEW                                   │
│                                                                 │
│ 1. Filter: Request Type = "Student"                            │
│                                                                 │
│ 2. Views Request:                                               │
│    ├─ Child: Arjun Sharma (Roll: STU001)                       │
│    ├─ Parent: Rajesh Sharma                                    │
│    ├─ Type: Medical Leave                                      │
│    ├─ Dates: Jan 20-22                                         │
│    ├─ Duration: 3 days                                         │
│    └─ Document: PDF attached                                    │
│                                                                 │
│ 3. Reviews & Approves                                          │
│    └─ With remark: "Document verified"                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PARENT NOTIFICATION                                             │
│                                                                 │
│ Email & In-App: "Arjun's leave for Jan 20-22 approved ✓"      │
│                                                                 │
│ Student Record: Leave marked in attendance as "On Leave"       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Integration with Other Modules

### 1. **Attendance Module**
- Automatically marks student/staff as "On Leave" during approved dates
- Excludes leave days from attendance calculations
- Prevents double-marking

### 2. **Payroll Module**
- Deducts unpaid leave from salary
- Maintains paid leave benefits
- Generates leave cost analysis

### 3. **Reports Module**
- Leave utilization reports
- Approval rate analytics
- Leave type distribution
- Staff/student leave trends

### 4. **Notifications Module**
- Send SMS/Email on status updates
- Parent portal notifications
- Staff reminders for pending requests
- Admin alerts for pending approvals

## ⚙️ Configuration

### Leave Types Configuration
Admins can configure:
```
- Leave Name (Sick Leave, Casual, Earned, Maternity, etc.)
- Applicable To (Staff, Student, Both)
- Max Days Per Year
- Paid/Unpaid Status
- Requires Document Upload
- Minimum Notice Period
- Carry-Forward Policy
- Auto-Expiry Rules
```

### Approval Rules
- Auto-approval for certain leave types
- Escalation to principal if pending > 3 days
- Multiple approval levels (HOD, Principal, Admin)
- Compliance with school policies

## 🔒 Security & Audit

### Access Control
```
Staff:      Can see own requests only
Parent:     Can see own children's requests
Admin:      Full access to all requests
Approver:   Can approve/reject assigned requests
```

### Audit Trail
- All changes logged with timestamp
- Admin remarks recorded
- Approval/rejection history
- Attachment versioning

## 📱 Responsive Design

- ✅ Desktop view (full features)
- ✅ Tablet view (optimized layout)
- ✅ Mobile view (touch-friendly buttons, collapsible forms)
- ✅ Dark/Light mode support

## 🎨 UI Features Aligned with Top ERPs

1. **SAP-style Dashboard**
   - Key metrics at top
   - Filters on the side
   - List with actions

2. **Tally-like Data Entry**
   - Form validation
   - Auto-calculations
   - Clear error messages

3. **Oracle NetSuite Workflows**
   - Multi-step approval process
   - Status tracking
   - Notification system

## 🚀 Getting Started

### For Staff:
1. Go to `/leave-management`
2. View your leave balance
3. Click "Apply for Leave"
4. Fill the form and submit
5. Track status in history

### For Parents:
1. Go to `/student-leave-request`
2. View your children's balance
3. Click "Request Leave"
4. Upload documents if needed
5. Monitor in notifications

### For Admins:
1. Go to `/admin-leave-management`
2. View dashboard statistics
3. Filter requests by various criteria
4. Approve/Reject with remarks
5. Or mark leave directly for staff

## 📞 Support & Customization

For customization needs:
- Leave types specific to your institution
- Approval workflows
- Notification templates
- Report formats
- Integration with existing systems

---

**Compliant with**: Top 10 Indian ERP Solutions
**Standards**: CBSE/ICSE Education Guidelines
**Latest Tech**: React 19, TypeScript, Shadcn UI
