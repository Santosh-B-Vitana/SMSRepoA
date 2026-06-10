# PROMPT-12: Offline Sync Engine — Advanced Implementation

> **Prompt ID:** PROMPT-12  
> **Epic:** EP-12 — Offline Sync Engine (Advanced)  
> **Phase:** 3 — Sprints 12 & 15  
> **Estimated Story Points:** 24  
> **Prerequisites:** PROMPT-04 complete (SQLite foundation + attendance offline already built)  
> **Related Architecture Docs:** [10-offline-architecture](../10-offline-architecture.md) · [epics/EP-12-offline-sync](../epics/EP-12-offline-sync.md)

---

## Context

PROMPT-04 built the SQLite foundation and offline attendance marking. This prompt extends the offline system to cover:
1. Offline marks entry drafts (teacher).
2. Offline diary entry queue.
3. The morning offline bundle pre-fetch.
4. SQLite database size management.
5. Full conflict resolution UI.
6. Backend idempotency key support.

Read `docs/mobile_application_docs/10-offline-architecture.md` completely before implementing.

---

## Requirements

### 1. Extend SQLite Schema

Add to existing `src/offline/schema.ts`:

```typescript
// Marks entry drafts — persisted offline marks before submission
export const marksDrafts = sqliteTable('marks_drafts', {
  id: text('id').primaryKey(),
  examId: text('exam_id').notNull(),
  classId: text('class_id').notNull(),
  subjectId: text('subject_id').notNull(),
  marks: text('marks').notNull(),        // JSON: [{ studentId, theory, practical, isAbsent }]
  lastModified: integer('last_modified').notNull(),
  isSubmitted: integer('is_submitted', { mode: 'boolean' }).default(false),
  schoolId: text('school_id').notNull(),
  markedBy: text('marked_by').notNull(),
});

// Diary entry queue
export const diaryEntryQueue = sqliteTable('diary_entry_queue', {
  id: text('id').primaryKey(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  classId: text('class_id').notNull(),
  sectionId: text('section_id').notNull(),
  date: text('date').notNull(),          // YYYY-MM-DD
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at').notNull(),
  status: text('status').default('pending'), // 'pending' | 'synced' | 'failed'
  errorMessage: text('error_message'),
  schoolId: text('school_id').notNull(),
  userId: text('user_id').notNull(),
});

// Offline bundle metadata
export const offlineBundleCache = sqliteTable('offline_bundle_cache', {
  id: integer('id').primaryKey(),   // always row ID = 1 (single record)
  bundledAt: integer('bundled_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  profileJson: text('profile_json').notNull(),
  timetableJson: text('timetable_json').notNull(),
  announcementsJson: text('announcements_json').notNull(),
  schoolId: text('school_id').notNull(),
  academicYear: text('academic_year').notNull(),
});
```

### 2. Marks Draft Service (`src/offline/marksDraftService.ts`)

```typescript
interface MarksDraftService {
  saveDraft(examId: string, classId: string, subjectId: string, marks: MarksEntry[]): Promise<void>;
  loadDraft(examId: string, classId: string, subjectId: string): Promise<MarksEntry[] | null>;
  markSubmitted(examId: string, classId: string, subjectId: string): Promise<void>;
  deleteSynced(): Promise<void>;  // cleanup submitted drafts > 7 days old
}
```

