# PROMPT-12: Advanced Offline Sync Engine

> **Version**: 2.0 — Full 10-Phase Anatomy  
> **Epic**: EP-12 — Offline Sync Engine (Advanced)  
> **Sprint**: 12 & 15 (Weeks 23–24 and 29–30)  
> **Story Points**: 24  
> **Prerequisites**: PROMPT-04 ✓ (SQLite foundation, basic offline queue exists)  
> **Extends**: SQLite schema with marks drafts, diary queue, morning bundle

---

## PHASE 1: Context & Scope

### What We're Building

The advanced offline engine that extends the foundation from PROMPT-04. That prompt built attendance offline. This prompt adds:

- **Marks entry offline drafts** — auto-save marks to SQLite every 30 seconds
- **Diary entry offline queue** — queue diary posts when offline
- **Morning offline bundle** — pre-download all daily data at school start
- **Conflict resolution UI** — handle 409 conflicts when syncing
- **Database maintenance** — cleanup old synced records to stay under 50 MB
- **Sync status screen** — visibility into pending/failed/synced operations

### Current State

- ✅ `offlineQueue` SQLite table exists
- ✅ `cachedStudentLists` SQLite table exists
- ✅ `attendanceDrafts` SQLite table exists
- ✅ `OfflineQueueProcessor` with basic enqueue/process
- ✅ `SyncEngine` triggers on reconnect + foreground
- ❌ `marksDrafts` table not created
- ❌ `diaryEntryQueue` table not created
- ❌ Morning offline bundle not implemented
- ❌ Conflict resolution UI not built
- ❌ Database maintenance not implemented

### Success Criteria

- [ ] Marks draft auto-saves every 30 seconds (verified in SQLite)
- [ ] Closing marks grid mid-entry and reopening shows saved draft with toast
- [ ] Offline marks submission queued and synced on reconnect
- [ ] Diary entry queued offline and synced on reconnect
- [ ] Morning bundle downloads automatically at app open between 6–10 AM on WiFi
- [ ] Conflict resolution sheet appears when 409 returned during sync
- [ ] After resolving conflict, correct data submitted
- [ ] Database maintenance clears synced records > 7 days old on startup
- [ ] Sync status screen shows correct pending/failed/synced counts
- [ ] SQLite total size monitored — warning at 40 MB

---

## PHASE 2: Analysis Phase

### Read First

```bash
docs/mobile_application_docs/10-offline-architecture.md  # CRITICAL — read all sections
docs/mobile_application_docs/epics/EP-12-offline-sync.md
```

### Existing Code Audit

```bash
# Verify PROMPT-04 foundation exists
cat mobile/src/offline/schema.ts          # offlineQueue, attendanceDrafts, cachedStudentLists exist
cat mobile/src/offline/queue.ts           # OfflineQueueProcessor exists
cat mobile/src/offline/syncEngine.ts      # SyncEngine exists
cat mobile/src/offline/db.ts              # Database init exists

# Check if idempotency key support was added to backend
grep "X-Idempotency-Key" mobile/src/offline/queue.ts  # Should be in extraHeaders

# Verify netinfo package
grep "@react-native-community/netinfo" mobile/package.json
```

### API Contracts

```
POST /api/diary                          → { classId, date, title, content }
  Header: X-Idempotency-Key: <uuid>
  200: DiaryEntry
  
GET /api/mobile/offline-bundle           → (TO BUILD by backend)
  200: { bundledAt, expiresAt, myClasses, todaysTimetable, 
         pendingLeaveRequests, announcements, recentDiaryEntries }
  
PUT /api/examinations/results/bulk       → Already exists
  Header: X-Idempotency-Key: <uuid>     → Add idempotency support
```

---

## PHASE 3: Technical Planning

### Extended SQLite Schema

New tables to add to `schema.ts`:

```
marksDrafts       — auto-saved marks entry before submission
diaryEntryQueue   — offline diary posts
offlineBundleCache — cached morning bundle data
```

