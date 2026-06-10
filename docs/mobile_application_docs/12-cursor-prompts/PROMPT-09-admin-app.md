# PROMPT-09: Admin & Principal App Implementation

> **Prompt ID:** PROMPT-09  
> **Epic:** EP-13 — Admin App  
> **Phase:** 3 — Sprint 14  
> **Estimated Story Points:** 24  
> **Prerequisites:** PROMPT-01, PROMPT-02 complete; Backend admin dashboard API built  
> **Related Architecture Docs:** [13-feature-inventory](../13-feature-inventory.md)

---

## Context

Build the Admin/Principal App. Admins are low-frequency but high-importance users — they primarily use the app for approvals, broadcasting announcements, and checking KPI dashboards. The design should emphasize clarity over density.

**Backend context:**
- `GET /api/mobile/admin-dashboard` → **TO BUILD by backend team in Sprint 14**.
- `GET /api/attendance/stats` → School-wide attendance statistics.
- `GET /api/fees/stats` → Fee collection summary.
- `GET /api/leavemanagement/leave-requests?status=pending` → All pending leave requests.
- `PUT /api/leavemanagement/leave-requests/{id}/approve` / `/reject` → Action leave.
- `POST /api/announcements` → Create announcement.
- `GET /api/analytics/dashboard` → Analytics widgets.

---

## Requirements

### Navigation Structure

```
Tab Bar (Admin/Principal):
  Tab 1: Dashboard   icon: layout-dashboard
  Tab 2: Approvals   icon: check-circle  [badge: pending count]
  Tab 3: Post        icon: megaphone
  Tab 4: Reports     icon: bar-chart-2
  Tab 5: More        icon: menu
```

### Screen: Admin Dashboard

**Route:** `/(admin)/`

**Layout:**
```
┌─────────────────────────────────────┐
│  [School Logo]    [Notifications]   │
│  Monday, Jun 10, 2026               │
├─────────────────────────────────────┤
│  TODAY'S ATTENDANCE                 │
│  ████████░░ 87%  (234/268 present)  │
├─────────────────────────────────────┤
│  PENDING APPROVALS           3      │
│  2 staff leave · 1 admission        │
├─────────────────────────────────────┤
│  FEE COLLECTION (Today)             │
│  ₹48,500  •  12 transactions        │
├─────────────────────────────────────┤
│  SCHOOL-WIDE ALERTS                 │
│  ⚠ Subscription expires in 15 days │
└─────────────────────────────────────┘
```

KPI cards:
- School-wide attendance % today.
- Pending approvals with quick "View All" link.
- Fee collected today.
- Any active billing alert.

### Screen: Approvals Center

**Route:** `/(admin)/approvals/`

**Tabs:** "Staff Leave" | "Student Leave" | "Admissions" (if admission module enabled).

**Staff Leave tab:**
- List of pending staff leave requests: staff name, type, dates, reason, days count.
- Bulk select + "Approve All" option.
- Individual approve/reject with remark.
- `PUT /api/leavemanagement/leave-requests/{id}/approve` → staff gets push notification.
- `PUT /api/leavemanagement/leave-requests/{id}/reject` → requires reason.

**Student Leave tab:**
- Same pattern for student leave requests.

**Badge:** Total pending count shown on Approvals tab.

### Screen: Post Announcement

**Route:** `/(admin)/announcements/create`

**Form:**
- Title (required, max 100 chars, char counter).
- Body (rich text area, max 4000 chars).
- Priority: Low / Normal / High / Urgent (radio buttons).
- Audience: All School / Specific Class / Parents Only / Staff Only.
  - If "Specific Class": multi-select class picker.
- Expiry date (optional date picker, default: 30 days from now).
- "Post Announcement" button.

On submit: `POST /api/announcements`.  
For Urgent priority: confirm dialog "This will send a push notification to all recipients."

Announcements list screen showing recent announcements with edit/delete.

### Screen: Reports & Analytics

**Route:** `/(admin)/reports/`

Cards with key metrics (from `/api/analytics/dashboard`):

- **Attendance Trend**: 7-day bar chart (% per day).
- **Fee Collection**: This month vs. last month comparison.
- **Class Performance**: Top 3 classes by avg exam %.
- **Defaulters**: Count of students with outstanding fees > 60 days.

Use lightweight charting: Victory Native XL or react-native-gifted-charts (pick one consistent library).

No complex analytics — just key KPIs that fit on a phone screen.

### Screen: Quick Actions (More Tab)

**Route:** `/(admin)/more`

- Student list (view-only, with search).
- Staff list (view-only, with search).
- Billing status / subscription info.
- Settings: school settings (view-only on mobile, edit redirects to web).
- Notifications.
- Logout.

---

## Implementation Tasks

1. Implement `/(admin)/_layout.tsx` with 5-tab navigator.
2. Backend: `GET /api/mobile/admin-dashboard` endpoint.
3. Implement `/(admin)/index.tsx` (dashboard).
4. Implement `/(admin)/approvals/index.tsx` with tabs.
5. Implement staff leave approve/reject flow.
6. Implement student leave approve/reject flow.
7. Implement `/(admin)/announcements/create.tsx`.
8. Implement `/(admin)/announcements/index.tsx` (list).
9. Implement `/(admin)/reports/index.tsx` with charts.
10. Implement More tab with student/staff list and billing status.
11. Implement pending count badge on Approvals tab.

---

## Acceptance Criteria

- [ ] Admin dashboard loads in < 2s with school-wide stats.
- [ ] Pending approval count shown correctly on tab badge.
- [ ] Staff leave approval sends push notification to staff member.
- [ ] Announcement creation with Urgent priority shows confirmation.
- [ ] Analytics charts render correctly with real data.
- [ ] Billing alert shown if subscription expiring < 30 days.
- [ ] Bulk approve works for up to 10 items.

---

## Definition of Done

- [ ] All acceptance criteria pass.
- [ ] Charts do not crash with empty data sets.
- [ ] Announcement form validates all required fields.
- [ ] Peer review complete.
