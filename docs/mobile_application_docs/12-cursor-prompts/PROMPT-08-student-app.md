# PROMPT-08: Student Portal — Core

> **Version**: 2.0 — Full 10-Phase Anatomy  
> **Epic**: EP-05 — Student Portal  
> **Sprint**: 9 (Weeks 17–18)  
> **Story Points**: 27  
> **Prerequisites**: PROMPT-01 ✓, PROMPT-02 ✓  
> **Runs in parallel with**: PROMPT-04 (Teacher Portal) — different engineer  
> **Backend Dependency**: `GET /api/mobile/student-dashboard` (PROMPT-11C)

---

## PHASE 1: Context & Scope

> **ONE APP — STUDENT PORTAL:** This prompt builds the `(student)` route group inside the single Vitana SMS app binary. It is **not** a separate app. Users with role `Student` are routed here after login. The same `com.vitana.sms` binary serves parents, teachers, students, and admins.

### What We're Building

The complete Student Portal — a mobile-first experience that gives students ownership of their academic journey. Students are high-volume daily users (timetable, assignments, results) on low-end Android devices. Performance is critical.

**Capabilities:**
- Student dashboard (aggregated view)
- Timetable (daily + weekly, offline-cached in SQLite)
- Monthly attendance calendar
- Published exam results + report card PDF
- Assignment list (pending/submitted/graded)
- Assignment text submission (offline-queued)
- Assignment file submission (photo/document)
- Fee summary (read-only)
- Leave application
- Library issued books
- Notification center

### Current State

- ✅ Auth, navigation skeleton exists
- ✅ `/(student)/_layout.tsx` tab navigator placeholder
- ✅ SQLite offline infrastructure from PROMPT-04
- ✅ OfflineQueueProcessor exists
- ❌ All student screens empty

### Success Criteria

- [ ] Student dashboard loads < 2s on mid-range Android
- [ ] Timetable available offline (airplane mode test)
- [ ] Weekly timetable view with Mon–Fri navigation
- [ ] Current period highlighted in today's view
- [ ] Assignment list sorted by due date (soonest first), overdue in red
- [ ] Text assignment submission queued offline and syncs on reconnect
- [ ] Graded submissions show marks + feedback
- [ ] File upload validates size (< 10 MB) before attempting upload
- [ ] Attendance calendar same design as parent view (reuse component)
- [ ] Leave application works offline (queued)
- [ ] All FlashList for lists — no FlatList/map/ScrollView for data lists

---

## PHASE 2: Analysis Phase

### Read First

```bash
docs/mobile_application_docs/epics/EP-05-student-app.md
docs/mobile_application_docs/13-feature-inventory.md  # Section 4 (Student features)
```

### Existing Code Audit

```bash
# Verify reusable components from PROMPT-03 exist
ls mobile/src/components/common/
# Should have: AttendanceBadge.tsx, SkeletonLoader.tsx, EmptyState.tsx

# Verify offline infrastructure from PROMPT-04 exists
ls mobile/src/offline/
# Should have: db.ts, schema.ts, queue.ts, syncEngine.ts

# Check existing cachedTimetable table in schema
grep "cachedTimetable" mobile/src/offline/schema.ts
```

### API Contracts

```
GET /api/mobile/student-dashboard   → aggregated (backend: PROMPT-11C)
GET /api/students/me                → own profile
GET /api/timetable?classId=X        → TimetableEntry[] (student uses their class timetable)
GET /api/attendance/my-attendance?month=M&year=Y → MonthlyAttendance
GET /api/examinations/results?studentId=me → ExamResult[]
GET /api/examinations/report-cards/{studentId} → ReportCard
GET /api/assignments?studentId=me   → Assignment[]
POST /api/assignments/{id}/submissions → form-data (file) or JSON (text)
GET /api/assignments/{id}           → Assignment with submission status
GET /api/fees/records?studentId=me  → FeeRecord (read-only)
POST /api/attendance/leave-requests → LeaveRequest
GET /api/attendance/leave-requests?studentId=me → LeaveRequest[]
GET /api/library/my-issues          → IssuedBook[]
```

---

## PHASE 3: Technical Planning

### Screen Map

