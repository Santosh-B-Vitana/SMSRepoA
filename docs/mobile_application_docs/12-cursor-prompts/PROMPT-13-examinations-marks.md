# PROMPT-13: Examinations & Marks Entry Implementation

> **Prompt ID:** PROMPT-13  
> **Epic:** EP-08 — Examinations & Results + EP-14 — Teacher Marks & Assignments  
> **Phase:** 3 — Sprint 14  
> **Estimated Story Points:** 35  
> **Prerequisites:** PROMPT-01, PROMPT-02, PROMPT-04 (SQLite foundation) complete  
> **Related Architecture Docs:** [epics/EP-08-examinations](../epics/EP-08-examinations.md) · [epics/EP-14-teacher-marks-assignments](../epics/EP-14-teacher-marks-assignments.md)

---

## Context

Build the complete examinations module covering teacher marks entry, parent/student results viewing, assignment management, and class performance analytics.

**Backend context:**
- `GET /api/examinations/exams` — all exams for the academic year.
- `GET /api/examinations/exam-setup?classId=X` — exam subjects and max marks.
- `GET /api/examinationreports/student-marks/{examId}?classId=X&subjectId=Y` — existing marks for a class.
- `PUT /api/examinations/results/bulk` — submit marks. Body: `{ examId, classId, subjectId, results: [{ studentId, marks, practicalMarks? }] }`.
- `GET /api/examinations/results?studentId=X` — published results for a student.
- `GET /api/examinations/report-cards/{studentId}` — report card with PDF URL.
- `GET /api/examinationreports/exam-performance/{examId}?classId=X` — class analytics.

**SQLite:** `marksDrafts` table exists (from PROMPT-12 schema). Use it for auto-save.

---

## Requirements

### PART A: Teacher Marks Entry

#### Screen: Pending Exams List (`/(teacher)/marks/`)

- List of exams with incomplete marks entry for teacher's assigned classes.
- Each exam card: name, date, "X/Y classes entered" progress.
- Sorted: closest exam date first.
- Tap → class selection for that exam.

#### Screen: Class Selection (`/(teacher)/marks/[examId]`)

- Teacher's assigned classes for this exam.
- Each class shows subject list (multiple subjects per class if multi-subject teacher).
- Status per class-subject: "Not started" / "Draft saved" / "Submitted".
- Tap class-subject → marks entry grid.

#### Screen: Marks Entry Grid (`/(teacher)/marks/[examId]/[classId]/[subjectId]`)

**This is the most complex screen. Build it carefully.**

```
Header: Class 8A — Unit Test 2 — Mathematics
        Max Theory: 25  Max Practical: N/A
        Progress: 18/30 students filled
────────────────────────────────────────────────
[← Draft from 10:42 AM]  [All Present]  [AB All]
────────────────────────────────────────────────
Roll  Name                Theory   Grade
 1    Aarav Sharma        [22 ]    A1
 2    Priya Gupta         [   ]    —
 3    Rohan Mehta         [ AB]    AB
 4    Sneha Patel         [19 ]    B2
...
────────────────────────────────────────────────
Avg: 20.5 | Pass: 27/30 | Highest: 25 | Lowest: 8
────────────────────────────────────────────────
[Save Draft]         [Review & Submit]
```

**Input behavior:**
- Each marks field is a `TextInput` with `keyboardType="numeric"`.
- Validation: `0 ≤ marks ≤ maxMarks`. Red border + shake animation if invalid.
- "AB" button marks student as absent (no marks).
- Grade computed instantly client-side using grade tier config from school store.
- `Return` key moves to next student automatically.
- Auto-save to SQLite every 30 seconds (debounced).
- Progress bar updates as fields are filled.

**When exam has both Theory and Practical:**
```
Roll  Name              Theory   Practical   Total   Grade
 1    Aarav Sharma       [22 ]    [ 8  ]      30      A1
```

#### Screen: Review & Submit (`/(teacher)/marks/[examId]/[classId]/review`)

Summary before submission:
- Total students: 30 | Filled: 30 | Absent: 2.
- Class average: 78%.
- Warning if any students have no marks and no "AB".
- [Confirm & Submit] button.

**Submit flow:**
```typescript
// Online
PUT /api/examinations/results/bulk
  X-Idempotency-Key: {uuid stored with draft}

// Offline
→ Add to offlineQueue (operationType: 'marks_entry')
→ marksDraft.isSubmitted = false (keep draft until synced)
→ Toast: "Marks saved. Will submit when connected."
```

#### Screen: Class Performance (`/(teacher)/marks/[examId]/[classId]/performance`)

After successful marks submission:
- Class average, highest, lowest, standard deviation.
- Bar chart: grade distribution (A1/A2/B1/B2/C1/C2/D/E/F).
- Topper list (top 5).
- Students who failed (< passing percentage).
- Share: generate summary image (using `react-native-view-shot`).

---

### PART B: Parent & Student Results Viewing

#### Screen: Results List (`/(parent)/results/[studentId]`, `/(student)/results/`)

- List of published exam results, sorted newest first.
- Each card: exam name, date, overall percentage, grade badge.
- Not-yet-published exams hidden.
- Tap → detail screen.

#### Screen: Exam Result Detail

- Subject-wise marks table: Subject | Theory | Practical | Total | Grade.
- Class rank if available.
- Pass/fail indicator.
- Board-appropriate grade scale info button.

#### Screen: Report Card Viewer