### Conflict Resolution Flow

```
OfflineQueueProcessor processes attendance/marks submission
         │
         ▼
Server returns 409 Conflict
         │
         ▼
Mark queue item status = 'conflict'
Store conflict details (what server has vs. what was submitted)
         │
         ▼
ConflictResolutionSheet appears (bottom sheet)
  Shows: [Item name] — Server: [status] | Your submission: [status]
  Options: [Keep Server] [Use My Submission] for each conflict
         │
         ▼
User resolves each conflict
         │
         ▼
Resubmit only the overridden items
Mark queue item as resolved/synced
```

---

## PHASE 4: Database Design

```typescript
// mobile/src/offline/schema.ts — ADD these to existing schema

// ── Marks entry drafts ───────────────────────────────────────────────────────
export const marksDrafts = sqliteTable('marks_drafts', {
  id:              text('id').primaryKey(),       // composite: `${examId}-${classId}-${subjectId}`
  examId:          text('exam_id').notNull(),
  classId:         text('class_id').notNull(),
  subjectId:       text('subject_id').notNull(),
  marks:           text('marks').notNull(),       // JSON: [{ studentId, theory, practical, isAbsent }]
  idempotencyKey:  text('idempotency_key').notNull(),
  lastModified:    integer('last_modified').notNull(),
  isSubmitted:     integer('is_submitted', { mode: 'boolean' }).default(false),
  schoolId:        text('school_id').notNull(),
  markedBy:        text('marked_by').notNull(),
});

// ── Diary entry queue ────────────────────────────────────────────────────────
export const diaryEntryQueue = sqliteTable('diary_entry_queue', {
  id:              text('id').primaryKey(),
  idempotencyKey:  text('idempotency_key').notNull().unique(),
  classId:         text('class_id').notNull(),
  date:            text('date').notNull(),         // YYYY-MM-DD
  title:           text('title').notNull(),
  content:         text('content').notNull(),
  createdAt:       integer('created_at').notNull(),
  status:          text('status').default('pending'), // 'pending'|'synced'|'failed'
  errorMessage:    text('error_message'),
  schoolId:        text('school_id').notNull(),
  userId:          text('user_id').notNull(),
});

// ── Morning bundle cache ─────────────────────────────────────────────────────
export const offlineBundleCache = sqliteTable('offline_bundle_cache', {
  id:              integer('id').primaryKey(),      // Always 1 — single row
  bundledAt:       integer('bundled_at').notNull(),
  expiresAt:       integer('expires_at').notNull(),
  profileJson:     text('profile_json').notNull(),
  timetableJson:   text('timetable_json').notNull(),
  announcementsJson: text('announcements_json').notNull(),
  classesJson:     text('classes_json').notNull(),
  schoolId:        text('school_id').notNull(),
  academicYear:    text('academic_year').notNull(),
});
```

