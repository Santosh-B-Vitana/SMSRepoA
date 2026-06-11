# Vitana Mobile Platform — Offline Architecture

> **Classification:** Internal Architecture Document  
> **Version:** 1.0  
> **Date:** June 2026  
> **Related Docs:** [06-mobile-architecture](./06-mobile-architecture.md) · [03-api-analysis](./03-api-analysis.md)

---

## 1. Offline Philosophy

> Teachers mark attendance. They do it in classrooms. Classrooms in India frequently have poor connectivity.  
> Offline support for attendance marking is not optional — it is a core reliability requirement.

Vitana's offline strategy is **selective and practical**:
- Offline support for the **most critical, most time-sensitive operations** only.
- Read cache (TanStack Query) covers most "view" scenarios automatically.
- Write queue covers the operations that must succeed even without a connection.
- Complex, high-risk operations (fee collection, exam result finalization) are **online-only**.

---

## 2. Offline Capability Matrix

| Feature | Offline Read | Offline Write | Sync On Reconnect |
|---|---|---|---|
| View timetable | ✅ Cached | — | Auto-refresh |
| View announcements | ✅ Cached | — | Auto-refresh |
| View attendance history | ✅ Cached | — | Auto-refresh |
| **Mark attendance** | ✅ (pre-loaded student list) | ✅ Queued | Flush queue |
| View fee summary | ✅ Cached | — | Auto-refresh |
| **Pay fee** | — | ✗ Online only | — |
| View exam results | ✅ Cached | — | Auto-refresh |
| **Submit assignment** | — | ✅ Queued (text only) | Flush queue |
| **Post diary entry** | — | ✅ Queued | Flush queue |
| **Apply for leave** | — | ✅ Queued | Flush queue |
| Send message to teacher | — | ✅ Queued | Flush queue |
| Upload document/photo | — | ✗ Online only | — |
| Enter exam marks | — | ✅ Draft in SQLite | Manual sync |
| View student list | ✅ Cached (teacher's classes) | — | Auto-refresh |
| Push notifications | ✗ (requires connectivity) | — | — |
| Online exam | ✗ Online only | — | — |

---

## 3. Architecture Components

```
Mobile App
├── TanStack Query Cache (in-memory + AsyncStorage)
│   └── Handles: all GET requests, stale-while-revalidate
│
├── Offline Write Queue (Zustand + expo-sqlite)
│   └── Handles: POST/PUT operations when offline
│       └── Persisted to SQLite so they survive app kills
│
├── Sync Engine (connectivity monitor + queue processor)
│   └── Triggers: on reconnect, on app foreground
│       └── Processes queue in FIFO order
│
└── SQLite Local Store (expo-sqlite + Drizzle ORM)
    └── Handles: attendance drafts, offline marks entry
        └── Permanent store, not evicted like TQ cache
```

---

## 4. SQLite Schema

```typescript
// src/offline/schema.ts  (Drizzle ORM definitions)

export const offlineQueue = sqliteTable('offline_queue', {
  id: text('id').primaryKey(),          // UUID
  createdAt: integer('created_at'),     // Unix timestamp
  method: text('method').notNull(),     // 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  endpoint: text('endpoint').notNull(), // '/api/attendance/students/bulk'
  body: text('body').notNull(),         // JSON stringified payload
  headers: text('headers'),             // JSON additional headers
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  status: text('status').default('pending'), // 'pending' | 'processing' | 'failed'
  errorMessage: text('error_message'),
  syncedAt: integer('synced_at'),       // null until synced
  operationType: text('operation_type'), // 'attendance' | 'diary' | 'leave' | 'assignment'
  schoolId: text('school_id').notNull(),
  userId: text('user_id').notNull(),
});

export const attendanceDrafts = sqliteTable('attendance_drafts', {
  id: text('id').primaryKey(),
  classId: text('class_id').notNull(),
  sectionId: text('section_id').notNull(),
  date: text('date').notNull(),          // 'YYYY-MM-DD'
  academicYear: text('academic_year').notNull(),
  records: text('records').notNull(),    // JSON: AttendanceRecord[]
  isSubmitted: integer('is_submitted', { mode: 'boolean' }).default(false),
  lastModified: integer('last_modified'), // Unix timestamp
  schoolId: text('school_id').notNull(),
  markedBy: text('marked_by').notNull(),
});

export const marksDrafts = sqliteTable('marks_drafts', {
  id: text('id').primaryKey(),
  examId: text('exam_id').notNull(),
  classId: text('class_id').notNull(),
  subjectId: text('subject_id').notNull(),
  marks: text('marks').notNull(),        // JSON: { studentId: marks }
  lastModified: integer('last_modified'),
  isSubmitted: integer('is_submitted', { mode: 'boolean' }).default(false),
  schoolId: text('school_id').notNull(),
});

export const cachedStudentLists = sqliteTable('cached_student_lists', {
  classId: text('class_id').primaryKey(),
  students: text('students').notNull(),  // JSON: Student[]
  cachedAt: integer('cached_at'),
  academicYear: text('academic_year').notNull(),
  schoolId: text('school_id').notNull(),
});
```

---

## 5. Offline Queue Processor

```typescript
// src/offline/queue.ts
export class OfflineQueueProcessor {
  private isProcessing = false;

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    try {
      const pendingItems = await db
        .select()
        .from(offlineQueue)
        .where(
          and(
            eq(offlineQueue.status, 'pending'),
            lte(offlineQueue.retryCount, offlineQueue.maxRetries)
          )
        )
        .orderBy(asc(offlineQueue.createdAt));
      
      for (const item of pendingItems) {
        await this.processItem(item);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processItem(item: OfflineQueueItem) {
    // Mark as processing
    await db.update(offlineQueue)
      .set({ status: 'processing' })
      .where(eq(offlineQueue.id, item.id));
    
    try {
      await apiClient.request({
        method: item.method,
        url: item.endpoint,
        data: JSON.parse(item.body),
      });
      
      // Success: mark as synced
      await db.update(offlineQueue)
        .set({ status: 'synced', syncedAt: Date.now() })
        .where(eq(offlineQueue.id, item.id));
      
      // Invalidate related TanStack Query cache
      invalidateCacheForOperation(item.operationType);
      
    } catch (error) {
      const retryCount = item.retryCount + 1;
      
      if (retryCount >= item.maxRetries) {
        await db.update(offlineQueue)
          .set({ 
            status: 'failed', 
            errorMessage: (error as Error).message,
            retryCount
          })
          .where(eq(offlineQueue.id, item.id));
        
        // Alert user of failed sync
        notifyUser(`Failed to sync: ${item.operationType}`);
      } else {
        await db.update(offlineQueue)
          .set({ status: 'pending', retryCount })
          .where(eq(offlineQueue.id, item.id));
      }
    }
  }
}
```

---

## 6. Connectivity Monitor

```typescript
// src/offline/syncEngine.ts
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { OfflineQueueProcessor } from './queue';

const processor = new OfflineQueueProcessor();

export function initializeSyncEngine() {
  // Trigger sync on connection restoration
  NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      processor.processQueue();
    }
  });
  
  // Trigger sync when app comes to foreground
  AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') {
      processor.processQueue();
    }
  });
}
```

---

## 7. Offline Attendance Flow (Teacher)

This is the most critical offline flow:

```
Teacher opens Attendance screen (ClassId pre-selected)
        │
        ▼
Load student list:
  - TanStack Query checks cache
  - If cached: use cache (even if stale)
  - If no cache and offline: use SQLite cachedStudentLists
  - If online: fetch fresh + update SQLite cache
        │
        ▼
Teacher marks attendance (Present / Absent / Late)
All changes stored in attendanceDrafts (SQLite) immediately
        │
        ▼
Teacher taps "Submit"
        │
        ├── Online? 
        │   └── POST /api/attendance/students/bulk → success → clear draft
        │
        └── Offline?
            └── Enqueue in offlineQueue as 'attendance' operation
                Show "Saved offline — will sync automatically"
                Badge count on sync status indicator
        │
        ▼
On next connectivity event:
  Queue processor picks up attendance submission
  Server returns success → draft cleared → UI refreshes
```

**Conflict resolution for attendance:**
- If a student was marked by another teacher online while offline submission is pending:
  - Server returns 409 Conflict.
  - Mobile shows: "Conflict detected for [Student Name] — submitted: [status], existing: [status]"
  - Teacher resolves conflict manually.

---

## 8. Marks Entry Offline Flow (Teacher)

```
Teacher opens Marks Entry (ExamId + ClassId)
        │
        ▼
Load existing marks from TanStack Query cache
        │
        ▼
Teacher enters marks → stored in marksDrafts (SQLite)
        │
Auto-save every 30 seconds to SQLite (never lost)
        │
        ▼
Teacher taps "Submit Marks"
        │
        ├── Online? → POST /api/examinations/results/bulk
        │   └── On success → clear SQLite draft
        │
        └── Offline? 
            → Enqueue in offline queue
            Show "Marks saved. Will submit when connected."
```

---

## 9. Offline Write Queue — Operation Types

| Operation | Endpoint | Conflict Strategy |
|---|---|---|
| `attendance` | `POST /api/attendance/students/bulk` | Server rejects if already marked → user resolves |
| `diary_entry` | `POST /api/diary` | Last-write-wins (diary entries have timestamps) |
| `leave_request` | `POST /api/leavemanagement/student-leave` | Idempotent (check if already exists before sending) |
| `assignment_text_submission` | `POST /api/assignments/{id}/submissions` | Check if already submitted |
| `message_send` | `POST /api/communication/messages` | Deduplicate by client-generated `idempotencyKey` |

All offline queue items include an `idempotencyKey` generated on the client. The server uses this to deduplicate — if the same request is received twice (e.g., due to retry), the second one is ignored.

---

## 10. Data Expiration & Storage Limits

| Store | Retention | Eviction Strategy |
|---|---|---|
| TanStack Query cache | 30 minutes (gcTime) | Automatic LRU |
| AsyncStorage (branding, flags) | 24 hours | Manual invalidation on login |
| SQLite `cachedStudentLists` | 2 hours | Time-based, refreshed on next foreground |
| SQLite `attendanceDrafts` (submitted) | 7 days | Cleanup job on app open |
| SQLite `offlineQueue` (synced) | 7 days | Cleanup job on app open |
| SQLite `offlineQueue` (failed) | 30 days | Manual clearing by user |
| SQLite total budget | 50 MB | Alert user at 40 MB |

---

## 11. Offline UX Indicators

```typescript
// Connection-aware banner at top of app
function ConnectionBanner() {
  const { isConnected } = useNetInfo();
  const pendingCount = useOfflineQueueCount();
  
  if (!isConnected) {
    return (
      <Banner variant="warning">
        You're offline. Data will sync when you reconnect.
        {pendingCount > 0 && ` (${pendingCount} pending)`}
      </Banner>
    );
  }
  
  if (isConnected && pendingCount > 0) {
    return (
      <Banner variant="info">
        Syncing {pendingCount} offline changes...
      </Banner>
    );
  }
  
  return null;
}
```

---

## 12. Offline Sync Bundle

For users in low-connectivity areas (rural schools), the app pre-downloads an offline bundle at the start of the school day:

```
GET /api/mobile/offline-bundle?role=teacher&classIds=A,B,C
Authorization: Bearer <token>
X-Academic-Year: 2025-2026

Response:
{
  "data": {
    "bundledAt": "2026-06-10T07:00:00Z",
    "expiresAt": "2026-06-10T23:59:59Z",
    
    "myClasses": [
      {
        "classId": "...",
        "className": "Class 8A",
        "students": [
          { "id": "...", "name": "...", "rollNumber": "..." }
        ]
      }
    ],
    
    "todaysTimetable": { ... },
    "pendingLeaveRequests": [ ... ],
    "announcements": [ ... ],
    "recentDiaryEntries": [ ... ]
  }
}
```

This bundle is downloaded when:
1. App first opens in the morning (between 6 AM and 9 AM, IST).
2. User explicitly taps "Sync Now" in the offline settings panel.
3. Background refresh every 4 hours (if on WiFi).

---

*Next: [11-build-automation.md](./11-build-automation.md)*
