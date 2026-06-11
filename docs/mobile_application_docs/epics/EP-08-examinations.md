# EP-08: Examinations & Results

> **Epic ID:** EP-08  
> **Priority:** P1  
> **Estimated Sprints:** 3  
> **Phase:** 2–3  
> **Related Docs:** [13-feature-inventory](../13-feature-inventory.md) · [PROMPT-13](../12-cursor-prompts/PROMPT-13-examinations-marks.md)

---

## Business Objective

Exam results are the most anxiously awaited information in a school system. Parents check results obsessively when published. Teachers need to enter marks quickly after exams — currently a desktop-only task that forces them back to a computer. Moving marks entry to mobile reduces the cycle time from exam → result visibility from days to hours.

## Technical Objective

Build the examinations module for three personas:
- **Parent:** view published results and download report cards.
- **Student:** same as parent but for own data.
- **Teacher:** mark entry grid with offline draft capability, class performance analytics.

---

## Current State Analysis

Backend provides:
- `GET /api/examinations/results?studentId=X` — published results per student.
- `GET /api/examinations/report-cards/{studentId}` — report card with PDF URL.
- `PUT /api/examinations/results/bulk` — bulk marks entry for a class+exam+subject.
- `GET /api/examinations/exam-setup` — exam list with subjects and max marks.
- `GET /api/examinationreports/exam-performance/{examId}` — class analytics.
- `GET /api/examinationreports/student-marks/{examId}` — all student marks for one exam.
- `GET /api/examinations/exams` — all configured exams for the current academic year.

---

## Functional Requirements

### Parent & Student Viewing

| ID | Requirement |
|---|---|
| FR-1 | List of published exams with name, date, overall %, grade |
| FR-2 | Subject-wise marks table per exam (subject, marks, max, grade) |
| FR-3 | Class rank shown alongside results (if available) |
| FR-4 | Report card PDF viewable and shareable |
| FR-5 | Results across academic years accessible |
| FR-6 | Grade displayed using school's board-appropriate scale (CBSE A1–E2, IB 1–7, etc.) |
| FR-7 | Push notification sent when results published |

### Teacher Marks Entry

| ID | Requirement |
|---|---|
| FR-8 | Teacher sees list of exams awaiting marks entry |
| FR-9 | Select class + subject → marks entry grid |
| FR-10 | Marks input validates: non-negative, ≤ max marks |
| FR-11 | Auto-save draft to SQLite every 30 seconds |
| FR-12 | Submit marks → `PUT /api/examinations/results/bulk` |
| FR-13 | Offline: draft saved, queued for submission when online |
| FR-14 | Previously entered marks pre-filled for editing |
| FR-15 | Class performance summary after marks entry |
| FR-16 | Theory and Practical marks entered separately where applicable |

---

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | Marks grid renders 40 students in < 500ms |
| NFR-2 | SQLite draft auto-save < 50ms (debounced 30s) |
| NFR-3 | Result list loads in < 1s (TanStack Query cached) |
| NFR-4 | Grades computed client-side for instant display while entering marks |

---

## API Requirements

| Method | Endpoint | Status | Notes |
|---|---|---|---|
| GET | `/api/examinations/exams` | Exists | All exams for academic year |
| GET | `/api/examinations/exam-setup` | Exists | Subjects + max marks per exam |
| GET | `/api/examinations/results?studentId=X` | Exists | Student results |
| GET | `/api/examinationreports/student-marks/{examId}` | Exists | All marks for teacher entry |
| PUT | `/api/examinations/results/bulk` | Exists | Bulk marks entry |
| GET | `/api/examinations/report-cards/{studentId}` | Exists | Report card with PDF URL |
| GET | `/api/examinationreports/exam-performance/{examId}` | Exists | Class analytics |
| GET | `/api/examinationreports/class-analysis` | Exists | Multi-class comparison |

---

## Mobile Screens

