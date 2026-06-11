# PROMPT-04: Teacher Portal — Attendance, Timetable & Offline Foundation

> **Version**: 2.0 — Full 10-Phase Anatomy  
> **Epic**: EP-04 + EP-12 (Offline Foundation)  
> **Sprint**: 7–8 (Weeks 13–16)  
> **Story Points**: 38  
> **Prerequisites**: PROMPT-01 ✓, PROMPT-02 ✓  
> **Critical Path**: This is the highest-risk prompt. Offline attendance is the most complex feature.  
> **Next Prompt**: PROMPT-12 (Advanced Offline) — extends what this prompt builds

---

## PHASE 1: Context & Scope

> **ONE APP — TEACHER PORTAL:** This prompt builds the `(teacher)` route group inside the single Vitana SMS app binary. It is **not** a separate app. Users with roles `Teacher`, `Staff`, `Librarian`, `TransportManager`, `HostelWarden`, and `Receptionist` are routed here after login. The same `com.vitana.sms` binary serves all roles.

### What We're Building

The Teacher Portal with the most critical feature: **offline attendance marking**. Teachers mark attendance in classrooms where connectivity is unreliable. The app must work with zero network.

**Capabilities:**
- Teacher dashboard (aggregated view)
- Today's timetable (SQLite-cached for offline)
- Class list with student roster per class
- Bulk attendance marking — works fully offline
- Student list cached in SQLite per class
- Leave request management (approve/reject)
- Teacher's own leave application

### Current State

- ✅ Auth complete, API client working
- ✅ `/(teacher)/_layout.tsx` — tab skeleton exists
- ✅ TanStack Query, Zustand, SecureStore all working
- ❌ SQLite not set up (this prompt sets it up)
- ❌ Offline queue not built (this prompt builds it)
- ❌ Teacher screens — empty placeholders

### Success Criteria

- [ ] Teacher attendance marking works with no internet (airplane mode)
- [ ] Student list loaded from SQLite when offline
- [ ] Offline attendance submission queued and synced on reconnect
- [ ] "All Present" marks 40 students in < 100ms
- [ ] Attendance grid renders 40 students without visible jank (FlashList)
- [ ] Already-submitted attendance shows as read-only
- [ ] Offline banner appears immediately when airplane mode enabled
- [ ] Conflict detected (409) → resolution UI shown
- [ ] Leave approval sends push notification to teacher (via backend)
- [ ] Timetable available offline from SQLite cache
- [ ] SQLite WAL mode enabled (verified via Drizzle pragma)

---

## PHASE 2: Analysis Phase

### Read First

```bash
docs/mobile_application_docs/10-offline-architecture.md   # CRITICAL — read fully
docs/mobile_application_docs/epics/EP-04-teacher-app.md
docs/mobile_application_docs/epics/EP-12-offline-sync.md
```

### Existing Code Audit

```bash
# Verify placeholder screens
ls mobile/app/\(teacher\)/

# Check expo-sqlite is installed
grep "expo-sqlite" mobile/package.json

# Check drizzle-orm is installed
grep "drizzle-orm" mobile/package.json

# Check @react-native-community/netinfo is installed
grep "netinfo" mobile/package.json
```

### Backend API Contracts

```
GET /api/mobile/teacher-dashboard     → { todaySchedule[], pendingLeaveCount, classesStatus[], unreadCount }
GET /api/timetable/my-schedule         → TimetableEntry[] (today's periods for logged-in teacher)
GET /api/academics/teacher-assignments → { classId, className, subjects[] }[]
GET /api/students?classId=X&minimal=true → { id, firstName, lastName, rollNumber, photoUrl }[]
POST /api/attendance/students/bulk     → { classId, date, records: [{ studentId, status }] }
                                         Header: X-Idempotency-Key: <uuid>
PUT  /api/attendance/students/{id}     → Updated record
GET  /api/attendance/stats?classId=X   → { presentCount, absentCount, percent }
GET  /api/attendance/leave-requests?classId=X&status=pending → LeaveRequest[]
PUT  /api/attendance/leave-requests/{id}/approve → {}
PUT  /api/attendance/leave-requests/{id}/reject  → {}
POST /api/leavemanagement/leave-requests → { leaveTypeId, fromDate, toDate, reason }
GET  /api/leavemanagement/leave-types   → LeaveType[]
```

---