```
mobile/app/(student)/
├── _layout.tsx                ← Tab: Home | Schedule | Results | Assignments | More
├── index.tsx                  ← Student Dashboard
├── timetable/
│   └── index.tsx              ← Today's schedule + weekly view tabs
├── results/
│   ├── index.tsx              ← Exam list
│   └── [examId].tsx           ← Subject-wise marks
├── assignments/
│   ├── index.tsx              ← Assignment list (Pending/Submitted/Graded tabs)
│   ├── [id]/
│   │   ├── index.tsx          ← Assignment detail
│   │   └── submit.tsx         ← Submission form (text + file)
├── fees/
│   └── index.tsx              ← Fee summary (read-only)
└── more.tsx                   ← More menu
```

### Assignment State Machine

```
Pending → [submit] → Submitted → [teacher grades] → Graded
Pending → [past due date] → Late (can still submit, shows warning)
Submitted → [teacher requests revision] → Revision Requested
```

---

## PHASE 4: Database Design

> SQLite schema already exists from PROMPT-04.  
> Add timetable cache table to schema.ts (already defined as `cachedTimetable`).

---

## PHASE 5: Backend Implementation

### Student Dashboard Aggregation

```csharp
// GET /api/mobile/student-dashboard
[HttpGet("student-dashboard")]
[Authorize(Roles = "Student")]
public async Task<IActionResult> GetStudentDashboard()
{
    var studentId = _tenantContext.LinkedEntityId;
    var today = DateOnly.FromDateTime(DateTime.UtcNow);

    var (profile, timetable, attendance, latestResult, dueSoonAssignments) =
        await (
            _studentService.GetMinimalProfileAsync(studentId),
            _timetableService.GetTodayScheduleAsync(studentId, today),
            _attendanceService.GetMonthSummaryAsync(studentId, today.Month, today.Year),
            _examinationService.GetLatestPublishedResultAsync(studentId),
            _assignmentService.GetDueSoonForStudentAsync(studentId, 7) // next 7 days
        );

    return Ok(new {
        profile,
        todaySchedule = timetable,
        attendanceThisMonth = attendance,
        latestResult,
        dueSoonAssignments,
        unreadNotificationCount = await _notificationService.GetUnreadCountAsync(_userId)
    });
}
```

---

## PHASE 6: Mobile Implementation

### 6.1 Student API Layer

