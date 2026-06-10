# EP-05: Student App — Core

> **Epic ID:** EP-05  
> **Priority:** P0  
> **Estimated Sprints:** 3  
> **Phase:** 2 — Sprint 9  
> **Related Docs:** [13-feature-inventory](../13-feature-inventory.md) · [PROMPT-08](../12-cursor-prompts/PROMPT-08-student-app.md)

---

## Business Objective

Students are the highest-volume user segment in the system — every school has more students than teachers or parents. A great Student App drives daily engagement, gives students ownership over their academic journey, and removes friction from assignment submission and result checking. In India, many students use smartphones as their primary computing device. The mobile app must be excellent.

## Technical Objective

Build a complete Student App covering: dashboard, timetable (with offline cache), attendance summary, exam results and report card, assignment viewing and submission (text + file), fee summary view, leave application, and library view.

---

## Current State Analysis

The backend provides:
- `GET /api/students/me` — own student profile.
- `GET /api/timetable?classId=X` — class timetable (student accesses via their classId from profile).
- `GET /api/attendance/my-attendance` — own attendance records.
- `GET /api/examinations/results?studentId=me` — own published results.
- `GET /api/assignments?studentId=me` — own assignments.
- `POST /api/assignments/{id}/submissions` — multipart for file, JSON for text.
- `GET /api/fees/records?studentId=me` — fee summary (read-only).
- `POST /api/attendance/leave-requests` — own leave request.

Missing: `GET /api/mobile/student-dashboard` aggregation endpoint (to be built in Sprint 9).

Student portal on the web (`/student/`) is read-only with limited interaction. The mobile app significantly extends student capabilities (assignment submission, leave requests).

---

## Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | Student dashboard shows today's schedule, attendance, latest result, due assignments |
| FR-2 | Today's timetable with current period highlighted |
| FR-3 | Weekly timetable view (Mon–Fri navigation) |
| FR-4 | Timetable cached in SQLite for offline access |
| FR-5 | Monthly attendance calendar heatmap (P/A/L per day) |
| FR-6 | Attendance % shown with shortage alert if below threshold |
| FR-7 | Published exam results list with overall % and grade |
| FR-8 | Subject-wise marks breakdown per exam |
| FR-9 | Report card PDF viewable |
| FR-10 | Assignment list with due date, subject, status (Pending/Submitted/Graded/Late) |
| FR-11 | Assignment detail with description and attachments |
| FR-12 | Text assignment submission (queued if offline) |
| FR-13 | File assignment submission (photo or document picker, online only) |
| FR-14 | Graded assignments show marks, grade, and teacher feedback |
| FR-15 | Fee summary (read-only; outstanding amount and breakdown) |
| FR-16 | Leave request form with date range and reason |
| FR-17 | Leave status tracking (Pending / Approved / Rejected) |
| FR-18 | Notification center with push notification integration |

---

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | Student dashboard loads in < 2s on 4G on a 2GB RAM Android device |
| NFR-2 | Timetable available offline from SQLite (no network required) |
| NFR-3 | Assignment list renders 30+ items without jank (FlashList) |
| NFR-4 | File upload limited to 10 MB; validate before upload |
| NFR-5 | Due dates in IST timezone (from `@vitana/shared-utils`) |

---

## API Requirements

| Method | Endpoint | Status | Notes |
|---|---|---|---|
| GET | `/api/mobile/student-dashboard` | TO BUILD | Sprint 9 backend task |
| GET | `/api/students/me` | Exists | Own profile |
| GET | `/api/timetable?classId=X` | Exists | Class timetable |
| GET | `/api/attendance/my-attendance` | Exists | Own attendance |
| GET | `/api/examinations/results?studentId=me` | Exists | Own results |
| GET | `/api/examinations/report-cards/{id}` | Exists | Report card PDF URL |
| GET | `/api/assignments?studentId=me` | Exists | Assignment list |
| POST | `/api/assignments/{id}/submissions` | Exists | Text / file submit |
| GET | `/api/fees/records?studentId=me` | Exists | Fee summary |
| POST | `/api/attendance/leave-requests` | Exists | Apply leave |
| GET | `/api/attendance/leave-requests?studentId=me` | Exists | Leave status |
| GET | `/api/library/my-issues` | Exists | Issued books |
| GET | `/api/announcements` | Exists | Announcements |
| GET | `/api/notifications` | Exists | Notifications |

---

## Mobile Screens

| Screen | Route | Tab |
|---|---|---|
| Student Dashboard | `/(student)/` | Home |
| My Timetable | `/(student)/timetable/` | Schedule |
| Timetable Day Detail | `/(student)/timetable/[day]` | Schedule |
| My Attendance | `/(student)/attendance/` | (More) |
| Exam Results List | `/(student)/results/` | Results |
| Exam Result Detail | `/(student)/results/[examId]` | Results |
| Report Card | `/(student)/results/report-card/[id]` | Results |
| Assignments List | `/(student)/assignments/` | Assignments |
| Assignment Detail | `/(student)/assignments/[id]` | Assignments |
| Submit Assignment | `/(student)/assignments/[id]/submit` | Assignments |
| Fee Summary | `/(student)/fees/` | More |
| Apply Leave | `/(student)/leaves/apply` | More |
| Leave Status | `/(student)/leaves/` | More |
| Library | `/(student)/library/` | More |
| Announcements | `/(student)/announcements/` | More |
| Notification Center | `/(student)/notifications/` | More |
| Profile | `/(student)/profile/` | More |