| Screen | Route | Persona |
|---|---|---|
| Results List | `/(parent)/results/[studentId]` | Parent, Student |
| Exam Detail (subject-wise) | `/(parent)/results/[studentId]/[examId]` | Parent, Student |
| Report Card Viewer | `/(parent)/results/report-card/[studentId]` | Parent, Student |
| Marks Entry — Exam List | `/(teacher)/marks/` | Teacher |
| Marks Entry — Class Select | `/(teacher)/marks/[examId]` | Teacher |
| Marks Entry — Grid | `/(teacher)/marks/[examId]/[classId]/[subjectId]` | Teacher |
| Marks Entry — Review | `/(teacher)/marks/[examId]/[classId]/review` | Teacher |
| Class Performance | `/(teacher)/marks/[examId]/[classId]/performance` | Teacher |

---

## Marks Entry Grid Design

```
Marks Entry — Class 8A | Unit Test 2 | Mathematics
Max Marks: 25 | Passing: 10 | Entries: 18/30
────────────────────────────────────────────────
[Auto-saving draft...  ✓ Saved 10:42 AM]
────────────────────────────────────────────────
Roll  Name              Theory  Prac   Total
1     Aarav Sharma       [22]   [--]    22
2     Priya Gupta        [18]   [--]    18
3     Rohan Mehta        [--]   [--]    --
...
────────────────────────────────────────────────
[Save Draft]          [Review & Submit]
```

Input behavior:
- Tap on marks cell → numeric keyboard opens.
- Return key → move to next student.
- Marks validated: 0 ≤ marks ≤ max_marks (red border + shake on invalid).
- Grade badge computed instantly: 22/25 → A1 (CBSE).
- Progress indicator: N / total students filled.

---

## Offline Marks Entry

```
SQLite table: marksDrafts
  id, examId, classId, subjectId, marks JSON, lastModified, isSubmitted

Teacher enters marks → saved to SQLite every 30s
Teacher submits:
  Online → PUT /api/examinations/results/bulk
           On success → mark SQLite draft as submitted
  Offline → Enqueue in offlineQueue
            Show "Draft saved. Will submit when connected."

On reconnect:
  Queue processor submits bulk marks
  On 409 conflict: "Some marks already entered. Review conflicts."
```

---

## Grade Computation (Client-Side)

To show instant grade feedback while entering marks:

```typescript
// src/features/examinations/utils/gradeComputer.ts
function computeGrade(marks: number, maxMarks: number, gradeTiers: GradeTier[]): string {
  const percentage = (marks / maxMarks) * 100;
  const tier = gradeTiers
    .sort((a, b) => b.minPercentage - a.minPercentage)
    .find(t => percentage >= t.minPercentage);
  return tier?.grade ?? 'F';
}
```

Grade tiers fetched from `GET /api/academics/classes/settings` (loaded at app start, cached).

---

## User Stories

| ID | Story | SP |
|---|---|---|
| EP-08-US-01 | View published exam results (parent/student) | 5 |
| EP-08-US-02 | View subject-wise marks + grade breakdown | 3 |
| EP-08-US-03 | Download and share report card PDF | 3 |
| EP-08-US-04 | Teacher marks entry grid | 8 |
| EP-08-US-05 | Auto-save draft to SQLite | 5 |
| EP-08-US-06 | Offline marks entry with sync | 5 |
| EP-08-US-07 | Class performance analytics | 3 |
| EP-08-US-08 | Theory + Practical separate entry | 3 |

**Total:** 35 story points / 3 sprints

---

## Acceptance Criteria

- [ ] Published results shown correctly for parent and student.
- [ ] Grade badge shows correct grade per board (CBSE/ICSE/IB).
- [ ] Report card PDF opens via Expo WebBrowser.
- [ ] Marks entry grid renders 35 students without jank.
- [ ] Invalid marks (> max_marks) shown with red border, cannot be submitted.
- [ ] Draft auto-saves every 30 seconds (verified in SQLite).
- [ ] Offline marks submission queued and synced on reconnect.
- [ ] Theory and Practical marks entered on separate columns.
- [ ] Class performance shows average, highest, lowest, pass count.
- [ ] Push notification sent when results published (parent/student).

---

## Sprint Breakdown

| Sprint | Scope |
|---|---|
| Sprint 9 | Results list + subject detail + report card (parent/student) |
| Sprint 14 | Teacher marks entry grid + SQLite draft |
| Sprint 15 | Offline marks sync + class performance + Theory/Practical entry |