- "Download Report Card" button → `expo-web-browser` with PDF URL.
- Share button → native share with PDF URL.
- Display report card metadata: student name, class, academic year, generated date.

---

### PART C: Assignments

#### Screen: My Assignments - Teacher (`/(teacher)/assignments/`)

- Tabs: "Active" | "Pending Grading" | "Completed".
- Active: assignments in progress (due date not passed).
- Pending Grading: submissions awaiting marks.
- FlashList for performance.

#### Screen: Create Assignment (`/(teacher)/assignments/create`)

```
Create Assignment
─────────────────────────────────
Title *         [________________]
Subject *       [Dropdown ▼]
Class *         [Dropdown ▼]  [Section ▼]
Due Date *      [Date Picker]
Description     [Text area]
Attachment      [Attach file (optional)]
─────────────────────────────────
                [Cancel]  [Post →]
```

On create:
- `POST /api/assignments` with `{ title, subjectId, classId, sectionId, dueDate, description }`.
- Students get push notification.

#### Screen: Submissions List (`/(teacher)/assignments/[id]/submissions`)

- List of all students in the class with submission status.
- Submitted: name, submission date, "Grade" button.
- Not submitted: name, "Not Submitted" (grey).
- FlashList for 40+ students.

#### Screen: Grade Submission (`/(teacher)/assignments/[id]/grade/[submissionId]`)

- Student's submission text shown (or file attachment link).
- Marks input: `[___/20]`.
- Comments text area.
- [Submit Grade] → `PUT /api/assignments/{id}/grade/{submissionId}`.
- Student receives push notification.

---

## Grade Computation Utility

```typescript
// src/features/examinations/utils/gradeComputer.ts
export function computeGradeFromMarks(
  marks: number,
  maxMarks: number,
  gradeTiers: GradeTier[]
): { grade: string; color: string } {
  if (marks === -1) return { grade: 'AB', color: '#6b7280' };  // Absent
  const percentage = (marks / maxMarks) * 100;
  const tier = [...gradeTiers]
    .sort((a, b) => b.minPercentage - a.minPercentage)
    .find(t => percentage >= t.minPercentage);
  return {
    grade: tier?.grade ?? 'F',
    color: tier?.color ?? '#ef4444',
  };
}
```

Grade tiers loaded from `GET /api/academics/classes/settings` — include in the offline bundle.

---

## Implementation Tasks

**Teacher Marks:**
1. Implement `/(teacher)/marks/index.tsx` — pending exams list.
2. Implement `/(teacher)/marks/[examId].tsx` — class+subject selection.
3. Implement `/(teacher)/marks/[examId]/[classId]/[subjectId].tsx` — marks grid.
4. Implement marks draft auto-save (30s debounce → SQLite).
5. Implement marks draft pre-fill on grid mount.
6. Implement grade computation client-side.
7. Implement `/(teacher)/marks/[examId]/[classId]/review.tsx` — confirmation.
8. Implement `/(teacher)/marks/[examId]/[classId]/performance.tsx` — analytics.
9. Implement offline marks submission queue.

**Parent/Student Results:**
10. Implement `/(parent)/results/[studentId].tsx` and `/(student)/results/index.tsx`.
11. Implement exam detail screen (subject-wise marks).
12. Implement report card viewer screen.

**Assignments:**
13. Implement `/(teacher)/assignments/index.tsx` with tabs.
14. Implement `/(teacher)/assignments/create.tsx`.
15. Implement `/(teacher)/assignments/[id]/submissions.tsx`.
16. Implement `/(teacher)/assignments/[id]/grade/[submissionId].tsx`.
17. Implement assignment list for students (`/(student)/assignments/`) with submission form.

---

## Acceptance Criteria

**Marks Entry:**
- [ ] Marks grid renders 35 students in < 500ms (FlashList).
- [ ] Invalid marks (> max) show red border, block Review & Submit.
- [ ] Grade badge updates instantly as marks are entered.
- [ ] Draft auto-saves to SQLite every 30 seconds.
- [ ] Closing mid-entry and re-opening shows draft with "Draft loaded" toast.
- [ ] Offline submission queued, synced on reconnect.
- [ ] Theory + Practical columns visible only when exam has practical component.

**Results:**
- [ ] Published results visible to parent and student.
- [ ] Unpublished results not shown.
- [ ] Report card opens via Expo WebBrowser.
- [ ] Grade badge shows correct grade per school's board configuration.

**Assignments:**
- [ ] Assignment created → students receive push notification.
- [ ] Submission list shows submitted/not-submitted per student.
- [ ] Graded submission → student receives push notification.

---

## Testing Requirements

Unit:
- `computeGradeFromMarks(22, 25, cbseTiers)` → `{ grade: 'A1', color: '#...' }`.
- `computeGradeFromMarks(0, 25, cbseTiers)` → `{ grade: 'E', color: '#...' }`.
- `computeGradeFromMarks(-1, 25, cbseTiers)` → `{ grade: 'AB', color: '#...' }`.

E2E (Maestro):
- `teacher_enter_marks.yaml`: login → marks → select class → fill all marks → submit.
- `parent_view_results.yaml`: login as parent → results → tap exam → verify subject-wise.

---

## Definition of Done

- [ ] All acceptance criteria pass.
- [ ] Marks grid tested with 40 students — no jank.
- [ ] Auto-save confirmed via SQLite query during testing.
- [ ] Peer review complete.
