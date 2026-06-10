# EP-04: Teacher App — Attendance & Timetable

> **Epic ID:** EP-04  
> **Priority:** P0  
> **Estimated Sprints:** 3  
> **Phase:** 2  
> **Related Docs:** [10-offline-architecture](../10-offline-architecture.md) · [PROMPT-04](../12-cursor-prompts/PROMPT-04-teacher-app.md)

---

## Business Objective

Teachers spend significant daily time on administrative tasks — attendance marking being the most repetitive. A mobile app that makes attendance marking fast (< 2 minutes per class) and reliable (works offline) delivers immediate, measurable value that drives teacher adoption.

## Technical Objective

Implement the Teacher App with: dashboard, timetable, class list, bulk attendance marking with offline support, attendance summary, student leave management, and teacher own-leave application.

---

## Current State Analysis

Backend provides:
- `GET /api/timetable/my-schedule` — teacher's schedule for the day.
- `GET /api/academics/teacher-assignments` — assigned classes.
- `GET /api/students?classId=X` — students in a class.
- `POST /api/attendance/students/bulk` — bulk attendance submission.
- `GET /api/attendance/stats?classId=X` — class attendance stats.
- `GET/PUT /api/attendance/leave-requests` — student leave management.
- `POST /api/leavemanagement/leave-requests` — teacher's own leave.

Missing: `GET /api/mobile/teacher-dashboard` aggregation endpoint.

---

## Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | Teacher dashboard shows today's schedule and pending tasks |
| FR-2 | Timetable shows today's periods with class, subject, time, room |
| FR-3 | Teacher can view all their assigned classes |
| FR-4 | Student list per class shows photo, name, roll number |
| FR-5 | "Mark All Present" button for bulk marking |
| FR-6 | Individual student status can be toggled (Present / Absent / Late) |
| FR-7 | Attendance submission works offline (queued + synced) |
| FR-8 | Already-marked attendance shows as read-only with edit option |
| FR-9 | Class attendance summary shows % present and students below threshold |
| FR-10 | Teacher can approve/reject student leave requests |
| FR-11 | Teacher can apply for their own leave |
| FR-12 | Push notification on new student leave request |

---

## API Requirements

| Method | Endpoint | Status |
|---|---|---|
| GET | `/api/mobile/teacher-dashboard` | TO BUILD |
| GET | `/api/timetable/my-schedule` | Exists |
| GET | `/api/academics/teacher-assignments` | Exists |
| GET | `/api/students?classId=X` | Exists |
| POST | `/api/attendance/students/bulk` | Exists |
| PUT | `/api/attendance/students/{id}` | Exists |
| GET | `/api/attendance/stats?classId=X` | Exists |
| GET | `/api/attendance/leave-requests` | Exists |
| PUT | `/api/attendance/leave-requests/{id}/approve` | Exists |
| PUT | `/api/attendance/leave-requests/{id}/reject` | Exists |
| POST | `/api/leavemanagement/leave-requests` | Exists |

---

## Mobile Screens

| Screen | Route |
|---|---|
| Teacher Dashboard | `/(teacher)/` |
| Timetable | `/(teacher)/timetable/` |
| My Classes | `/(teacher)/classes/` |
| Class Student List | `/(teacher)/classes/[classId]/` |
| Mark Attendance | `/(teacher)/attendance/[classId]/` |
| Attendance Summary | `/(teacher)/attendance/summary/[classId]/` |
| Student Leave Requests | `/(teacher)/leaves/` |
| Apply Own Leave | `/(teacher)/leaves/apply/` |

---

## Offline Strategy (Critical)

1. On any class open (with connectivity): cache student list in SQLite `cachedStudentLists`.
2. On attendance screen open: load from SQLite if offline.
3. On "Submit": if offline → write to `offlineQueue` + `attendanceDrafts` in SQLite.
4. On reconnect: queue processor sends `POST /api/attendance/students/bulk`.
5. Conflict response (409): show conflict resolution UI.

---

## Analytics Requirements

| Event | Properties |
|---|---|
| `attendance_marking_opened` | `classId`, `date` |
| `attendance_submitted` | `classId`, `total_students`, `present_count`, `was_offline` |
| `attendance_conflict_resolved` | `classId`, `conflict_count` |
| `leave_request_actioned` | `action: 'approved' \| 'rejected'` |

---

## Sprint Breakdown

| Sprint | Scope |
|---|---|
| Sprint 7 | Dashboard + timetable + class list + attendance marking |
| Sprint 8 | Offline attendance queue + SQLite cache + leave management |
| Sprint 14 (Phase 3) | Marks entry (EP-14 scope) |
