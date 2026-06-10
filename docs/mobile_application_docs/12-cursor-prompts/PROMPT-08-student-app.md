# PROMPT-08: Student App Implementation

> **Prompt ID:** PROMPT-08  
> **Epic:** EP-05 — Student App Core  
> **Phase:** 2 — Sprint 9  
> **Estimated Story Points:** 27  
> **Prerequisites:** PROMPT-01, PROMPT-02 complete  
> **Related Architecture Docs:** [13-feature-inventory](../13-feature-inventory.md) · [14-epics-and-user-stories](../14-epics-and-user-stories.md)

---

## Context

Build the complete Student App. Students are high-volume, daily users who primarily access the app on low-end Android devices. Performance and data efficiency are critical.

**Backend context:**
- `GET /api/mobile/student-dashboard` → **TO BUILD by backend team in Sprint 9**.
- `GET /api/students/me` → Own student profile.
- `GET /api/timetable?classId=X` → Class timetable (student uses their class's timetable).
- `GET /api/attendance/my-attendance` → Own attendance records.
- `GET /api/examinations/results?studentId=me` → Own published results.
- `GET /api/assignments?studentId=me` → Assignments for student.
- `POST /api/assignments/{id}/submissions` → Submit text or file.
- `GET /api/fees/records?studentId=me` → Fee summary (read-only).

---

## Requirements

### Navigation Structure

```
Tab Bar (Student):
  Tab 1: Home        icon: home
  Tab 2: Schedule    icon: calendar
  Tab 3: Results     icon: award
  Tab 4: Assignments icon: book-open
  Tab 5: More        icon: menu
```

### Screen: Student Dashboard

**Route:** `/(student)/`

**Layout:**
```
┌─────────────────────────────────────┐
│  [School Logo]    [Notifications 1] │
│  "Good morning, Aarav!"             │
├─────────────────────────────────────┤
│  Class 8A  •  Roll No. 15           │
│  Attendance: 91% this month         │
├─────────────────────────────────────┤
│  SCHEDULE TODAY (3 remaining)       │
│  11:00 Science · 12:00 English ...  │
├─────────────────────────────────────┤
│  ASSIGNMENTS DUE                    │
│  2 due this week                    │
├─────────────────────────────────────┤
│  LATEST RESULT                      │
│  Unit Test 2 — 82%                  │
└─────────────────────────────────────┘
```

### Screen: Timetable

**API:** `GET /api/timetable?classId={student.classId}`  
**Route:** `/(student)/timetable/`

- Today's schedule as default view.
- Tab switcher: Monday–Friday (weekly view).
- Each period: time, subject, teacher name.
- Current period highlighted.
- Holiday indicator on holiday dates.
- Cached in SQLite for offline access.

### Screen: My Attendance

**API:** `GET /api/attendance/my-attendance?month=X`  
**Route:** `/(student)/attendance/`

- Attendance % badge (green/amber/red).
- Monthly calendar heatmap.
- Subject-wise attendance breakdown (if available from API).
- Month navigation.
- Shortage alert if below threshold.

### Screen: Exam Results

**API:** `GET /api/examinations/results?studentId=me`  
**Route:** `/(student)/results/`

- List of published exam results.
- Each: exam name, date, overall percentage, grade.
- Tap → subject-wise marks detail.
- Class rank shown if available.
- Report card PDF link.

### Screen: Assignments

**API:** `GET /api/assignments?studentId=me`  
**Route:** `/(student)/assignments/`

**Layout:**
- Tabs: "Due" | "Submitted" | "Graded".
- Due tab: sorted by due date (soonest first), overdue highlighted in red.
- Each item: title, subject, due date, status badge.
- Tap → Assignment Detail.

**Assignment Detail (`/(student)/assignments/[id]`):**
- Title, description, attachments.
- Due date (countdown: "Due in 2 days").
- If submitted: show submission content + grade + feedback.
- If pending: show submission form.

**Submission Form:**
- Text submission: `TextInput` multiline, max 5000 chars.
- File submission: `expo-document-picker` (PDF, DOC, max 10MB) OR camera photo.
- Preview before submit.
- Submit → `POST /api/assignments/{id}/submissions` (multipart for files).
- Offline queue: text submissions only (file submissions are online-only).
- Confirmation: "Submitted successfully. Your teacher will review it."

### Screen: Fee Summary (Read-Only)

**API:** `GET /api/fees/records?studentId=me`  
**Route:** `/(student)/fees/`

- Total outstanding.
- Fee breakdown by head.
- Payment history.
- **No payment button** (students view fees, parents pay).

### More Tab

**Route:** `/(student)/more`

- **Leave Request**: apply for leave + status tracking.
- **Library**: issued books + due dates (if `library` flag enabled).
- **Notifications**: notification center.
- **Profile**: view own profile.
- **Settings**: notification preferences, change password, logout.

### Assignments Badge

Show badge count on Assignments tab:
```typescript
const { data: dueSoon } = useQuery({
  queryKey: ['assignments', 'due-count'],
  queryFn: () => assignmentsApi.getDueCount(),
  refetchInterval: 30 * 60 * 1000,  // 30 min
});
```

---

## Implementation Tasks

1. Implement `/(student)/_layout.tsx` with 5-tab navigator.
2. Backend: coordinate `GET /api/mobile/student-dashboard` endpoint.
3. Implement `/(student)/index.tsx` (dashboard).
4. Implement `/(student)/timetable/index.tsx` with weekly view + SQLite cache.
5. Implement `/(student)/attendance/index.tsx`.
6. Implement `/(student)/results/index.tsx` and `[examId].tsx`.
7. Implement `/(student)/assignments/index.tsx`, `[id]/index.tsx`.
8. Implement assignment submission (text + file).
9. Implement offline queue for text submissions.
10. Implement `/(student)/fees/index.tsx`.
11. Implement `/(student)/more.tsx` with leave application.
12. Implement assignment due badge.

---

## Acceptance Criteria

- [ ] Student logs in → dashboard shows timetable, assignments, and result.
- [ ] Timetable shows today's schedule with current period highlighted.
- [ ] Weekly timetable navigation works (Mon–Fri).
- [ ] Timetable available offline (SQLite cache).
- [ ] Assignment submission (text) works and queues if offline.
- [ ] Graded assignments show marks and teacher feedback.
- [ ] Due assignments sorted by due date (soonest first).
- [ ] Overdue assignments highlighted in red.
- [ ] File submission opens document picker and uploads file.
- [ ] Attendance calendar correct (heatmap matches backend data).
- [ ] Fee summary shows correct outstanding amount.

---

## Definition of Done

- [ ] All acceptance criteria pass.
- [ ] Tested on physical low-end Android (2GB RAM).
- [ ] `FlashList` used for all lists (no `FlatList` or `ScrollView`+map).
- [ ] Assignment file upload tested with real PDF file.
- [ ] No TypeScript errors, no lint errors.
- [ ] Peer review complete.