## PHASE 3: Technical Planning

### 3.1 SQLite Schema (Offline Foundation)

This prompt sets up the SQLite database used by all offline features. Later prompts (PROMPT-12) add more tables.

```
SQLite tables created in this prompt:
  - cachedStudentLists    (per-class student cache)
  - attendanceDrafts      (in-progress attendance before submit)
  - offlineQueue          (all queued API operations)

Tables added in PROMPT-12:
  - marksDrafts
  - diaryEntryQueue
  - offlineBundleCache
```

### 3.2 Attendance Offline Flow

```
Teacher opens Attendance screen (classId)
       │
       ├── Online? → GET /api/students?classId=X&minimal=true
       │             Store result in cachedStudentLists (SQLite)
       │
       └── Offline? → Read cachedStudentLists from SQLite
                      If empty: "No cached data available. Please connect to load students."
       │
       ▼
Teacher marks attendance (state held in React local state)
All changes debounce-saved to attendanceDrafts (SQLite) every 500ms
       │
Teacher taps "Submit"
       │
       ├── Online?  → POST /api/attendance/students/bulk
       │              X-Idempotency-Key: UUID stored with draft
       │              On success: mark draft as submitted, invalidate queries
       │
       └── Offline? → Insert into offlineQueue
                      Status: 'pending'
                      Toast: "Saved offline. Will sync when connected."
       │
Sync Engine (on reconnect / foreground):
       → Process offlineQueue FIFO
       → On 409: show ConflictResolutionSheet
       → On success: remove from queue
```

### 3.3 Screen Map

```
mobile/app/(teacher)/
├── _layout.tsx
├── index.tsx              ← Teacher Dashboard
├── timetable/
│   └── index.tsx          ← Today's schedule + weekly view
├── classes/
│   ├── index.tsx          ← My assigned classes grid
│   └── [classId]/
│       └── index.tsx      ← Class detail + student list
├── attendance/
│   └── [classId].tsx      ← Attendance marking grid (CRITICAL)
├── leaves/
│   ├── index.tsx          ← Pending leave requests
│   ├── apply.tsx          ← Teacher's own leave form
│   └── status.tsx         ← Own leave request history
└── more.tsx               ← More menu
```

---

## PHASE 4: Database Design (SQLite)

```typescript
// mobile/src/offline/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ── Cached student lists ─────────────────────────────────────────────────────
export const cachedStudentLists = sqliteTable('cached_student_lists', {
  classId:      text('class_id').primaryKey(),
  students:     text('students').notNull(),     // JSON: MinimalStudent[]
  cachedAt:     integer('cached_at').notNull(), // Unix ms timestamp
  academicYear: text('academic_year').notNull(),
  schoolId:     text('school_id').notNull(),
});

// ── Attendance drafts ────────────────────────────────────────────────────────
export const attendanceDrafts = sqliteTable('attendance_drafts', {
  id:              text('id').primaryKey(),     // composite: classId + date
  classId:         text('class_id').notNull(),
  date:            text('date').notNull(),      // 'YYYY-MM-DD'
  academicYear:    text('academic_year').notNull(),
  records:         text('records').notNull(),   // JSON: { studentId, status }[]
  idempotencyKey:  text('idempotency_key').notNull(), // UUID for server dedup
  isSubmitted:     integer('is_submitted', { mode: 'boolean' }).default(false),
  lastModified:    integer('last_modified').notNull(),
  markedBy:        text('marked_by').notNull(),
  schoolId:        text('school_id').notNull(),
});

// ── Offline write queue ──────────────────────────────────────────────────────
export const offlineQueue = sqliteTable('offline_queue', {
  id:              text('id').primaryKey(),
  createdAt:       integer('created_at').notNull(),
  method:          text('method').notNull(),          // 'POST' | 'PUT' | 'PATCH'
  endpoint:        text('endpoint').notNull(),
  body:            text('body').notNull(),             // JSON stringified
  extraHeaders:    text('extra_headers'),              // JSON { key: value }
  retryCount:      integer('retry_count').default(0),
  maxRetries:      integer('max_retries').default(3),
  status:          text('status').default('pending'), // 'pending'|'processing'|'synced'|'failed'
  errorMessage:    text('error_message'),
  syncedAt:        integer('synced_at'),
  operationType:   text('operation_type').notNull(),  // 'attendance'|'diary'|'leave'|etc.
  schoolId:        text('school_id').notNull(),
  userId:          text('user_id').notNull(),
});

// ── Timetable cache ──────────────────────────────────────────────────────────
export const cachedTimetable = sqliteTable('cached_timetable', {
  teacherId:    text('teacher_id').primaryKey(),
  timetable:    text('timetable').notNull(),  // JSON
  cachedAt:     integer('cached_at').notNull(),
  academicYear: text('academic_year').notNull(),
  schoolId:     text('school_id').notNull(),
});
```