---

## Navigation Flow (Tab Bar)

```
Tab 1: Home (dashboard)
Tab 2: Schedule (timetable, weekly view)
Tab 3: Results (exam list, report card)
Tab 4: Assignments (pending, submitted, graded)
Tab 5: More → (attendance, fees, leave, library, profile, notifications)
```

---

## Assignment Submission Detail Design

```
Assignment Detail Screen
├── Title: "Chapter 5 Summary — Due Jun 15"
├── Subject: Mathematics | Teacher: Mr. Rajan
├── Description: "Write a 500-word summary..."
├── Status Badge: [Pending]
├── Attachments: [Download Reference PDF]
│
├── SUBMISSION SECTION
│   ├── Tab: "Write" (text area, 5000 chars max)
│   └── Tab: "Upload File" (camera / document picker)
│
└── [Submit Assignment] button
     ├── Online: POST → confirm
     └── Offline: Queue → "Will submit when connected"
```

**State machine per assignment:**
```
Pending → [submit] → Submitted → [teacher grades] → Graded
Pending → [past due date] → Late (can still submit)
Submitted → [teacher requests revision] → Revision Requested
```

---

## Offline Strategy

| Feature | Offline Support |
|---|---|
| Timetable view | SQLite cache (pre-loaded on first open with connectivity) |
| Attendance history | TanStack Query stale cache |
| Results | TanStack Query stale cache |
| Assignments list | TanStack Query stale cache |
| Text assignment submission | Offline queue (SQLite) |
| File submission | Online only (too large, needs connectivity) |
| Leave application | Offline queue |
| Fee summary | TanStack Query stale cache |
| Announcements | TanStack Query stale cache |

---

## Push Notification Integration

| Event | From | Deep Link |
|---|---|---|
| `assignment_created` | Teacher creates assignment | `/assignments/{id}` |
| `assignment_graded` | Teacher grades submission | `/assignments/{id}` |
| `result_published` | Admin publishes exam result | `/results/{examId}` |
| `leave_approved` | Teacher approves leave | `/leaves` |
| `leave_rejected` | Teacher rejects leave | `/leaves` |
| `new_announcement` | Admin/teacher posts | `/announcements/{id}` |
| `new_diary_entry` | Teacher posts diary | Announcement-style |

---

## Feature Flag Requirements

| Flag | Effect |
|---|---|
| `library` | Show/hide Library section in More tab |
| `hostel` | Show/hide Hostel card |
| `transport` | Show/hide Transport card |
| `mobile.exams.online_exam_portal` | Show/hide Online Exam Attempt button |

---

## Analytics Requirements

| Event | Properties |
|---|---|
| `student_dashboard_viewed` | `classId`, `grade` |
| `timetable_viewed` | `view: 'day' \| 'week'` |
| `assignment_viewed` | `assignmentId`, `status` |
| `assignment_submitted` | `assignmentId`, `type: 'text' \| 'file'`, `was_offline` |
| `result_viewed` | `examId`, `score`, `grade` |
| `report_card_viewed` | `examId` |
| `leave_applied` | `duration_days` |

---

## User Stories

| ID | Story | SP |
|---|---|---|
| EP-05-US-01 | Student dashboard | 5 |
| EP-05-US-02 | View and submit assignments | 8 |
| EP-05-US-03 | View exam results and report card | 5 |
| EP-05-US-04 | Timetable (weekly) with offline cache | 5 |
| EP-05-US-05 | Monthly attendance calendar | 3 |
| EP-05-US-06 | Leave application | 3 |
| EP-05-US-07 | Fee summary (read-only) | 2 |
| EP-05-US-08 | Library issued books | 2 |

**Total:** 33 story points / 3 sprints

---

## Acceptance Criteria

- [ ] Dashboard loads in < 2s on Android mid-range device.
- [ ] Timetable works offline (airplane mode test).
- [ ] Assignment text submission queues offline and syncs on reconnect.
- [ ] File upload rejects files > 10 MB with clear error.
- [ ] Graded assignments show mark + grade + feedback text.
- [ ] Due assignments sorted soonest-first; overdue in red.
- [ ] Assignment due badge shows count on Assignments tab.
- [ ] Report card opens in browser via Expo WebBrowser.
- [ ] Leave request shows correct status (Pending / Approved / Rejected).

---

## Sprint Breakdown

| Sprint | Scope |
|---|---|
| Sprint 9 | Dashboard + timetable + results + assignments (view + submit) |
| Sprint 10 | Attendance calendar + leave application + fee summary |
| Sprint 14 | Library + online exam portal (if flag enabled) |

---

## Future Enhancements

- Online exam portal (MCQ attempt on mobile).
- Assignment file upload from Google Drive / Dropbox.
- Study material download (syllabus attachments).
- Digital ID card (NFC tap for attendance).
- AI homework helper (Phase 5+).
