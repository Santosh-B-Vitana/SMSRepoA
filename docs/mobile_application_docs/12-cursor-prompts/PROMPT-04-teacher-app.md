# PROMPT-04: Teacher App — Attendance, Timetable & Offline

> **Prompt ID:** PROMPT-04  
> **Epic:** EP-04 — Teacher App (Attendance & Timetable) + EP-12 (Offline Foundation)  
> **Phase:** 2 — Sprints 7–8  
> **Estimated Story Points:** 38  
> **Prerequisites:** PROMPT-01, PROMPT-02 complete  
> **Related Architecture Docs:** [epics/EP-04-teacher-app](../epics/EP-04-teacher-app.md) · [10-offline-architecture](../10-offline-architecture.md)

---

## Context

The Parent App is in beta. Now build the Teacher App. The most critical feature is offline attendance marking — the single biggest productivity win for teachers in Indian schools where classroom connectivity is unreliable.

**Backend context:**
- `GET /api/mobile/teacher-dashboard` → **TO BUILD by backend team in Sprint 7**.
- `GET /api/timetable/my-schedule` → Returns today's periods for the logged-in teacher.
- `GET /api/students?classId=X&sectionId=Y` → Returns student list. Add `?minimal=true` for mobile (name, id, rollNumber, photoUrl only).
- `POST /api/attendance/students/bulk` → Body: `{ classId, date, records: [{ studentId, status }] }`.
- Backend must handle idempotency key header `X-Idempotency-Key` to prevent duplicate submissions.

**Offline requirement:** This is the first implementation of the offline architecture. Read `docs/mobile_application_docs/10-offline-architecture.md` completely before implementing.

---

## Requirements

### Navigation Structure

```
Tab Bar (Teacher):
  Tab 1: Home       icon: home
  Tab 2: Classes    icon: users
  Tab 3: Marks      icon: edit-3
  Tab 4: Timetable  icon: calendar
  Tab 5: More       icon: menu
```

### SQLite Setup (`src/offline/db.ts`)

Initialize expo-sqlite with Drizzle ORM. Create tables:
- `cachedStudentLists` — per-class student cache
- `attendanceDrafts` — in-progress attendance marking
- `offlineQueue` — pending operations

**Schema** defined in `src/offline/schema.ts` exactly as in `docs/mobile_application_docs/10-offline-architecture.md` Section 4.

Enable WAL mode. Create a database initialization function `initDatabase()` called from root `_layout.tsx` after authentication.

### Screen: Teacher Dashboard

**API:** `GET /api/mobile/teacher-dashboard`  
**Route:** `/(teacher)/`

**Layout:**
```
┌─────────────────────────────────────┐
│  [School Logo]  [Notifications 2]   │
│  "Good morning, Mr. Rajan"          │
├─────────────────────────────────────┤
│  TODAY'S SCHEDULE (3 periods)       │
│  9:00–9:45  Class 8A  Mathematics   │
│  10:00–10:45  Class 7B  Mathematics │
│  2:00–2:45  Class 9A  Mathematics   │
├─────────────────────────────────────┤
│  PENDING TASKS                      │
│  ✅ 3 pending leave requests        │
│  📝 Marks due: Unit Test 2 (8A)     │
├─────────────────────────────────────┤
│  ATTENDANCE TODAY                   │
│  8A: Marked ✓  |  7B: Not Yet       │
│  9A: Not Yet                        │
└─────────────────────────────────────┘
```

### Screen: My Classes

**API:** `GET /api/academics/teacher-assignments`  
**Route:** `/(teacher)/classes/`

Grid of class-section cards. Each card shows:
- Class + section name (e.g., "Class 8A").
- Subject(s) taught.
- Today's attendance status: "Marked" (green) / "Not Marked" (red).
- Tap → Class Detail.

### Screen: Class Detail & Student List

**API:** `GET /api/students?classId=X&minimal=true`  
**Route:** `/(teacher)/classes/[classId]/`