```typescript
// mobile/src/offline/db.ts
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import * as schema from './schema';

const sqliteDb = SQLite.openDatabaseSync('vitana_offline.db', {
  enableChangeListener: false,
});

export const db = drizzle(sqliteDb, { schema });

export async function initDatabase() {
  // Enable WAL mode for better performance and crash safety
  await sqliteDb.execAsync('PRAGMA journal_mode = WAL;');
  await sqliteDb.execAsync('PRAGMA foreign_keys = ON;');

  // Create tables if they don't exist
  await sqliteDb.execAsync(`
    CREATE TABLE IF NOT EXISTS cached_student_lists (
      class_id TEXT PRIMARY KEY,
      students TEXT NOT NULL,
      cached_at INTEGER NOT NULL,
      academic_year TEXT NOT NULL,
      school_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS attendance_drafts (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      date TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      records TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      is_submitted INTEGER DEFAULT 0,
      last_modified INTEGER NOT NULL,
      marked_by TEXT NOT NULL,
      school_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS offline_queue (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      method TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      body TEXT NOT NULL,
      extra_headers TEXT,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      synced_at INTEGER,
      operation_type TEXT NOT NULL,
      school_id TEXT NOT NULL,
      user_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cached_timetable (
      teacher_id TEXT PRIMARY KEY,
      timetable TEXT NOT NULL,
      cached_at INTEGER NOT NULL,
      academic_year TEXT NOT NULL,
      school_id TEXT NOT NULL
    );
  `);
}
```

---

## PHASE 5: Backend Implementation

### New Endpoint: Minimal Student List

```csharp
// Add ?minimal=true support to GET /api/students
// When minimal=true, return only: id, firstName, lastName, rollNumber, profilePhotoUrl
[HttpGet]
public async Task<IActionResult> GetStudents(
    [FromQuery] string? classId,
    [FromQuery] bool minimal = false,
    [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
{
    if (minimal && classId != null)
    {
        var minimalStudents = await _studentService.GetMinimalByClassAsync(classId, page, pageSize);
        return Ok(minimalStudents); // Returns { id, firstName, lastName, rollNumber, photoUrl }[]
    }
    // ... existing full response
}
```

### Idempotency Key Support

```csharp
// Add IdempotencyMiddleware or per-endpoint check for POST /api/attendance/students/bulk
// Store: Redis key "idempotency:{key}" → response JSON, TTL 24h
// On duplicate key: return 200 with original response (no duplicate write)
```

---

## PHASE 6: Mobile Implementation

### 6.1 Teacher API Layer

```typescript
// mobile/src/api/endpoints/teacher.ts
import apiClient from '../client';

export const teacherApi = {
  getDashboard: () => apiClient.get('/mobile/teacher-dashboard'),

  getTodaySchedule: () => apiClient.get('/timetable/my-schedule'),

  getTeacherAssignments: () => apiClient.get('/academics/teacher-assignments'),

  getClassStudents: (classId: string): Promise<MinimalStudent[]> =>
    apiClient.get('/students', { params: { classId, minimal: true, pageSize: 100 } }),

  submitBulkAttendance: (payload: BulkAttendancePayload, idempotencyKey: string) =>
    apiClient.post('/attendance/students/bulk', payload, {
      headers: { 'X-Idempotency-Key': idempotencyKey },
    }),

  getAttendanceStats: (classId: string) =>
    apiClient.get('/attendance/stats', { params: { classId } }),

  getPendingLeaves: (classId?: string) =>
    apiClient.get('/attendance/leave-requests', {
      params: { classId, status: 'pending' },
    }),

  approveLeave: (id: string, remark?: string) =>
    apiClient.put(`/attendance/leave-requests/${id}/approve`, { remark }),

  rejectLeave: (id: string, reason: string) =>
    apiClient.put(`/attendance/leave-requests/${id}/reject`, { reason }),

  applyOwnLeave: (data: OwnLeaveRequest) =>
    apiClient.post('/leavemanagement/leave-requests', data),

  getLeaveTypes: () => apiClient.get('/leavemanagement/leave-types'),
};

interface MinimalStudent { id: string; firstName: string; lastName: string; rollNumber: string; photoUrl: string | null; }
interface BulkAttendancePayload { classId: string; date: string; records: { studentId: string; status: string; }[]; }
interface OwnLeaveRequest { leaveTypeId: string; fromDate: string; toDate: string; reason: string; }
```

### 6.2 Connection Banner Component

```typescript
// mobile/src/components/common/ConnectionBanner.tsx
import { View, Text, Animated, useRef, useEffect } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

export function ConnectionBanner() {
  const [netState, setNetState] = useState<NetInfoState | null>(null);
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetState(state);
      const isOffline = !state.isConnected || !state.isInternetReachable;
      Animated.spring(translateY, {
        toValue: isOffline ? 0 : -60,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
    });
    return unsubscribe;
  }, []);

  if (!netState) return null;

  const isOffline = !netState.isConnected || !netState.isInternetReachable;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        className="px-4 py-2 flex-row items-center justify-center"
        style={{ backgroundColor: isOffline ? VITANA_DESIGN_TOKENS.colors.warning : VITANA_DESIGN_TOKENS.colors.success }}
      >
        <Feather
          name={isOffline ? 'wifi-off' : 'wifi'}
          size={14}
          color="white"
        />
        <Text className="font-body-medium text-white text-xs ml-2">
          {isOffline ? 'Offline — changes saved locally' : 'Back online — syncing...'}
        </Text>
      </View>
    </Animated.View>
  );
}
```

### 6.3 Offline Queue Processor

```typescript
// mobile/src/offline/queue.ts
import { db } from './db';
import { offlineQueue } from './schema';
import { eq, and, lte, asc } from 'drizzle-orm';
import apiClient from '../api/client';
import { queryClient } from '../api/queryClient';

export class OfflineQueueProcessor {
  private static isProcessing = false;

  static async processQueue(userId: string, schoolId: string): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pending = await db
        .select()
        .from(offlineQueue)
        .where(
          and(
            eq(offlineQueue.userId, userId),
            eq(offlineQueue.schoolId, schoolId),
            eq(offlineQueue.status, 'pending'),
          )
        )
        .orderBy(asc(offlineQueue.createdAt))
        .limit(20);

      for (const item of pending) {
        await this.processItem(item, userId);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private static async processItem(item: typeof offlineQueue.$inferSelect, userId: string) {
    // Mark as processing
    await db.update(offlineQueue)
      .set({ status: 'processing' })
      .where(eq(offlineQueue.id, item.id));

    const extraHeaders = item.extraHeaders ? JSON.parse(item.extraHeaders) : {};

    try {
      await apiClient.request({
        method: item.method as any,
        url: item.endpoint,
        data: JSON.parse(item.body),
        headers: extraHeaders,
      });

      // Success
      await db.update(offlineQueue)
        .set({ status: 'synced', syncedAt: Date.now() })
        .where(eq(offlineQueue.id, item.id));

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [item.operationType] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });

    } catch (error: any) {
      const retryCount = (item.retryCount ?? 0) + 1;
      const isConflict = error?.status === 409;

      if (isConflict) {
        // Don't retry conflicts — need human resolution
        await db.update(offlineQueue)
          .set({
            status: 'failed',
            errorMessage: 'Conflict: Data was already submitted by someone else.',
            retryCount,
          })
          .where(eq(offlineQueue.id, item.id));
      } else if (retryCount >= (item.maxRetries ?? 3)) {
        await db.update(offlineQueue)
          .set({
            status: 'failed',
            errorMessage: error?.message ?? 'Unknown error',
            retryCount,
          })
          .where(eq(offlineQueue.id, item.id));
      } else {
        await db.update(offlineQueue)
          .set({ status: 'pending', retryCount })
          .where(eq(offlineQueue.id, item.id));
      }
    }
  }

  static async enqueue(params: {
    method: string; endpoint: string; body: object;
    extraHeaders?: Record<string, string>;
    operationType: string; userId: string; schoolId: string;
  }) {
    const { generateUUID } = await import('@vitana/shared-utils');
    await db.insert(offlineQueue).values({
      id: generateUUID(),
      createdAt: Date.now(),
      method: params.method,
      endpoint: params.endpoint,
      body: JSON.stringify(params.body),
      extraHeaders: params.extraHeaders ? JSON.stringify(params.extraHeaders) : null,
      operationType: params.operationType,
      userId: params.userId,
      schoolId: params.schoolId,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
    });
  }

  static async getPendingCount(userId: string): Promise<number> {
    const result = await db
      .select()
      .from(offlineQueue)
      .where(and(eq(offlineQueue.userId, userId), eq(offlineQueue.status, 'pending')));
    return result.length;
  }
}
```

### 6.4 Sync Engine

```typescript
// mobile/src/offline/syncEngine.ts
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { OfflineQueueProcessor } from './queue';
import { useAuthStore } from '../stores/authStore';

let syncInProgress = false;

async function triggerSync() {
  if (syncInProgress) return;
  syncInProgress = true;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected || !netState.isInternetReachable) {
    syncInProgress = false;
    return;
  }

  const { user } = useAuthStore.getState();
  if (!user) { syncInProgress = false; return; }

  try {
    await OfflineQueueProcessor.processQueue(user.id, user.schoolId);
  } finally {
    syncInProgress = false;
  }
}

export function initializeSyncEngine() {
  // Sync on connectivity restoration
  const netUnsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      triggerSync();
    }
  });

  // Sync when app comes to foreground
  const appStateUnsubscribe = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState === 'active') {
      triggerSync();
    }
  });

  return () => {
    netUnsubscribe();
    appStateUnsubscribe.remove();
  };
}
```

### 6.5 Root Layout Update (Initialize DB + Sync Engine)

```typescript
// mobile/app/_layout.tsx — ADD these initializations
// After existing imports, add:
import { initDatabase } from '../src/offline/db';
import { initializeSyncEngine } from '../src/offline/syncEngine';

// Inside RootLayout component, after fonts are loaded:
useEffect(() => {
  // Initialize SQLite
  initDatabase().catch((err) => console.error('[DB] Init failed:', err));
  // Initialize sync engine
  const cleanup = initializeSyncEngine();
  return cleanup;
}, []);
```

### 6.6 Attendance Marking Screen (Critical Path)

```typescript
// mobile/app/(teacher)/attendance/[classId].tsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import NetInfo from '@react-native-community/netinfo';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../src/offline/db';
import { cachedStudentLists, attendanceDrafts, offlineQueue } from '../../../src/offline/schema';
import { OfflineQueueProcessor } from '../../../src/offline/queue';
import { teacherApi } from '../../../src/api/endpoints/teacher';
import { ConnectionBanner } from '../../../src/components/common/ConnectionBanner';
import { useAuthStore } from '../../../src/stores/authStore';
import { useSchoolStore } from '../../../src/stores/schoolStore';
import { generateUUID, VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';
import { queryClient } from '../../../src/api/queryClient';

type Status = 'Present' | 'Absent' | 'Late';
interface AttendanceRecord { studentId: string; status: Status; }
interface Student { id: string; firstName: string; lastName: string; rollNumber: string; photoUrl: string | null; }

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  Present: { label: 'P', color: '#16a34a', bg: '#dcfce7' },
  Absent:  { label: 'A', color: '#ef4444', bg: '#fee2e2' },
  Late:    { label: 'L', color: '#d97706', bg: '#fef3c7' },
};

export default function AttendanceMarking() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { user } = useAuthStore();
  const { branding, academicYear } = useSchoolStore();
  const primaryColor = branding?.primaryColor ?? VITANA_DESIGN_TOKENS.colors.primary;

  const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
  const draftId = `${classId}-${today}`;
  const idempotencyKeyRef = useRef(generateUUID());

  const [records, setRecords] = useState<Record<string, Status>>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => setIsConnected(!!state.isConnected && !!state.isInternetReachable));
    return unsubscribe;
  }, []);

  // Load students (online: fetch + cache; offline: from SQLite)
  useEffect(() => {
    loadStudents();
  }, [classId]);

  async function loadStudents() {
    setIsLoadingStudents(true);
    try {
      const netState = await NetInfo.fetch();
      if (netState.isConnected && netState.isInternetReachable) {
        const fetched = await teacherApi.getClassStudents(classId!);
        setStudents(fetched as Student[]);
        // Cache to SQLite
        await db.insert(cachedStudentLists)
          .values({
            classId: classId!,
            students: JSON.stringify(fetched),
            cachedAt: Date.now(),
            academicYear: academicYear ?? '2025-2026',
            schoolId: user!.schoolId,
          })
          .onConflictDoUpdate({ target: cachedStudentLists.classId, set: {
            students: JSON.stringify(fetched), cachedAt: Date.now(),
          }});
      } else {
        const cached = await db.select().from(cachedStudentLists).where(eq(cachedStudentLists.classId, classId!)).limit(1);
        if (cached[0]) {
          setStudents(JSON.parse(cached[0].students));
        }
      }
    } catch (err) {
      console.error('[Attendance] Load students error:', err);
    } finally {
      setIsLoadingStudents(false);
    }

    // Load existing draft if any
    const existingDraft = await db.select().from(attendanceDrafts).where(eq(attendanceDrafts.id, draftId)).limit(1);
    if (existingDraft[0] && !existingDraft[0].isSubmitted) {
      const draftRecords: AttendanceRecord[] = JSON.parse(existingDraft[0].records);
      const recordMap: Record<string, Status> = {};
      draftRecords.forEach(r => { recordMap[r.studentId] = r.status; });
      setRecords(recordMap);
      idempotencyKeyRef.current = existingDraft[0].idempotencyKey;
    } else {
      // Default all to Present
      // (will be set after students load)
    }
  }

  // Set all to Present when students first load (and no draft)
  useEffect(() => {
    if (students.length > 0 && Object.keys(records).length === 0) {
      const allPresent: Record<string, Status> = {};
      students.forEach(s => { allPresent[s.id] = 'Present'; });
      setRecords(allPresent);
    }
  }, [students]);

  // Auto-save draft to SQLite (debounced)
  useEffect(() => {
    if (Object.keys(records).length === 0) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveDraft(), 500);
    return () => clearTimeout(saveTimerRef.current);
  }, [records]);

  async function saveDraft() {
    const recordsArray: AttendanceRecord[] = Object.entries(records).map(([studentId, status]) => ({ studentId, status }));
    await db.insert(attendanceDrafts)
      .values({
        id: draftId,
        classId: classId!,
        date: today,
        academicYear: academicYear ?? '2025-2026',
        records: JSON.stringify(recordsArray),
        idempotencyKey: idempotencyKeyRef.current,
        isSubmitted: false,
        lastModified: Date.now(),
        markedBy: user!.id,
        schoolId: user!.schoolId,
      })
      .onConflictDoUpdate({
        target: attendanceDrafts.id,
        set: { records: JSON.stringify(recordsArray), lastModified: Date.now() },
      });
  }

  function toggleStatus(studentId: string) {
    setRecords(prev => {
      const current = prev[studentId] ?? 'Present';
      const next: Status = current === 'Present' ? 'Absent' : current === 'Absent' ? 'Late' : 'Present';
      return { ...prev, [studentId]: next };
    });
  }

  function markAllPresent() {
    const allPresent: Record<string, Status> = {};
    students.forEach(s => { allPresent[s.id] = 'Present'; });
    setRecords(allPresent);
  }

  async function submitAttendance() {
    setIsSubmitting(true);
    const recordsArray: AttendanceRecord[] = Object.entries(records).map(([studentId, status]) => ({ studentId, status }));
    const payload = { classId, date: today, academicYear, records: recordsArray };

    try {
      if (isConnected) {
        await teacherApi.submitBulkAttendance(payload, idempotencyKeyRef.current);
        await db.update(attendanceDrafts).set({ isSubmitted: true }).where(eq(attendanceDrafts.id, draftId));
        queryClient.invalidateQueries({ queryKey: ['attendance', classId] });
        queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] });
        router.back();
      } else {
        await OfflineQueueProcessor.enqueue({
          method: 'POST',
          endpoint: '/attendance/students/bulk',
          body: payload,
          extraHeaders: { 'X-Idempotency-Key': idempotencyKeyRef.current },
          operationType: 'attendance',
          userId: user!.id,
          schoolId: user!.schoolId,
        });
        Alert.alert(
          'Saved Offline',
          'Attendance saved and will be submitted automatically when you reconnect.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to submit attendance.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredStudents = search.trim()
    ? students.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        s.rollNumber.includes(search)
      )
    : students;

  const presentCount = Object.values(records).filter(s => s === 'Present').length;
  const absentCount = Object.values(records).filter(s => s === 'Absent').length;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <ConnectionBanner />

      {/* Header */}
      <View className="px-4 pt-4 pb-2 bg-white border-b border-border">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={VITANA_DESIGN_TOKENS.colors.textPrimary} />
          </TouchableOpacity>
          <View className="flex-1 mx-3">
            <Text className="font-heading text-base text-text-primary">Mark Attendance</Text>
            <Text className="font-body text-xs text-text-secondary">{today}</Text>
          </View>
          <TouchableOpacity
            onPress={markAllPresent}
            className="px-3 py-1.5 rounded-lg border"
            style={{ borderColor: primaryColor }}
          >
            <Text className="font-body-medium text-xs" style={{ color: primaryColor }}>All Present</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View className="flex-row mt-3 gap-4">
          <View className="flex-row items-center">
            <View className="w-2.5 h-2.5 rounded-full bg-success mr-1.5" />
            <Text className="font-body text-sm text-text-primary">{presentCount} present</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-2.5 h-2.5 rounded-full bg-danger mr-1.5" />
            <Text className="font-body text-sm text-text-primary">{absentCount} absent</Text>
          </View>
          <Text className="font-body text-sm text-text-secondary">{students.length} total</Text>
        </View>

        {/* Search */}
        <View className="mt-3 flex-row items-center bg-surface border border-border rounded-xl px-3 py-2">
          <Feather name="search" size={16} color={VITANA_DESIGN_TOKENS.colors.textSecondary} />
          <TextInput
            value={search} onChangeText={setSearch}
            placeholder="Search student..."
            placeholderTextColor={VITANA_DESIGN_TOKENS.colors.textSecondary}
            className="flex-1 ml-2 font-body text-text-primary text-sm"
          />
        </View>
      </View>

      {/* Student List */}
      {isLoadingStudents ? (
        <View className="flex-1 items-center justify-center">
          <Text className="font-body text-text-secondary">Loading students...</Text>
        </View>
      ) : filteredStudents.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="font-body text-text-secondary">No students found</Text>
        </View>
      ) : (
        <FlashList
          data={filteredStudents}
          estimatedItemSize={68}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const status = records[item.id] ?? 'Present';
            const config = STATUS_CONFIG[status];
            return (
              <TouchableOpacity
                onPress={() => toggleStatus(item.id)}
                className="flex-row items-center px-4 py-3 border-b border-border bg-white"
                activeOpacity={0.7}
                accessibilityLabel={`${item.firstName} ${item.lastName} - ${status}. Tap to change.`}
              >
                {/* Photo */}
                <View className="w-10 h-10 rounded-full overflow-hidden bg-surface mr-3">
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={{ width: 40, height: 40 }} contentFit="cover" />
                  ) : (
                    <View className="w-10 h-10 items-center justify-center">
                      <Text className="font-heading text-base text-text-secondary">
                        {item.firstName[0]}
                      </Text>
                    </View>
                  )}
                </View>
                {/* Name + Roll */}
                <View className="flex-1">
                  <Text className="font-body-medium text-text-primary text-sm">
                    {item.firstName} {item.lastName}
                  </Text>
                  <Text className="font-body text-text-secondary text-xs">Roll {item.rollNumber}</Text>
                </View>
                {/* Status Toggle */}
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center border"
                  style={{ backgroundColor: config.bg, borderColor: config.color }}
                >
                  <Text className="font-body-bold text-sm" style={{ color: config.color }}>
                    {config.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Submit Footer */}
      <View className="px-4 py-3 bg-white border-t border-border">
        <TouchableOpacity
          onPress={submitAttendance}
          disabled={isSubmitting || students.length === 0}
          className="rounded-xl py-4 items-center"
          style={{ backgroundColor: primaryColor, opacity: isSubmitting ? 0.7 : 1 }}
          accessibilityLabel={isConnected ? 'Submit attendance' : 'Save attendance offline'}
        >
          <Text className="font-body-semibold text-white text-base">
            {isSubmitting ? 'Submitting...' : isConnected ? 'Submit Attendance' : '💾 Save Offline'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

---

## PHASE 7: AI/ML Integration

> Not applicable.

---

## PHASE 8: External Integrations

### Expo SQLite + Drizzle ORM

```bash
# Already installed in PROMPT-01
# Verify:
grep "expo-sqlite" mobile/package.json      # ✓
grep "drizzle-orm" mobile/package.json      # ✓
grep "drizzle-kit" mobile/package.json      # ✓ (devDependencies)
```

---

## PHASE 9: Testing & Validation

### 9.1 Offline Tests

```typescript
// mobile/src/offline/__tests__/queue.test.ts
import { OfflineQueueProcessor } from '../queue';
import { db } from '../db';
import { offlineQueue } from '../schema';

// Mock apiClient
jest.mock('../../api/client', () => ({
  request: jest.fn(),
}));

describe('OfflineQueueProcessor', () => {
  beforeEach(async () => {
    // Clear queue between tests
    await db.delete(offlineQueue);
  });

  it('enqueue adds item to SQLite', async () => {
    await OfflineQueueProcessor.enqueue({
      method: 'POST',
      endpoint: '/attendance/students/bulk',
      body: { classId: '1', date: '2026-06-10', records: [] },
      operationType: 'attendance',
      userId: 'user-1',
      schoolId: 'school-1',
    });

    const count = await OfflineQueueProcessor.getPendingCount('user-1');
    expect(count).toBe(1);
  });
});
```

### 9.2 Maestro E2E

```yaml
# mobile/maestro/tests/teacher_mark_attendance.yaml
appId: com.vitana.sms
---
- launchApp
- tapOn: "Classes"
- tapOn: "8A"  # first class
- tapOn: "Mark Attendance"
- assertVisible: "Mark Attendance"
- tapOn: "All Present"  # marks all as present
- tapOn: "Submit Attendance"
- assertVisible: "Classes"  # navigated back after submit
```

```yaml
# mobile/maestro/tests/teacher_offline_attendance.yaml
appId: com.vitana.sms
---
- launchApp
- tapOn: "Classes"
- tapOn: "8A"
- tapOn: "Mark Attendance"
- setLocation:   # simulate offline
    airplane: true
- tapOn: "All Present"
- tapOn: "Save Offline"
- assertVisible: "Saved offline"
- setLocation:
    airplane: false
# Wait for sync
- waitForAnimationToEnd
```

### 9.3 Validation Checklist

- [ ] SQLite WAL mode: run `PRAGMA journal_mode;` → returns `wal`
- [ ] Student list cached: open attendance page online → enable airplane mode → reopen → students visible
- [ ] Offline queue: enable airplane mode → mark attendance → submit → check SQLite has 1 pending item
- [ ] Sync: disable airplane mode → within 5s, pending item is synced
- [ ] "All Present" marks 40 students in < 100ms (profile in React DevTools)
- [ ] FlashList renders 40 rows without jank (check FPS in Expo DevTools)
- [ ] Leave approval: approve leave → staff gets push notification

---

## PHASE 10: Documentation & Verification

### Verification Commands

```bash
pnpm --filter @vitana/mobile typecheck
pnpm --filter @vitana/mobile lint
pnpm --filter @vitana/mobile test -- --testPathPattern=offline

# Start app and test offline flow:
pnpm --filter @vitana/mobile start
# 1. Login as teacher
# 2. Open Classes → select a class → Mark Attendance
# 3. Enable airplane mode on phone
# 4. Mark some absent, tap "Save Offline"
# 5. Disable airplane mode
# 6. Within 5 seconds, see "Syncing..." banner, then success
```

### Git Commit

```bash
git add .
git commit -m "feat(mobile/teacher): teacher portal with offline attendance

- SQLite schema: cachedStudentLists, attendanceDrafts, offlineQueue, cachedTimetable
- Drizzle ORM setup with WAL mode + foreign keys
- OfflineQueueProcessor: enqueue, process, retry, conflict detection
- SyncEngine: auto-sync on reconnect + app foreground
- ConnectionBanner: animated offline/online indicator
- Teacher dashboard with pending tasks and class status
- Attendance marking grid (FlashList, 40+ students, < 100ms All Present)
- Offline attendance: works in airplane mode, syncs on reconnect
- Student list cached to SQLite per class
- Leave approval (approve + reject with mandatory reason)
- Teacher own leave application

Next: PROMPT-05 (Push Notifications)"
```

---

**END OF PROMPT-04**