**Auto-save behavior:** The marks entry grid calls `marksDraftService.saveDraft()` debounced at 30 seconds. Never blocks the UI thread (use expo-sqlite's `withExclusiveTransactionAsync`).

**On grid mount:** Call `marksDraftService.loadDraft()` — if draft exists, pre-populate the grid and show toast "Draft loaded from last session."

### 3. Diary Entry Queue Hook (`src/features/diary/hooks/useDiaryEntry.ts`)

```typescript
export function useDiaryEntry() {
  const { isConnected } = useNetInfo();
  const mutation = useMutation({ mutationFn: diaryApi.postEntry });
  
  async function postDiaryEntry(entry: DiaryEntryInput) {
    const idempotencyKey = generateUUID();
    
    if (isConnected) {
      await mutation.mutateAsync(entry);
      queryClient.invalidateQueries({ queryKey: ['diary', entry.classId] });
    } else {
      // Queue offline
      await db.insert(diaryEntryQueue).values({
        id: generateUUID(),
        idempotencyKey,
        ...entry,
        createdAt: Date.now(),
        status: 'pending',
        schoolId: user.schoolId,
        userId: user.id,
      });
      showToast('Diary entry saved. Will post when connected.', 'info');
    }
  }
  
  return { postDiaryEntry, isLoading: mutation.isPending };
}
```

### 4. Morning Offline Bundle

**Backend endpoint: `GET /api/mobile/offline-bundle`** (coordinate with backend team for Sprint 15).

Expected response per role:

```typescript
// Teacher bundle
interface TeacherOfflineBundle {
  bundledAt: string;
  expiresAt: string;
  myClasses: Array<{
    classId: string;
    className: string;
    students: MinimalStudent[];
  }>;
  todaysTimetable: TimetableEntry[];
  pendingLeaveRequests: LeaveRequest[];
  announcements: Announcement[];
  recentDiaryEntries: DiaryEntry[];
}
```

**Mobile bundle loader (`src/offline/bundleLoader.ts`):**

```typescript
export async function loadMorningBundle() {
  // Only download between 5 AM and 10 AM IST
  const hour = new Date().getHours();  // IST
  if (hour < 5 || hour > 10) return;
  
  // Only if on WiFi (don't waste 4G data)
  const netInfo = await NetInfo.fetch();
  if (netInfo.type !== 'wifi') return;
  
  // Don't re-download if bundle is < 4 hours old
  const existing = await db.select().from(offlineBundleCache).limit(1);
  if (existing[0] && Date.now() - existing[0].bundledAt < 4 * 60 * 60 * 1000) return;
  
  const bundle = await mobileApi.getOfflineBundle();
  
  // Store in SQLite
  await db.insert(offlineBundleCache)
    .values({ id: 1, bundledAt: Date.now(), expiresAt: bundle.expiresAt, ... })
    .onConflictDoUpdate({ target: offlineBundleCache.id, set: { ... } });
  
  // Also update cachedStudentLists from bundle data
  for (const cls of bundle.myClasses) {
    await db.insert(cachedStudentLists)
      .values({ classId: cls.classId, students: JSON.stringify(cls.students), ... })
      .onConflictDoUpdate({ ... });
  }
}
```

Call `loadMorningBundle()` from root `_layout.tsx` after authentication (non-blocking, runs in background).

### 5. Idempotency Key Support (Backend)

Add `X-Idempotency-Key` header handling to these endpoints:

```csharp
// Add to middleware pipeline or per-controller attribute
// Idempotency: if same key seen within 24h → return cached response
// Store: Redis with key "idempotency:{key}" → response JSON, TTL 24h

// Endpoints requiring idempotency:
// POST /api/attendance/students/bulk
// PUT  /api/examinations/results/bulk
// POST /api/diary
// POST /api/leavemanagement/student-leave
// POST /api/assignments/{id}/submissions
```

Mobile always generates a UUID idempotency key per operation and stores it with the queue item. On retry after network failure, the same key is reused. Server de-duplicates.

### 6. Conflict Resolution UI

When the queue processor receives a 409 Conflict response:

```typescript
// src/components/offline/ConflictResolutionSheet.tsx
interface ConflictItem {
  studentName: string;
  localStatus: AttendanceStatus;
  serverStatus: AttendanceStatus;
  conflictTime: string;
}

export function ConflictResolutionSheet({
  conflicts,
  onResolve,
}: {
  conflicts: ConflictItem[];
  onResolve: (resolutions: Record<string, 'keep_local' | 'keep_server'>) => void;
}) {
  // Bottom sheet listing each conflict
  // Each row: "Aarav Sharma: Your submission: Absent | Server: Present"
  // Buttons: [Keep Server] [Use My Entry]
  // Bulk: [Keep All Server] [Override All]
}
```

Store resolution decisions, re-submit affected records.

### 7. Database Size Management (`src/offline/dbMaintenance.ts`)

```typescript
export async function performDatabaseMaintenance() {
  // Delete submitted attendance drafts > 7 days old
  await db.delete(attendanceDrafts)
    .where(and(eq(attendanceDrafts.isSubmitted, true), lt(attendanceDrafts.date, sevenDaysAgo)));
  
  // Delete synced offline queue items > 7 days old
  await db.delete(offlineQueue)
    .where(and(eq(offlineQueue.status, 'synced'), lt(offlineQueue.createdAt, sevenDaysAgo)));
  
  // Delete synced diary entries > 7 days old
  await db.delete(diaryEntryQueue)
    .where(and(eq(diaryEntryQueue.status, 'synced'), lt(diaryEntryQueue.createdAt, sevenDaysAgo)));
  
  // Check database size
  const sizeResult = await db.run(sql`SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()`);
  const sizeBytes = sizeResult.rows[0].size as number;
  
  if (sizeBytes > 40 * 1024 * 1024) {  // 40 MB warning
    showToast('Offline storage is almost full. Old data was cleared.', 'warning');
    Sentry.captureMessage('SQLite approaching size limit', { level: 'warning', extra: { sizeBytes } });
  }
}
```

Call `performDatabaseMaintenance()` on app startup, after authentication.

### 8. Sync Status Screen

**Route:** `/(profile)/sync-status`

```
Sync Status
─────────────────────────────
  ● Connected to internet
─────────────────────────────
  PENDING (2 items)
  Attendance — Class 8A — Today        [Retry]
  Diary Entry — Jun 10                 [Retry]
─────────────────────────────
  FAILED (1 item)
  Marks Entry — Unit Test 2            [View Error] [Retry]
  Error: 409 Conflict — resolved needed
─────────────────────────────
  SYNCED TODAY (5 items)
  ✓ Attendance — Class 7B
  ✓ Diary Entry — Jun 9
  ...
─────────────────────────────
  Storage: 12.4 MB / 50 MB
  Last synced: 11:42 AM
  [Clear Synced Items]
```

---

## Implementation Tasks

1. Extend SQLite schema: `marksDrafts`, `diaryEntryQueue`, `offlineBundleCache`.
2. Run Drizzle migration to update SQLite schema.
3. Implement `marksDraftService.ts`.
4. Implement marks entry grid auto-save (debounced, SQLite).
5. Implement draft pre-fill on grid mount.
6. Implement `useDiaryEntry` hook with offline queue.
7. Implement `bundleLoader.ts`.
8. Implement `GET /api/mobile/offline-bundle` backend endpoint (backend team).
9. Implement idempotency key support in backend (backend team).
10. Implement `ConflictResolutionSheet` component.
11. Wire conflict detection into `OfflineQueueProcessor`.
12. Implement `dbMaintenance.ts`.
13. Call `performDatabaseMaintenance()` on startup.
14. Implement `/(profile)/sync-status` screen.
15. Update `offlineQueueStore` to track failed count and last sync time.
16. Write tests for all new services.

---

## Acceptance Criteria

- [ ] Marks draft auto-saves every 30 seconds (verified via SQLite inspector).
- [ ] Closing marks grid mid-entry → re-opening shows saved draft with toast.
- [ ] Draft submission syncs on reconnect.
- [ ] Diary entry queued offline → synced and visible in parent diary on reconnect.
- [ ] Morning bundle downloads automatically between 6–10 AM on WiFi.
- [ ] Conflict resolution sheet appears when 409 returned.
- [ ] After resolving conflicts, marks re-submitted correctly.
- [ ] Database maintenance clears data > 7 days old on startup.
- [ ] Sync status screen shows correct pending/failed/synced counts.
- [ ] Same idempotency key → server returns 200 with original response (no duplicate).
- [ ] SQLite size warning shown when > 40 MB.

---

## Testing Requirements

Unit tests:
- `marksDraftService.saveDraft()` and `loadDraft()`.
- `dbMaintenance.performDatabaseMaintenance()` with mock date.
- `bundleLoader.loadMorningBundle()` — skips outside time window, skips on non-WiFi.

Integration tests:
- Offline → submit marks → online → verify sync → server has correct marks.
- Conflict: submit attendance online for same class/date → verify 409 → conflict UI shown.

E2E (Maestro):
- `teacher_offline_marks.yaml`: enter marks offline → reconnect → verify submitted.
- `teacher_diary_offline.yaml`: post diary offline → reconnect → parent sees entry.

---

## Definition of Done

- [ ] All acceptance criteria pass.
- [ ] Tested on physical Android device with airplane mode.
- [ ] SQLite WAL mode confirmed active.
- [ ] Idempotency tested with duplicate HTTP requests (curl or Postman).
- [ ] No TypeScript errors.
- [ ] Peer review complete.