**Layout:**
- Class header: name, strength, today's marked status.
- "Mark Attendance" primary button.
- "View Summary" secondary button.
- Student list (FlashList) with photo, name, roll number.

**SQLite caching:**
```typescript
// On open with connectivity:
const students = await studentsApi.getByClass(classId);
await db.insert(cachedStudentLists).values({
  classId,
  students: JSON.stringify(students),
  cachedAt: Date.now(),
  academicYear: academicYear,
  schoolId: user.schoolId,
}).onConflictDoUpdate({ target: cachedStudentLists.classId, set: { ... } });
```

### Screen: Attendance Marking (Critical)

**Route:** `/(teacher)/attendance/[classId]/`

This is the most important screen in the Teacher App.

**Layout:**
```
┌─────────────────────────────────────┐
│  Class 8A — Attendance              │
│  Thursday, Jun 10                   │
│                        [All Present]│
├─────────────────────────────────────┤
│  1. Aarav Sharma      [P] [A] [L]  │
│  2. Priya Gupta       [P] [A] [L]  │
│  3. Rohan Mehta       [P] [A] [L]  │
│  ...                               │
├─────────────────────────────────────┤
│  Present: 28  Absent: 2  Late: 0   │
│            [Submit Attendance]      │
└─────────────────────────────────────┘
```

**Implementation:**
- Load students from SQLite cache (if offline) or API (if online).
- Default all students to Present.
- "All Present" button: sets all to Present.
- Per-student toggle: P → A → L → P (cycle) or separate P/A/L buttons.
- Summary counter updates in real-time.
- Draft saved to `attendanceDrafts` SQLite table on every change (debounced 500ms).

**Submit flow:**
```typescript
async function submitAttendance() {
  const idempotencyKey = generateUUID();  // Store locally for retry
  const payload = { classId, date: today, records: attendanceRecords };
  
  if (isConnected) {
    await attendanceApi.bulkMark(payload, idempotencyKey);
    await db.update(attendanceDrafts).set({ isSubmitted: true }).where(...);
    queryClient.invalidateQueries(['attendance', classId]);
    router.back();
  } else {
    // Queue for offline sync
    await db.insert(offlineQueue).values({
      id: generateUUID(),
      method: 'POST',
      endpoint: '/api/attendance/students/bulk',
      body: JSON.stringify(payload),
      headers: JSON.stringify({ 'X-Idempotency-Key': idempotencyKey }),
      operationType: 'attendance',
      retryCount: 0,
      maxRetries: 3,
      status: 'pending',
      schoolId: user.schoolId,
      userId: user.id,
    });
    showToast('Attendance saved offline. Will sync automatically.', 'info');
    router.back();
  }
}
```

**Conflict UI:** If server returns 409 on sync:
- Show alert: "Conflict: [Student name] was already marked [status]. Your submission: [status]. Override?"
- Offer "Keep Existing" or "Override with Mine" options.

### Offline Sync Engine

Implement `src/offline/syncEngine.ts`:

```typescript
// Initialize in root _layout.tsx
export function initializeSyncEngine(queryClient: QueryClient) {
  // 1. Listen for connectivity changes
  NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      processQueue(queryClient);
    }
  });
  
  // 2. Process queue on app foreground
  AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') {
      processQueue(queryClient);
    }
  });
}
```

`processQueue()` from `src/offline/queue.ts` as described in architecture doc Section 5.

### Offline Connection Banner

```typescript
// src/components/common/ConnectionBanner.tsx
// Must appear at the TOP of EVERY teacher screen
function ConnectionBanner() {
  const { isConnected } = useNetInfo();
  const { pendingCount } = useOfflineQueue();
  
  if (!isConnected) {
    return <Banner variant="warning">Offline — changes saved locally</Banner>;
  }
  if (pendingCount > 0) {
    return <Banner variant="info">Syncing {pendingCount} changes...</Banner>;
  }
  return null;
}
```

