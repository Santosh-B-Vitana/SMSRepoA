# EP-14: Teacher App — Marks Entry & Assignments

> **Epic ID:** EP-14  
> **Priority:** P1  
> **Estimated Sprints:** 2  
> **Phase:** 3 — Sprint 14  
> **Related Docs:** [EP-04-teacher-app](./EP-04-teacher-app.md) · [EP-08-examinations](./EP-08-examinations.md) · [PROMPT-13](../12-cursor-prompts/PROMPT-13-examinations-marks.md)

---

## Business Objective

EP-04 covered attendance — the daily teacher workflow. This epic extends the Teacher App into the examination cycle: marks entry and assignment management. These are high-value features because they eliminate the need for teachers to be at a desktop to do their most important academic work.

## Technical Objective

Build teacher-facing marks entry with offline draft support, assignment creation and management, submission review and grading, and class diary entry posting.

---

## Functional Requirements

### Marks Entry

| ID | Requirement |
|---|---|
| FR-1 | Teacher sees list of exams with pending marks entry |
| FR-2 | For each exam: select class → select subject → marks grid |
| FR-3 | Marks grid shows all students with input fields |
| FR-4 | Marks validated: ≥ 0, ≤ max marks (per ExamSetup config) |
| FR-5 | Grade shown instantly as marks are entered (client-side compute) |
| FR-6 | Theory + Practical marks entered on separate columns where applicable |
| FR-7 | Auto-save draft to SQLite every 30 seconds |
| FR-8 | Submit marks online: `PUT /api/examinations/results/bulk` |
| FR-9 | Submit offline: queued and synced on reconnect |
| FR-10 | Previously entered marks pre-filled for editing |
| FR-11 | Class performance summary shown after submission |
| FR-12 | Absent students can be marked "AB" instead of numeric marks |

### Assignments

| ID | Requirement |
|---|---|
| FR-13 | Create assignment: title, subject, class, description, due date |
| FR-14 | Optional file attachment to assignment |
| FR-15 | Students in assigned class receive push notification |
| FR-16 | View all assignments created by teacher |
| FR-17 | View submission list per assignment (submitted/pending count) |
| FR-18 | View individual student submission |
| FR-19 | Grade submission: marks + comments |
| FR-20 | Graded student receives push notification |

### Diary

| ID | Requirement |
|---|---|
| FR-21 | Post diary entry for a class: date, title, content |
| FR-22 | Offline diary posting (queued) |
| FR-23 | View previous diary entries for own classes |

---

## API Requirements

| Method | Endpoint | Status |
|---|---|---|
| GET | `/api/examinations/exams` | Exists |
| GET | `/api/examinations/exam-setup?classId=X` | Exists |
| GET | `/api/examinationreports/student-marks/{examId}?classId=X` | Exists |
| PUT | `/api/examinations/results/bulk` | Exists |
| GET | `/api/examinationreports/exam-performance/{examId}?classId=X` | Exists |
| GET | `/api/assignments?teacherId=me` | Exists |
| POST | `/api/assignments` | Exists |
| GET | `/api/assignments/{id}` | Exists |
| GET | `/api/assignments/{id}/submissions` | Exists |
| PUT | `/api/assignments/{id}/grade/{submissionId}` | Exists |
| POST | `/api/diary` | Exists |
| GET | `/api/diary?classId=X` | Exists |

---

## Marks Entry Screen Flow

```
Teacher opens "Marks" tab
  → List of pending exams (sorted by date)
  → Each exam: name, date, "X/Y classes entered"
  → Tap exam → class list (teacher's assigned classes)
  → Tap class → subject selector (if multiple subjects)
  → Marks entry grid

Marks Grid:
  Header: "8A — Unit Test 2 — Mathematics — Max: 25"
  Progress: 18 / 30 students filled
  
  | Roll | Name          | Theory | Prac  | Total | Grade |
  |  1   | Aarav Sharma  | [22_]  | [ --] |  22   |  A1  |
  |  2   | Priya Gupta   | [__]   | [ --] |   -   |   -  |
  
  [Save Draft]         [Review → Submit]

Review screen:
  Summary: 30 students, Average 78%, Pass: 28
  [Confirm & Submit]

Post-submission:
  ✓ Marks submitted for 30 students
  Class average: 78% | Highest: 98% | Lowest: 42%
  [View Full Analytics]
```

---

## SQLite Marks Draft Schema

```typescript
marksDrafts: {
  id: text PK,
  examId: text,
  classId: text,
  subjectId: text,
  marks: text,           // JSON: [{ studentId, theory, practical }]
  lastModified: integer, // Unix timestamp
  isSubmitted: boolean,
  schoolId: text,
  markedBy: text,        // userId
}
```

---

## Assignment Management

```
Assignments tab (teacher)
├── Tab: My Assignments (I created)
└── Tab: Pending Grading

My Assignments list:
  [Create Assignment +]
  ─────────────────────────────
  Chapter 5 Summary         Due Jun 15
  Mathematics · Class 8A
  Submitted: 18/30   Graded: 5/18
  ─────────────────────────────
  Essay — Pollution          Due Jun 12  [OVERDUE]
  English · Class 7B
  Submitted: 25/28   Graded: 25/25

Tap assignment → Submission list:
  Aarav Sharma    Submitted Jun 11    [Grade]
  Priya Gupta     Submitted Jun 10    Graded: 18/20

Tap [Grade]:
  Student's submission text/file shown
  Marks field: [__/20]
  Comments: [text area]
  [Submit Grade]
```

---

## User Stories

| ID | Story | SP |
|---|---|---|
| EP-14-US-01 | Marks entry grid with validation | 8 |
| EP-14-US-02 | SQLite draft + offline submission | 5 |
| EP-14-US-03 | Theory + Practical marks | 3 |
| EP-14-US-04 | Class performance summary | 3 |
| EP-14-US-05 | Create and manage assignments | 5 |
| EP-14-US-06 | View and grade submissions | 5 |
| EP-14-US-07 | Post diary entry (with offline queue) | 3 |

**Total:** 32 story points / 2 sprints

---

## Acceptance Criteria

- [ ] Marks grid renders 35 students in < 500ms.
- [ ] Invalid marks (> max) show red border and block submission.
- [ ] Grade computed instantly while entering marks.
- [ ] Draft auto-saved to SQLite every 30 seconds.
- [ ] Offline submission queued and synced.
- [ ] Assignment created → students receive push notification.
- [ ] Grading a submission → student receives push notification.
- [ ] Theory + Practical columns shown only for applicable exam types.

---

## Sprint Breakdown

| Sprint | Scope |
|---|---|
| Sprint 14 | Marks entry grid + SQLite draft + class performance |
| Sprint 15 | Assignments (create/view) + grading + offline marks sync + diary entry |
