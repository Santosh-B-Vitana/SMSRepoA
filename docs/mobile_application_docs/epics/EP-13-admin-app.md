# EP-13: Admin & Principal App

> **Epic ID:** EP-13  
> **Priority:** P1  
> **Estimated Sprints:** 3  
> **Phase:** 3 — Sprint 14  
> **Related Docs:** [13-feature-inventory](../13-feature-inventory.md) · [PROMPT-09](../12-cursor-prompts/PROMPT-09-admin-app.md)

---

## Business Objective

School principals and administrators are constantly asked for decisions and approvals. Currently they must be at their desk with the web portal open. A mobile Admin App means: approving a staff leave request while in a meeting, posting a critical announcement from the field, or checking the school's attendance rate while visiting another campus. This removes a key operational friction point and positions Vitana as a truly mobile-first platform.

## Technical Objective

Build the Admin/Principal App covering: KPI dashboard, leave approval workflow, announcement creation and broadcasting, analytics overview, student/staff quick search, and billing status monitoring.

---

## Current State Analysis

Backend provides:
- `GET /api/attendance/stats` — school-wide attendance.
- `GET /api/fees/stats` — fee collection.
- `GET /api/leavemanagement/leave-requests?status=pending` — pending leaves.
- `PUT /api/leavemanagement/leave-requests/{id}/approve|reject` — approve/reject.
- `POST /api/announcements` — create announcement.
- `GET /api/analytics/dashboard` — dashboard widgets.
- `GET /api/students` / `GET /api/staff` — paginated lists.

Missing: `GET /api/mobile/admin-dashboard` aggregation endpoint.

---

## Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | Admin dashboard with school-wide KPIs for the day |
| FR-2 | Today's attendance rate (% present across all classes) |
| FR-3 | Fee collected today and this month |
| FR-4 | Pending approvals count (staff leave + student leave + admissions) |
| FR-5 | Billing alert if subscription expiring in < 30 days |
| FR-6 | Approve staff leave with optional remark |
| FR-7 | Reject staff leave with mandatory reason |
| FR-8 | Approve student leave (via class teacher delegation or direct) |
| FR-9 | Bulk approve multiple leave requests |
| FR-10 | Create announcement with priority and audience selection |
| FR-11 | Push to all parents/staff for Urgent announcements |
| FR-12 | View recent announcements list (edit/delete own) |
| FR-13 | Quick student search (by name, admission number) |
| FR-14 | Quick staff search (by name, employee ID) |
| FR-15 | Analytics: 7-day attendance trend chart |
| FR-16 | Analytics: fee collection trend (month-on-month) |
| FR-17 | Analytics: exam performance summary |
| FR-18 | Notification center |

---

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | Dashboard loads in < 2s |
| NFR-2 | Leave approval action completes in < 500ms |
| NFR-3 | Announcement form validates before submission |
| NFR-4 | Charts render without crash on empty data |
| NFR-5 | Student/staff search debounced (300ms) |

---

## API Requirements

| Method | Endpoint | Status |
|---|---|---|
| GET | `/api/mobile/admin-dashboard` | TO BUILD |
| GET | `/api/attendance/stats` | Exists |
| GET | `/api/fees/stats` | Exists |
| GET | `/api/leavemanagement/leave-requests?status=pending` | Exists |
| PUT | `/api/leavemanagement/leave-requests/{id}/approve` | Exists |
| PUT | `/api/leavemanagement/leave-requests/{id}/reject` | Exists |
| POST | `/api/announcements` | Exists |
| GET | `/api/announcements` | Exists |
| PUT | `/api/announcements/{id}` | Exists |
| DELETE | `/api/announcements/{id}` | Exists |
| GET | `/api/analytics/dashboard` | Exists |
| GET | `/api/students?search=X&page=1&pageSize=20` | Exists |
| GET | `/api/staff?search=X&page=1&pageSize=20` | Exists |

---

## Mobile Screens

| Screen | Route |
|---|---|
| Admin Dashboard | `/(admin)/` |
| Approvals Center | `/(admin)/approvals/` |
| Staff Leave List | `/(admin)/approvals/staff-leaves` |
| Student Leave List | `/(admin)/approvals/student-leaves` |
| Create Announcement | `/(admin)/announcements/create` |
| Announcements List | `/(admin)/announcements/` |
| Announcement Detail/Edit | `/(admin)/announcements/[id]` |
| Reports Overview | `/(admin)/reports/` |
| Student Search | `/(admin)/students/` |
| Student Profile (view) | `/(admin)/students/[id]` |
| Staff Search | `/(admin)/staff/` |
| Staff Profile (view) | `/(admin)/staff/[id]` |
| Notification Center | `/(admin)/notifications/` |
| Settings | `/(admin)/more/settings` |