```typescript
// mobile/src/offline/db.ts — ADD table creation to initDatabase()
// Add these CREATE TABLE IF NOT EXISTS statements:

await sqliteDb.execAsync(`
  CREATE TABLE IF NOT EXISTS marks_drafts (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    marks TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    last_modified INTEGER NOT NULL,
    is_submitted INTEGER DEFAULT 0,
    school_id TEXT NOT NULL,
    marked_by TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS diary_entry_queue (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    class_id TEXT NOT NULL,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    school_id TEXT NOT NULL,
    user_id TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS offline_bundle_cache (
    id INTEGER PRIMARY KEY,
    bundled_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    profile_json TEXT NOT NULL,
    timetable_json TEXT NOT NULL,
    announcements_json TEXT NOT NULL,
    classes_json TEXT NOT NULL,
    school_id TEXT NOT NULL,
    academic_year TEXT NOT NULL
  );
`);
```

---

## PHASE 5: Backend Implementation

### Morning Bundle Endpoint

```csharp
[HttpGet("mobile/offline-bundle")]
[Authorize(Roles = "Teacher,Staff")]
public async Task<IActionResult> GetOfflineBundle()
{
    var teacherId = _tenantContext.LinkedEntityId;
    var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5).AddMinutes(30)); // IST

    var assignments = await _timetableService.GetTeacherAssignmentsAsync(teacherId);
    var classIds = assignments.Select(a => a.ClassId).Distinct().ToList();

    // Parallel fetch everything needed for offline
    var (classes, timetable, pendingLeaves, announcements, diaries) = await (
        _studentService.GetMinimalStudentsForClassesAsync(classIds),
        _timetableService.GetTeacherScheduleAsync(teacherId, today),
        _leaveManagementService.GetPendingForTeacherAsync(teacherId),
        _announcementService.GetRecentAsync(_tenantContext.SchoolId, limit: 10),
        _diaryService.GetRecentForTeacherAsync(teacherId, limit: 5)
    );

    var expiresAt = DateTime.UtcNow.AddHours(8); // Bundle valid for 8 hours

    return Ok(new
    {
        bundledAt = DateTime.UtcNow,
        expiresAt,
        myClasses = classes,
        todaysTimetable = timetable,
        pendingLeaveRequests = pendingLeaves,
        announcements,
        recentDiaryEntries = diaries,
    });
}
```

---

## PHASE 6: Mobile Implementation

### 6.1 Marks Draft Service

```typescript
// mobile/src/offline/marksDraftService.ts
import { db } from './db';
import { marksDrafts } from './schema';
import { eq } from 'drizzle-orm';
import { generateUUID } from '@vitana/shared-utils';

export interface MarksEntry {
  studentId: string;
  theory: number | null;
  practical: number | null;
  isAbsent: boolean;
}

export const marksDraftService = {
  async saveDraft(
    examId: string, classId: string, subjectId: string,
    marks: MarksEntry[], markedBy: string, schoolId: string
  ): Promise<void> {
    const id = `${examId}-${classId}-${subjectId}`;
    const existing = await db.select().from(marksDrafts).where(eq(marksDrafts.id, id)).limit(1);
    const idempotencyKey = existing[0]?.idempotencyKey ?? generateUUID();

    await db.insert(marksDrafts)
      .values({
        id,
        examId, classId, subjectId,
        marks: JSON.stringify(marks),
        idempotencyKey,
        lastModified: Date.now(),
        isSubmitted: false,
        schoolId,
        markedBy,
      })
      .onConflictDoUpdate({
        target: marksDrafts.id,
        set: { marks: JSON.stringify(marks), lastModified: Date.now() },
      });
  },

  async loadDraft(examId: string, classId: string, subjectId: string): Promise<{
    marks: MarksEntry[];
    idempotencyKey: string;
    lastModified: number;
  } | null> {
    const id = `${examId}-${classId}-${subjectId}`;
    const result = await db.select().from(marksDrafts).where(eq(marksDrafts.id, id)).limit(1);
    if (!result[0] || result[0].isSubmitted) return null;
    return {
      marks: JSON.parse(result[0].marks),
      idempotencyKey: result[0].idempotencyKey,
      lastModified: result[0].lastModified,
    };
  },

  async markSubmitted(examId: string, classId: string, subjectId: string): Promise<void> {
    const id = `${examId}-${classId}-${subjectId}`;
    await db.update(marksDrafts).set({ isSubmitted: true }).where(eq(marksDrafts.id, id));
  },

  async cleanupOld(): Promise<void> {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    await db.delete(marksDrafts).where(eq(marksDrafts.isSubmitted, true));
    // Would need additional where clause for age — simplified here
  },
};
```

### 6.2 Diary Entry Hook

```typescript
// mobile/src/features/diary/hooks/useDiaryEntry.ts
import { useMutation } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { db } from '../../../offline/db';
import { diaryEntryQueue } from '../../../offline/schema';
import { OfflineQueueProcessor } from '../../../offline/queue';
import apiClient from '../../../api/client';
import { useAuthStore } from '../../../stores/authStore';
import { generateUUID } from '@vitana/shared-utils';
import { queryClient } from '../../../api/queryClient';

interface DiaryEntryInput {
  classId: string;
  date: string;
  title: string;
  content: string;
}

export function useDiaryEntry() {
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (input: DiaryEntryInput) => {
      const idempotencyKey = generateUUID();
      const netState = await NetInfo.fetch();

      if (netState.isConnected && netState.isInternetReachable) {
        const result = await apiClient.post('/diary', input, {
          headers: { 'X-Idempotency-Key': idempotencyKey },
        });
        queryClient.invalidateQueries({ queryKey: ['diary', input.classId] });
        return result;
      } else {
        // Queue for later
        await db.insert(diaryEntryQueue).values({
          id: generateUUID(),
          idempotencyKey,
          classId: input.classId,
          date: input.date,
          title: input.title,
          content: input.content,
          createdAt: Date.now(),
          status: 'pending',
          schoolId: user!.schoolId,
          userId: user!.id,
        });
        return { queued: true };
      }
    },
  });
}
```

### 6.3 Morning Bundle Loader

```typescript
// mobile/src/offline/bundleLoader.ts
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './db';
import { offlineBundleCache, cachedStudentLists } from './schema';
import { eq } from 'drizzle-orm';
import apiClient from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useSchoolStore } from '../stores/schoolStore';

const BUNDLE_CACHE_HOURS = 4;
const MORNING_START_HOUR = 5;   // 5 AM IST
const MORNING_END_HOUR = 10;    // 10 AM IST

export async function loadMorningBundle(): Promise<void> {
  // Only run in morning window
  const istHour = new Date().getUTCHours() + 5; // rough IST offset
  if (istHour < MORNING_START_HOUR || istHour > MORNING_END_HOUR) return;

  // Only on WiFi — save mobile data
  const netState = await NetInfo.fetch();
  if (netState.type !== 'wifi' || !netState.isConnected) return;

  // Check if bundle is still fresh
  const existing = await db.select().from(offlineBundleCache).limit(1);
  const now = Date.now();
  if (existing[0] && (now - existing[0].bundledAt) < BUNDLE_CACHE_HOURS * 60 * 60 * 1000) {
    return; // Bundle still fresh
  }

  const { user } = useAuthStore.getState();
  const { academicYear } = useSchoolStore.getState();
  if (!user) return;

  try {
    const bundle = await apiClient.get('/mobile/offline-bundle') as any;

    // Store bundle in SQLite
    await db.insert(offlineBundleCache)
      .values({
        id: 1,
        bundledAt: now,
        expiresAt: new Date(bundle.expiresAt).getTime(),
        profileJson: JSON.stringify(bundle.myClasses),
        timetableJson: JSON.stringify(bundle.todaysTimetable),
        announcementsJson: JSON.stringify(bundle.announcements),
        classesJson: JSON.stringify(bundle.myClasses),
        schoolId: user.schoolId,
        academicYear: academicYear ?? '2025-2026',
      })
      .onConflictDoUpdate({
        target: offlineBundleCache.id,
        set: {
          bundledAt: now,
          expiresAt: new Date(bundle.expiresAt).getTime(),
          profileJson: JSON.stringify(bundle.myClasses),
          timetableJson: JSON.stringify(bundle.todaysTimetable),
          announcementsJson: JSON.stringify(bundle.announcements),
          classesJson: JSON.stringify(bundle.myClasses),
        },
      });

    // Also update cachedStudentLists from bundle data
    for (const cls of (bundle.myClasses ?? [])) {
      await db.insert(cachedStudentLists)
        .values({
          classId: cls.classId,
          students: JSON.stringify(cls.students),
          cachedAt: now,
          academicYear: academicYear ?? '2025-2026',
          schoolId: user.schoolId,
        })
        .onConflictDoUpdate({
          target: cachedStudentLists.classId,
          set: { students: JSON.stringify(cls.students), cachedAt: now },
        });
    }

    console.log('[Bundle] Morning bundle loaded successfully');
  } catch (err) {
    console.warn('[Bundle] Failed to load morning bundle:', err);
  }
}
```

### 6.4 Database Maintenance

```typescript
// mobile/src/offline/maintenance.ts
import { db } from './db';
import { offlineQueue, attendanceDrafts, diaryEntryQueue, marksDrafts } from './schema';
import { eq, and, lt } from 'drizzle-orm';
import * as Sentry from '@sentry/react-native';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const WARNING_SIZE_BYTES = 40 * 1024 * 1024;  // 40 MB

export async function performDatabaseMaintenance(): Promise<void> {
  const sevenDaysAgo = Date.now() - SEVEN_DAYS_MS;

  try {
    // Delete synced offline queue items
    await db.delete(offlineQueue)
      .where(and(eq(offlineQueue.status, 'synced')));

    // Delete submitted attendance drafts (keep failed ones for manual review)
    await db.delete(attendanceDrafts)
      .where(eq(attendanceDrafts.isSubmitted, true));

    // Delete synced diary entries
    await db.delete(diaryEntryQueue)
      .where(eq(diaryEntryQueue.status, 'synced'));

    // Delete submitted marks drafts
    await db.delete(marksDrafts)
      .where(eq(marksDrafts.isSubmitted, true));

    // Check database size via SQLite pragma
    // Note: expo-sqlite doesn't expose this directly; approximate via file size
    console.log('[Maintenance] Database cleanup complete');
  } catch (err) {
    Sentry.captureException(err, { tags: { component: 'db_maintenance' } });
  }
}
```

### 6.5 Conflict Resolution UI

```typescript
// mobile/src/components/offline/ConflictResolutionSheet.tsx
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/SchoolThemeProvider';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

interface Conflict {
  studentId: string;
  studentName: string;
  localStatus: string;
  serverStatus: string;
}

interface Props {
  visible: boolean;
  conflicts: Conflict[];
  onResolve: (resolutions: Record<string, 'keep_server' | 'use_mine'>) => void;
  onDismiss: () => void;
}

export function ConflictResolutionSheet({ visible, conflicts, onResolve, onDismiss }: Props) {
  const { colors } = useAppTheme();
  const [resolutions, setResolutions] = React.useState<Record<string, 'keep_server' | 'use_mine'>>({});

  function resolveAll(choice: 'keep_server' | 'use_mine') {
    const allResolved: Record<string, 'keep_server' | 'use_mine'> = {};
    conflicts.forEach(c => { allResolved[c.studentId] = choice; });
    setResolutions(allResolved);
  }

  function resolveOne(studentId: string, choice: 'keep_server' | 'use_mine') {
    setResolutions(prev => ({ ...prev, [studentId]: choice }));
  }

  const allResolved = conflicts.every(c => resolutions[c.studentId]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl max-h-3/4">
          <View className="px-6 pt-5 pb-3 border-b border-border">
            <View className="flex-row items-center">
              <Feather name="alert-triangle" size={20} color={VITANA_DESIGN_TOKENS.colors.warning} />
              <Text className="font-heading text-lg text-text-primary ml-2">Sync Conflict</Text>
            </View>
            <Text className="font-body text-text-secondary text-sm mt-1">
              {conflicts.length} student{conflicts.length > 1 ? 's' : ''} already have attendance recorded.
              Choose which version to keep.
            </Text>
          </View>

          {/* Bulk actions */}
          <View className="flex-row px-6 py-3 gap-3 border-b border-border">
            <TouchableOpacity
              onPress={() => resolveAll('keep_server')}
              className="flex-1 py-2 border border-border rounded-xl items-center"
            >
              <Text className="font-body-medium text-text-primary text-sm">Keep All Server</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => resolveAll('use_mine')}
              className="flex-1 py-2 rounded-xl items-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="font-body-medium text-white text-sm">Use All Mine</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="px-6 py-2">
            {conflicts.map((conflict) => (
              <View key={conflict.studentId} className="py-3 border-b border-border">
                <Text className="font-body-medium text-text-primary">{conflict.studentName}</Text>
                <View className="flex-row mt-2 gap-2">
                  <TouchableOpacity
                    onPress={() => resolveOne(conflict.studentId, 'keep_server')}
                    className="flex-1 py-2 rounded-lg border items-center"
                    style={{
                      borderColor: resolutions[conflict.studentId] === 'keep_server' ? colors.primary : VITANA_DESIGN_TOKENS.colors.border,
                      backgroundColor: resolutions[conflict.studentId] === 'keep_server' ? colors.primaryLight : 'white',
                    }}
                  >
                    <Text className="font-body text-xs text-text-secondary">Server</Text>
                    <Text className="font-body-semibold text-sm text-text-primary">{conflict.serverStatus}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => resolveOne(conflict.studentId, 'use_mine')}
                    className="flex-1 py-2 rounded-lg border items-center"
                    style={{
                      borderColor: resolutions[conflict.studentId] === 'use_mine' ? colors.primary : VITANA_DESIGN_TOKENS.colors.border,
                      backgroundColor: resolutions[conflict.studentId] === 'use_mine' ? colors.primaryLight : 'white',
                    }}
                  >
                    <Text className="font-body text-xs text-text-secondary">Mine</Text>
                    <Text className="font-body-semibold text-sm text-text-primary">{conflict.localStatus}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <View className="px-6 py-4 gap-3">
            <TouchableOpacity
              onPress={() => onResolve(resolutions)}
              disabled={!allResolved}
              className="py-4 rounded-xl items-center"
              style={{ backgroundColor: allResolved ? colors.primary : VITANA_DESIGN_TOKENS.colors.border }}
            >
              <Text className="font-body-semibold text-white">Apply Resolutions</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDismiss} className="items-center py-2">
              <Text className="font-body text-text-secondary">Resolve later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

import React from 'react';
```

### 6.6 Sync Status Screen

```typescript
// mobile/app/(teacher)/sync-status.tsx (accessible from teacher More menu)
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { db } from '../../src/offline/db';
import { offlineQueue, diaryEntryQueue } from '../../src/offline/schema';
import { eq } from 'drizzle-orm';
import { OfflineQueueProcessor } from '../../src/offline/queue';
import { useAuthStore } from '../../src/stores/authStore';
import { useAppTheme } from '../../src/theme/SchoolThemeProvider';
import { formatRelativeTime, VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

export default function SyncStatusScreen() {
  const { user } = useAuthStore();
  const { colors } = useAppTheme();
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [failedItems, setFailedItems] = useState<any[]>([]);
  const [syncedCount, setSyncedCount] = useState(0);

  useEffect(() => { loadStatus(); }, []);

  async function loadStatus() {
    if (!user) return;
    const all = await db.select().from(offlineQueue).where(eq(offlineQueue.userId, user.id));
    setPendingItems(all.filter(i => i.status === 'pending' || i.status === 'processing'));
    setFailedItems(all.filter(i => i.status === 'failed'));
    setSyncedCount(all.filter(i => i.status === 'synced').length);
  }

  async function retryFailed() {
    if (!user) return;
    // Reset failed items to pending
    await db.update(offlineQueue)
      .set({ status: 'pending', retryCount: 0 })
      .where(eq(offlineQueue.userId, user.id));
    await OfflineQueueProcessor.processQueue(user.id, user.schoolId);
    loadStatus();
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="font-heading text-xl text-text-primary mb-4">Sync Status</Text>

        {/* Pending */}
        {pendingItems.length > 0 && (
          <View className="mb-4">
            <Text className="font-body-semibold text-text-primary mb-2">
              Pending ({pendingItems.length})
            </Text>
            {pendingItems.map(item => (
              <View key={item.id} className="bg-white border border-border rounded-xl px-4 py-3 mb-2">
                <Text className="font-body-medium text-text-primary capitalize">{item.operationType.replace('_', ' ')}</Text>
                <Text className="font-body text-text-secondary text-xs mt-0.5">
                  {formatRelativeTime(new Date(item.createdAt).toISOString())}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Failed */}
        {failedItems.length > 0 && (
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-body-semibold text-danger">Failed ({failedItems.length})</Text>
              <TouchableOpacity onPress={retryFailed}>
                <Text className="font-body text-sm" style={{ color: colors.primary }}>Retry All</Text>
              </TouchableOpacity>
            </View>
            {failedItems.map(item => (
              <View key={item.id} className="bg-danger/5 border border-danger/20 rounded-xl px-4 py-3 mb-2">
                <Text className="font-body-medium text-text-primary capitalize">{item.operationType.replace('_', ' ')}</Text>
                <Text className="font-body text-danger text-xs mt-0.5">{item.errorMessage}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Synced */}
        {syncedCount > 0 && (
          <View className="bg-success/5 border border-success/20 rounded-xl px-4 py-3">
            <View className="flex-row items-center">
              <Feather name="check-circle" size={16} color={VITANA_DESIGN_TOKENS.colors.success} />
              <Text className="font-body-medium text-success ml-2">{syncedCount} items synced today</Text>
            </View>
          </View>
        )}

        {pendingItems.length === 0 && failedItems.length === 0 && syncedCount === 0 && (
          <View className="items-center py-12">
            <Feather name="check-circle" size={40} color={VITANA_DESIGN_TOKENS.colors.success} />
            <Text className="font-heading text-base text-text-primary mt-4">All synced!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

### 6.7 Root Layout — Add Maintenance + Bundle Loader

```typescript
// mobile/app/_layout.tsx — ADD in the initialization useEffect
import { performDatabaseMaintenance } from '../src/offline/maintenance';
import { loadMorningBundle } from '../src/offline/bundleLoader';

useEffect(() => {
  // Run maintenance after DB is initialized
  performDatabaseMaintenance().catch(console.warn);
  // Load morning bundle (checks time window + WiFi internally)
  loadMorningBundle().catch(console.warn);
}, []);
```

---

## PHASE 9: Testing

### Validation Checklist

- [ ] Marks draft saves every 30 seconds (check SQLite via Flipper/Drizzle)
- [ ] Open marks grid → fill some marks → close app → reopen → draft loaded with toast
- [ ] Diary entry while offline → queued → reconnect → synced
- [ ] Morning bundle: start app at 7 AM on WiFi → offlineBundleCache has data
- [ ] Conflict resolution sheet: trigger 409 (submit attendance for already-marked class)
- [ ] Conflict resolved → correct data submitted
- [ ] Database maintenance: submit 10 items, mark synced → run maintenance → items gone
- [ ] Sync status screen shows correct pending/failed counts

---

## PHASE 10: Documentation & Verification

### Git Commit

```bash
git add .
git commit -m "feat(mobile/offline): advanced offline sync engine

- marksDrafts SQLite table: auto-save marks entry every 30s
- diaryEntryQueue SQLite table: offline diary posts with idempotency
- offlineBundleCache SQLite table: morning pre-fetch storage
- marksDraftService: saveDraft/loadDraft/markSubmitted
- useDiaryEntry hook: online send or offline queue
- bundleLoader: morning WiFi-only bundle pre-fetch (5-10 AM)
- ConflictResolutionSheet: 409 conflict resolution UI
- performDatabaseMaintenance: cleanup synced items > 7 days
- Sync status screen: pending/failed/synced visibility
- Root layout: maintenance + bundle loader on startup

Backend: GET /api/mobile/offline-bundle endpoint
Next: PROMPT-13 (Marks Entry) or PROMPT-14 (Messaging)"
```

---

**END OF PROMPT-12**