```typescript
// mobile/src/api/endpoints/student.ts
import apiClient from '../client';

export const studentApi = {
  getDashboard: () => apiClient.get('/mobile/student-dashboard'),
  getMyProfile: () => apiClient.get('/students/me'),
  getTimetable: (classId: string) => apiClient.get('/timetable', { params: { classId } }),
  getMyAttendance: (month: number, year: number) =>
    apiClient.get('/attendance/my-attendance', { params: { month, year } }),
  getMyResults: () => apiClient.get('/examinations/results', { params: { studentId: 'me' } }),
  getReportCard: (studentId: string) => apiClient.get(`/examinations/report-cards/${studentId}`),
  getMyAssignments: () => apiClient.get('/assignments', { params: { studentId: 'me' } }),
  getAssignment: (id: string) => apiClient.get(`/assignments/${id}`),
  submitTextAssignment: (id: string, text: string) =>
    apiClient.post(`/assignments/${id}/submissions`, { content: text, type: 'text' }),
  submitFileAssignment: async (id: string, fileUri: string, fileName: string, mimeType: string) => {
    const formData = new FormData();
    formData.append('file', { uri: fileUri, name: fileName, type: mimeType } as any);
    formData.append('type', 'file');
    return apiClient.post(`/assignments/${id}/submissions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getMyFees: () => apiClient.get('/fees/records', { params: { studentId: 'me' } }),
  applyLeave: (data: { fromDate: string; toDate: string; reason: string }) =>
    apiClient.post('/attendance/leave-requests', data),
  getMyLeaveRequests: () =>
    apiClient.get('/attendance/leave-requests', { params: { studentId: 'me' } }),
  getLibraryIssues: () => apiClient.get('/library/my-issues'),
};
```

### 6.2 Student Dashboard

```typescript
// mobile/app/(student)/index.tsx
import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { studentApi } from '../../src/api/endpoints/student';
import { useAuthStore } from '../../src/stores/authStore';
import { useAppTheme } from '../../src/theme/SchoolThemeProvider';
import { AttendanceBadge } from '../../src/components/common/AttendanceBadge';
import { SkeletonLoader } from '../../src/components/common/SkeletonLoader';
import { formatDateIST, VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const { colors, schoolName, logoUrl } = useAppTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: studentApi.getDashboard,
    staleTime: 5 * 60 * 1000,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const dueSoonCount = data?.dueSoonAssignments?.length ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-2 pb-3 flex-row items-center justify-between" style={{ backgroundColor: colors.primary }}>
        <Text className="text-white font-heading text-base">{schoolName}</Text>
        <TouchableOpacity onPress={() => router.push('/(student)/notifications/')} className="relative">
          <Feather name="bell" size={22} color="white" />
          {data?.unreadNotificationCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-danger rounded-full w-4 h-4 items-center justify-center">
              <Text className="text-white text-xs font-body-bold">
                {data.unreadNotificationCount > 9 ? '9+' : data.unreadNotificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="px-4 pt-4 pb-8">
          <Text className="font-body text-text-secondary">{greeting},</Text>
          <Text className="font-heading text-xl text-text-primary">{user?.fullName?.split(' ')[0]}</Text>

          {/* Today's Timetable */}
          <View className="mt-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-body-semibold text-text-primary">Today's Schedule</Text>
              <TouchableOpacity onPress={() => router.push('/(student)/timetable/')}>
                <Text className="font-body text-sm" style={{ color: colors.primary }}>View all</Text>
              </TouchableOpacity>
            </View>
            {isLoading ? (
              <View className="space-y-2">
                <SkeletonLoader height={52} borderRadius={12} />
                <SkeletonLoader height={52} borderRadius={12} />
              </View>
            ) : data?.todaySchedule?.length > 0 ? (
              data.todaySchedule.slice(0, 3).map((period: any, i: number) => (
                <View
                  key={i}
                  className="bg-white border border-border rounded-xl px-4 py-3 mb-2 flex-row items-center"
                >
                  <View className="w-14 items-center mr-3">
                    <Text className="font-body text-xs text-text-secondary">{period.startTime}</Text>
                    <Text className="font-body text-xs text-text-secondary">{period.endTime}</Text>
                  </View>
                  <View className="w-1 h-8 rounded-full mr-3" style={{ backgroundColor: colors.primary }} />
                  <View className="flex-1">
                    <Text className="font-body-medium text-text-primary text-sm">{period.subjectName}</Text>
                    <Text className="font-body text-text-secondary text-xs">{period.teacherName}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View className="bg-surface rounded-xl p-4 items-center">
                <Text className="font-body text-text-secondary text-sm">No classes today</Text>
              </View>
            )}
          </View>

          {/* Assignments Due */}
          {dueSoonCount > 0 && (
            <TouchableOpacity
              className="mt-4 bg-warning/10 border border-warning/30 rounded-xl p-4 flex-row items-center justify-between"
              onPress={() => router.push('/(student)/assignments/')}
            >
              <View className="flex-row items-center">
                <Feather name="book-open" size={20} color={VITANA_DESIGN_TOKENS.colors.warning} />
                <View className="ml-3">
                  <Text className="font-body-semibold text-text-primary">
                    {dueSoonCount} assignment{dueSoonCount > 1 ? 's' : ''} due soon
                  </Text>
                  <Text className="font-body text-text-secondary text-xs">Tap to view and submit</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={VITANA_DESIGN_TOKENS.colors.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Attendance */}
          <TouchableOpacity
            className="mt-4 bg-white border border-border rounded-xl p-4 flex-row items-center justify-between"
            onPress={() => router.push('/(student)/attendance/')}
          >
            <View>
              <Text className="font-body text-text-secondary text-xs uppercase tracking-wide">This Month</Text>
              <Text className="font-body-medium text-text-primary mt-0.5">Attendance</Text>
            </View>
            <View className="flex-row items-center">
              {data?.attendanceThisMonth && (
                <AttendanceBadge percentage={data.attendanceThisMonth.attendancePercent} size="sm" />
              )}
              <Feather name="chevron-right" size={18} color={VITANA_DESIGN_TOKENS.colors.textSecondary} className="ml-2" />
            </View>
          </TouchableOpacity>

          {/* Latest Result */}
          {data?.latestResult && (
            <TouchableOpacity
              className="mt-3 bg-white border border-border rounded-xl p-4 flex-row items-center justify-between"
              onPress={() => router.push('/(student)/results/')}
            >
              <View>
                <Text className="font-body text-text-secondary text-xs uppercase tracking-wide">Latest Result</Text>
                <Text className="font-body-medium text-text-primary mt-0.5">{data.latestResult.examName}</Text>
                <Text className="font-body text-text-secondary text-sm">
                  {data.latestResult.percentage.toFixed(1)}% · Grade {data.latestResult.grade}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={VITANA_DESIGN_TOKENS.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

### 6.3 Timetable Screen

```typescript
// mobile/app/(student)/timetable/index.tsx
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { eq } from 'drizzle-orm';
import { studentApi } from '../../../src/api/endpoints/student';
import { db } from '../../../src/offline/db';
import { cachedTimetable } from '../../../src/offline/schema';
import { useAuthStore } from '../../../src/stores/authStore';
import { useSchoolStore } from '../../../src/stores/schoolStore';
import { useAppTheme } from '../../../src/theme/SchoolThemeProvider';
import NetInfo from '@react-native-community/netinfo';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function StudentTimetable() {
  const { user } = useAuthStore();
  const { academicYear } = useSchoolStore();
  const { colors } = useAppTheme();
  const [activeDay, setActiveDay] = useState(Math.min(new Date().getDay() - 1, 4)); // 0=Mon
  const [timetableData, setTimetableData] = useState<any>(null);

  useEffect(() => {
    loadTimetable();
  }, []);

  async function loadTimetable() {
    try {
      const netState = await NetInfo.fetch();
      if (netState.isConnected && netState.isInternetReachable) {
        // Get classId from profile
        const profile = await studentApi.getMyProfile();
        const data = await studentApi.getTimetable(profile.classId);
        setTimetableData(data);
        // Cache
        await db.insert(cachedTimetable)
          .values({
            teacherId: user!.id, // reuse teacherId column as studentId
            timetable: JSON.stringify(data),
            cachedAt: Date.now(),
            academicYear: academicYear ?? '2025-2026',
            schoolId: user!.schoolId,
          })
          .onConflictDoUpdate({ target: cachedTimetable.teacherId, set: {
            timetable: JSON.stringify(data), cachedAt: Date.now(),
          }});
      } else {
        const cached = await db.select().from(cachedTimetable).where(eq(cachedTimetable.teacherId, user!.id)).limit(1);
        if (cached[0]) setTimetableData(JSON.parse(cached[0].timetable));
      }
    } catch (err) {
      console.error('[Timetable] Load error:', err);
    }
  }

  const todayPeriods = timetableData?.filter((p: any) => p.dayOfWeek === activeDay + 1) ?? [];
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Day Selector */}
      <View className="flex-row px-4 pt-4 pb-2 gap-2">
        {DAYS.map((day, i) => {
          const isToday = i === Math.min(new Date().getDay() - 1, 4);
          const isActive = i === activeDay;
          return (
            <TouchableOpacity
              key={day}
              onPress={() => setActiveDay(i)}
              className="flex-1 py-2 rounded-xl items-center"
              style={{
                backgroundColor: isActive ? colors.primary : isToday ? colors.primaryLight : VITANA_DESIGN_TOKENS.colors.surface,
              }}
            >
              <Text
                className="font-body-semibold text-sm"
                style={{ color: isActive ? 'white' : isToday ? colors.primary : VITANA_DESIGN_TOKENS.colors.textSecondary }}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Periods */}
      <ScrollView className="flex-1 px-4 pt-2">
        {todayPeriods.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Text className="font-heading text-lg text-text-primary">No classes</Text>
            <Text className="font-body text-text-secondary mt-1">{DAYS[activeDay]}</Text>
          </View>
        ) : (
          todayPeriods.map((period: any, i: number) => {
            const [startH, startM] = period.startTime.split(':').map(Number);
            const [endH, endM] = period.endTime.split(':').map(Number);
            const startMin = startH * 60 + startM;
            const endMin = endH * 60 + endM;
            const isCurrentPeriod = activeDay === Math.min(new Date().getDay() - 1, 4) &&
              currentTime >= startMin && currentTime <= endMin;

            return (
              <View
                key={i}
                className="bg-white border rounded-xl px-4 py-3 mb-3 flex-row items-center"
                style={{ borderColor: isCurrentPeriod ? colors.primary : VITANA_DESIGN_TOKENS.colors.border, borderWidth: isCurrentPeriod ? 2 : 1 }}
              >
                <View className="w-16">
                  <Text className="font-body text-xs text-text-secondary">{period.startTime}</Text>
                  <Text className="font-body text-xs text-text-secondary">{period.endTime}</Text>
                </View>
                <View className="w-1 h-10 rounded-full mx-3" style={{ backgroundColor: isCurrentPeriod ? colors.primary : colors.primaryLight }} />
                <View className="flex-1">
                  <Text className="font-body-semibold text-text-primary">{period.subjectName}</Text>
                  <Text className="font-body text-text-secondary text-xs">{period.teacherName} · {period.room}</Text>
                </View>
                {isCurrentPeriod && (
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.primaryLight }}>
                    <Text className="font-body text-xs" style={{ color: colors.primary }}>Now</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

### 6.4 Assignment List

```typescript
// mobile/app/(student)/assignments/index.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { studentApi } from '../../../src/api/endpoints/student';
import { useAppTheme } from '../../../src/theme/SchoolThemeProvider';
import { EmptyState } from '../../../src/components/common/EmptyState';
import { formatDateIST, formatRelativeTime, VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

type Tab = 'pending' | 'submitted' | 'graded';

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  Pending:   { label: 'Pending',   color: '#d97706', bg: '#fef3c7' },
  Late:      { label: 'Overdue',   color: '#ef4444', bg: '#fee2e2' },
  Submitted: { label: 'Submitted', color: '#2563eb', bg: '#dbeafe' },
  Graded:    { label: 'Graded',    color: '#16a34a', bg: '#dcfce7' },
  RevisionRequested: { label: 'Revision', color: '#7c3aed', bg: '#ede9fe' },
};

export default function StudentAssignments() {
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const { colors } = useAppTheme();

  const { data: assignments, isLoading, refetch } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: studentApi.getMyAssignments,
    staleTime: 5 * 60 * 1000,
  });

  const now = new Date();
  const filtered = (assignments ?? []).filter((a: any) => {
    const status = a.mySubmission?.status ?? 'Pending';
    const isPastDue = new Date(a.dueDate) < now;
    const effectiveStatus = status === 'Pending' && isPastDue ? 'Late' : status;
    if (activeTab === 'pending') return ['Pending', 'Late'].includes(effectiveStatus);
    if (activeTab === 'submitted') return effectiveStatus === 'Submitted';
    return effectiveStatus === 'Graded';
  });

  // Sort pending by due date (soonest first)
  if (activeTab === 'pending') {
    filtered.sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-2">
        <Text className="font-heading text-xl text-text-primary mb-3">Assignments</Text>
        {/* Tab Bar */}
        <View className="flex-row bg-surface rounded-xl p-1">
          {(['pending', 'submitted', 'graded'] as Tab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className="flex-1 py-2 rounded-lg items-center"
              style={{ backgroundColor: activeTab === tab ? colors.primary : 'transparent' }}
            >
              <Text
                className="font-body-medium text-sm capitalize"
                style={{ color: activeTab === tab ? 'white' : VITANA_DESIGN_TOKENS.colors.textSecondary }}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? null : filtered.length === 0 ? (
        <EmptyState icon="book-open" title={`No ${activeTab} assignments`} />
      ) : (
        <FlashList
          data={filtered}
          estimatedItemSize={88}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => {
            const isPastDue = new Date(item.dueDate) < now;
            const status = item.mySubmission?.status ?? (isPastDue ? 'Late' : 'Pending');
            const badge = STATUS_BADGE[status] ?? STATUS_BADGE.Pending;

            return (
              <TouchableOpacity
                className="bg-white border-b border-border px-4 py-4"
                onPress={() => router.push(`/(student)/assignments/${item.id}/`)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="font-body-semibold text-text-primary">{item.title}</Text>
                    <Text className="font-body text-text-secondary text-sm mt-0.5">{item.subjectName}</Text>
                    <View className="flex-row items-center mt-1.5">
                      <Feather
                        name="clock"
                        size={12}
                        color={isPastDue && status === 'Late' ? VITANA_DESIGN_TOKENS.colors.danger : VITANA_DESIGN_TOKENS.colors.textSecondary}
                      />
                      <Text
                        className="font-body text-xs ml-1"
                        style={{ color: isPastDue && status === 'Late' ? VITANA_DESIGN_TOKENS.colors.danger : VITANA_DESIGN_TOKENS.colors.textSecondary }}
                      >
                        Due {formatDateIST(item.dueDate)}
                        {status === 'Graded' && item.mySubmission?.grade
                          ? ` · ${item.mySubmission.marksObtained}/${item.maxMarks}`
                          : ''
                        }
                      </Text>
                    </View>
                  </View>
                  <View className="px-2.5 py-1 rounded-full border" style={{ backgroundColor: badge.bg, borderColor: badge.color }}>
                    <Text className="font-body text-xs font-semibold" style={{ color: badge.color }}>{badge.label}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
```

### 6.5 Assignment Submission Screen

```typescript
// mobile/app/(student)/assignments/[id]/submit.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import { useMutation } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { studentApi } from '../../../../src/api/endpoints/student';
import { useAppTheme } from '../../../../src/theme/SchoolThemeProvider';
import { queryClient } from '../../../../src/api/queryClient';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';
import { OfflineQueueProcessor } from '../../../../src/offline/queue';
import { useAuthStore } from '../../../../src/stores/authStore';

const MAX_FILE_SIZE_MB = 10;

export default function SubmitAssignment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const { user } = useAuthStore();
  const [submissionType, setSubmissionType] = useState<'text' | 'file'>('text');
  const [textContent, setTextContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType: string; size: number } | null>(null);

  const textMutation = useMutation({
    mutationFn: async (content: string) => {
      const isConnected = (await NetInfo.fetch()).isConnected;
      if (isConnected) {
        return studentApi.submitTextAssignment(id!, content);
      } else {
        await OfflineQueueProcessor.enqueue({
          method: 'POST',
          endpoint: `/assignments/${id}/submissions`,
          body: { content, type: 'text' },
          operationType: 'assignment_submission',
          userId: user!.id,
          schoolId: user!.schoolId,
        });
        return { queued: true };
      }
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      const msg = result?.queued
        ? 'Submission saved offline. Will be sent when you reconnect.'
        : 'Assignment submitted successfully!';
      Alert.alert('', msg, [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: () => Alert.alert('Error', 'Failed to submit. Please try again.'),
  });

  const fileMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('No file selected');
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        Alert.alert('Offline', 'File submissions require an internet connection.');
        throw new Error('Offline');
      }
      return studentApi.submitFileAssignment(id!, selectedFile.uri, selectedFile.name, selectedFile.mimeType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      Alert.alert('Success', 'File submitted!', [{ text: 'OK', onPress: () => router.back() }]);
    },
  });

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      const file = result.assets[0];
      if (file.size && file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        Alert.alert('File too large', `Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
        return;
      }
      setSelectedFile({ uri: file.uri, name: file.name, mimeType: file.mimeType ?? 'application/octet-stream', size: file.size ?? 0 });
    }
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({ uri: asset.uri, name: `submission_${Date.now()}.jpg`, mimeType: 'image/jpeg', size: 0 });
    }
  }

  const isSubmitting = textMutation.isPending || fileMutation.isPending;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-4">
        <Text className="font-heading text-xl text-text-primary mb-4">Submit Assignment</Text>

        {/* Type Toggle */}
        <View className="flex-row bg-surface rounded-xl p-1 mb-4">
          {(['text', 'file'] as const).map(type => (
            <TouchableOpacity
              key={type}
              onPress={() => setSubmissionType(type)}
              className="flex-1 py-2.5 rounded-lg items-center"
              style={{ backgroundColor: submissionType === type ? colors.primary : 'transparent' }}
            >
              <Text
                className="font-body-medium capitalize"
                style={{ color: submissionType === type ? 'white' : VITANA_DESIGN_TOKENS.colors.textSecondary }}
              >
                {type === 'text' ? '✍️ Write' : '📎 Upload File'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {submissionType === 'text' ? (
          <View>
            <TextInput
              value={textContent}
              onChangeText={setTextContent}
              multiline
              numberOfLines={8}
              placeholder="Write your answer here..."
              placeholderTextColor={VITANA_DESIGN_TOKENS.colors.textSecondary}
              textAlignVertical="top"
              maxLength={5000}
              className="border border-border rounded-xl px-4 py-3 font-body text-text-primary bg-surface h-48"
            />
            <Text className="font-body text-text-secondary text-xs mt-1 text-right">
              {textContent.length}/5000
            </Text>
            <TouchableOpacity
              onPress={() => textMutation.mutate(textContent)}
              disabled={isSubmitting || textContent.trim().length < 10}
              className="mt-4 rounded-xl py-4 items-center"
              style={{
                backgroundColor: textContent.trim().length >= 10 ? colors.primary : VITANA_DESIGN_TOKENS.colors.border,
              }}
            >
              {isSubmitting ? <ActivityIndicator color="#fff" /> : (
                <Text className="font-body-semibold text-white text-base">Submit Answer</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View className="flex-row gap-3 mb-4">
              <TouchableOpacity
                onPress={pickDocument}
                className="flex-1 border-2 border-dashed border-border rounded-xl p-4 items-center"
              >
                <Feather name="file" size={24} color={colors.primary} />
                <Text className="font-body-medium text-text-primary mt-2">PDF / DOC</Text>
                <Text className="font-body text-text-secondary text-xs">Max 10 MB</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={pickPhoto}
                className="flex-1 border-2 border-dashed border-border rounded-xl p-4 items-center"
              >
                <Feather name="camera" size={24} color={colors.primary} />
                <Text className="font-body-medium text-text-primary mt-2">Take Photo</Text>
                <Text className="font-body text-text-secondary text-xs">Camera</Text>
              </TouchableOpacity>
            </View>

            {selectedFile && (
              <View className="bg-surface border border-border rounded-xl p-3 mb-4 flex-row items-center">
                <Feather name="file" size={20} color={colors.primary} />
                <Text className="font-body-medium text-text-primary ml-2 flex-1" numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <TouchableOpacity onPress={() => setSelectedFile(null)}>
                  <Feather name="x" size={18} color={VITANA_DESIGN_TOKENS.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={() => fileMutation.mutate()}
              disabled={isSubmitting || !selectedFile}
              className="rounded-xl py-4 items-center"
              style={{ backgroundColor: selectedFile ? colors.primary : VITANA_DESIGN_TOKENS.colors.border }}
            >
              {isSubmitting ? <ActivityIndicator color="#fff" /> : (
                <Text className="font-body-semibold text-white text-base">Upload & Submit</Text>
              )}
            </TouchableOpacity>

            <Text className="font-body text-text-secondary text-xs text-center mt-2">
              File submissions require an internet connection
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
```

---

## PHASE 7–8: AI/ML & External Integrations

> Not applicable for Student Portal core screens.

---

## PHASE 9: Testing & Validation

### Maestro E2E

```yaml
# mobile/maestro/tests/student_submit_assignment.yaml
appId: com.vitana.sms
---
- launchApp
- tapOn: "Assignments"
- assertVisible: "Assignments"
- tapOn:
    index: 0  # first pending assignment
- assertVisible: "Submit"
- tapOn: "Submit"
- tapOn: "✍️ Write"
- inputText: "This is my assignment answer, minimum ten characters required."
- tapOn: "Submit Answer"
- assertVisible: "successfully"
```

### Validation Checklist

- [ ] Dashboard shows today's schedule with correct times
- [ ] Timetable works offline (airplane mode test)
- [ ] Current period highlighted on today's view
- [ ] Assignment list sorts pending by due date
- [ ] Overdue assignments shown in red with "Overdue" badge
- [ ] Text submission queues offline and syncs
- [ ] File picker opens and validates 10 MB limit
- [ ] Attendance calendar reuses AttendanceBadge component
- [ ] Results show subject-wise marks
- [ ] Report card PDF opens via Expo WebBrowser
- [ ] Library issued books shown with due dates

---

## PHASE 10: Documentation & Verification

### Git Commit

```bash
git add .
git commit -m "feat(mobile/student): complete student portal

- Student dashboard: schedule, assignments, attendance, results
- Timetable: today/weekly view, SQLite cache, current period highlight
- Assignment list: pending/submitted/graded tabs, due date sort, overdue red
- Assignment submission: text (offline-queued) + file upload (camera/document)
- Exam results list + subject-wise marks + report card PDF
- Attendance calendar (reuses AttendanceBadge from parent portal)
- Fee summary (read-only)
- Leave application with offline queue

Reuses: AttendanceBadge, SkeletonLoader, EmptyState, OfflineQueueProcessor
Next: PROMPT-09 (Admin Portal)"
```

---

**END OF PROMPT-08**