---

## Dashboard Widget Design

```
Admin Dashboard — Monday Jun 10
─────────────────────────────────────
  TODAY'S ATTENDANCE
  ██████████░░  87%   (243/280 students)
  Marked: 24/26 classes
─────────────────────────────────────
  PENDING APPROVALS                  [3]
  2 staff leave  ·  1 student leave  [View →]
─────────────────────────────────────
  FEE COLLECTION TODAY
  ₹48,500  ·  14 payments
  Monthly: ₹3,42,000 / ₹8,50,000 target
─────────────────────────────────────
  ⚠ SUBSCRIPTION EXPIRES IN 15 DAYS
  [Contact Vitana to renew]
─────────────────────────────────────
  QUICK ACTIONS
  [+ Announcement]  [Approve Leaves]
```

---

## Announcement Creation Form

```
Create Announcement
────────────────────────────────
Title *              [80 chars max]
─────────────────────────────────
Body *               [rich text area]
                     [4000 chars max]
─────────────────────────────────
Priority
  ○ Low   ● Normal   ○ High   ○ Urgent
─────────────────────────────────
Send To
  ● All School
  ○ Parents Only
  ○ Staff Only
  ○ Specific Classes → [multi-select]
─────────────────────────────────
Expiry Date (optional)
  [Date Picker — default +30 days]
─────────────────────────────────
  [Cancel]              [Post Now]
```

If Priority = Urgent: confirm dialog "Push notification will be sent to all N recipients."

---

## Analytics Charts

Chart library: `victory-native-xl` (works on New Architecture).

| Chart | Type | Data Source |
|---|---|---|
| 7-day attendance trend | Area chart | `/api/analytics` with date range |
| Fee collection monthly | Bar chart | `/api/fees/stats` |
| Class-wise attendance | Horizontal bar | `/api/attendance/stats?groupBy=class` |
| Exam grade distribution | Pie chart | `/api/examinationreports/grade-distribution/{examId}` |

All charts must handle empty state gracefully (show "No data for this period" instead of crashing).

---

## Leave Approval Flow

```
Approvals tab — "Staff Leave" (3 pending)

[Sandeep Kumar]  Casual Leave
Jun 12–14 (3 days)  |  Balance: 7 CL remaining
Reason: "Personal work"
                    [Reject ✕]  [Approve ✓]

Tapping Approve:
  → Optional remark text field (bottom sheet)
  → [Confirm Approval]
  → PUT /api/leavemanagement/leave-requests/{id}/approve
  → Staff gets push notification "Your leave has been approved"
  → Item removed from pending list

Tapping Reject:
  → Mandatory reason text field (bottom sheet, required)
  → [Confirm Rejection]
  → PUT /api/leavemanagement/leave-requests/{id}/reject
  → Staff gets push notification "Your leave was not approved: [reason]"
```

---

## User Stories

| ID | Story | SP |
|---|---|---|
| EP-13-US-01 | Admin dashboard KPIs | 8 |
| EP-13-US-02 | Approve/reject staff leave | 3 |
| EP-13-US-03 | Approve/reject student leave | 2 |
| EP-13-US-04 | Bulk leave approval | 3 |
| EP-13-US-05 | Create and post announcement | 5 |
| EP-13-US-06 | View/edit/delete announcements | 3 |
| EP-13-US-07 | Analytics charts (attendance + fee) | 5 |
| EP-13-US-08 | Quick student + staff search | 3 |
| EP-13-US-09 | Billing status alert | 2 |

**Total:** 34 story points / 3 sprints

---

## Acceptance Criteria

- [ ] Dashboard loads correct school-wide stats.
- [ ] Pending approval badge count matches backend data.
- [ ] Leave approval sends push notification to staff.
- [ ] Reject requires and sends reason.
- [ ] Announcement form validates all required fields.
- [ ] Urgent announcement shows confirmation dialog.
- [ ] Analytics charts render with data and without data.
- [ ] Student search debounced and returns results.
- [ ] Billing alert shown when subscription < 30 days remaining.

---

## Sprint Breakdown

| Sprint | Scope |
|---|---|
| Sprint 14 | Dashboard + approvals + announcement creation + search |
| Sprint 15 | Analytics charts + announcement list management |
| Sprint 16 | Billing alert + student/staff profile views + QA |