### Attendance Summary Screen

**API:** `GET /api/attendance/stats?classId=X&month=Y`  
**Route:** `/(teacher)/attendance/summary/[classId]/`

- Class attendance % for current month.
- Students below threshold (configurable, from app config) highlighted in red.
- Tap student → individual attendance calendar.

### Student Leave Management

**API:** `GET /api/attendance/leave-requests?classId=X&status=pending`  
**Route:** `/(teacher)/leaves/`

- List of pending leave requests (student name, dates, reason).
- Approve (with optional remark) → `PUT /api/attendance/leave-requests/{id}/approve`.
- Reject (with mandatory reason) → `PUT /api/attendance/leave-requests/{id}/reject`.
- Real-time count badge on Leaves navigation item.

### Teacher Own Leave Application

**Route:** `/(teacher)/leaves/apply/`

- Leave type selector (CL, SL, EL, PL).
- Date range picker.
- Reason text area.
- Submit → `POST /api/leavemanagement/leave-requests`.
- Show remaining leave balance per type.
- Offline: queue submission.

---

## Constraints

- Student list MUST work offline (SQLite cache).
- Attendance marking MUST work offline (SQLite queue).
- No placeholders — every screen has proper loading, empty, and error states.
- `FlashList` for all student lists (not FlatList).
- Attendance grid must handle 60+ students without performance issues (virtualized).

---

## Implementation Tasks

1. Setup expo-sqlite + Drizzle ORM (`src/offline/db.ts`, `schema.ts`).
2. Implement `/(teacher)/_layout.tsx` with 5-tab navigator.
3. Backend `GET /api/mobile/teacher-dashboard` (coordinate with backend team).
4. Implement `/(teacher)/index.tsx` (dashboard).
5. Implement `/(teacher)/classes/index.tsx` and `[classId]/index.tsx`.
6. Implement `/(teacher)/attendance/[classId].tsx` (critical path).
7. Implement `OfflineQueueProcessor` in `src/offline/queue.ts`.
8. Implement `syncEngine.ts`.
9. Implement `ConnectionBanner` component.
10. Implement `/(teacher)/attendance/summary/[classId].tsx`.
11. Implement `/(teacher)/leaves/index.tsx` and `apply.tsx`.
12. Implement `useOfflineQueue()` hook for badge counts.
13. E2E tests.

---

## Acceptance Criteria

- [ ] Attendance marking works with no internet (tested with airplane mode).
- [ ] Attendance queued offline syncs automatically on reconnect.
- [ ] Connection banner appears immediately when airplane mode enabled.
- [ ] "All Present" marks all 30+ students in < 100ms.
- [ ] Student list renders 40 students without visible janking.
- [ ] Already-submitted attendance shows as read-only.
- [ ] Leave approval sends push notification to student/parent (verify in dev).
- [ ] SQLite is initialized before any SQLite operations are called.
- [ ] Offline queue shows correct pending count in banner.
- [ ] Conflict resolution UI appears when 409 is returned on sync.

---

## Testing Requirements

Maestro E2E:
- `teacher_mark_attendance.yaml`: login → select class → mark 3 absent → submit → verify API.
- `teacher_offline_attendance.yaml`: disable network → mark attendance → enable network → verify sync.
- `teacher_approve_leave.yaml`: login → leaves → approve → verify notification.

Unit tests:
- `OfflineQueueProcessor.processItem()`: success path, failure path, retry path.
- `syncEngine`: triggers processQueue on connectivity change.
- `attendanceDraft` SQLite operations: insert, update, read.

---

## Definition of Done

- [ ] All acceptance criteria pass.
- [ ] Offline attendance tested on physical Android device (not just emulator).
- [ ] SQLite WAL mode confirmed enabled.
- [ ] No memory leaks (FlashList itemSize configured correctly).
- [ ] Peer review complete.
