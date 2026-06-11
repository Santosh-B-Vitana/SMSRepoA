# PROMPT-13: Examinations & Marks Entry

> **Version**: 2.0 — Full 10-Phase Anatomy  
> **Epic**: EP-08 (Examinations) + EP-14 (Teacher Marks & Assignments)  
> **Sprint**: 14 (Weeks 27–28)  
> **Story Points**: 35  
> **Prerequisites**: PROMPT-04 ✓ (SQLite), PROMPT-12 ✓ (marksDrafts table)  
> **Parallel**: PROMPT-09 (Admin Portal) — different engineer

---

## PHASE 1: Context & Scope

### What We're Building

Complete examinations module: teacher marks entry grid with offline draft, class performance analytics, and assignment creation/grading. Parents and students already see results from PROMPT-03/08 — this prompt builds the teacher-side entry and the full assignment management workflow.

**Capabilities:**
- Teacher: pending exams list with marks entry status
- Teacher: marks entry grid (FlashList, 40+ students, offline draft)
- Teacher: theory + practical marks on separate columns
- Teacher: class performance after submission (avg, highest, lowest, grade distribution)
- Teacher: create assignment + view submissions
- Teacher: grade student submission with marks + feedback
- Grade computation client-side (instant feedback while entering)

### Success Criteria

- [ ] Marks grid renders 40 students in < 500ms (FlashList)
- [ ] Invalid marks (> max) show red border, prevent submission
- [ ] Grade badge updates instantly on marks change (client-side compute)
- [ ] Draft auto-saves to SQLite every 30 seconds (debounced)
- [ ] Closing grid mid-entry and reopening shows draft with "Draft loaded" toast
- [ ] Offline submission queued and synced on reconnect
- [ ] Theory + Practical columns appear only for applicable exam types
- [ ] Assignment created → students receive push notification (backend sends)
- [ ] Grading a submission → student receives push notification

---

## PHASE 2: Analysis Phase

### Existing Code Audit

```bash
# Verify marksDraftService exists from PROMPT-12
cat mobile/src/offline/marksDraftService.ts

# Verify marksDrafts table in schema
grep "marksDrafts" mobile/src/offline/schema.ts

# Check exam-related types exist in shared-types
grep "ExamResult\|SubjectResult" packages/shared-types/src/api/examinations.ts
```

### API Contracts

```
GET /api/examinations/exams                → Exam[] (all for academic year)
GET /api/examinations/exam-setup?classId=X → ExamSetup[] (subjects + max marks)
GET /api/examinationreports/student-marks/{examId}?classId=X&subjectId=Y
  → [{ studentId, theory, practical, isAbsent }]  (existing marks)
PUT /api/examinations/results/bulk
  Header: X-Idempotency-Key: <uuid>
  Body: { examId, classId, subjectId, results: [{ studentId, marks, practicalMarks? }] }
GET /api/examinationreports/exam-performance/{examId}?classId=X
  → { average, highest, lowest, passCount, gradeDistribution }
GET /api/assignments?teacherId=me         → Assignment[]
POST /api/assignments                      → CreateAssignmentRequest
GET /api/assignments/{id}/submissions      → Submission[]
PUT /api/assignments/{id}/grade/{subId}    → { marksObtained, feedback }
```

---

## PHASE 3: Technical Planning

### Grade Computation Client-Side

```typescript
interface GradeTier {
  grade: string;
  minPercentage: number;
  color: string;
}

function computeGrade(marks: number, maxMarks: number, tiers: GradeTier[]): { grade: string; color: string } {
  if (marks === -1) return { grade: 'AB', color: '#9ca3af' };  // Absent
  const pct = (marks / maxMarks) * 100;
  const tier = [...tiers]
    .sort((a, b) => b.minPercentage - a.minPercentage)
    .find(t => pct >= t.minPercentage);
  return { grade: tier?.grade ?? 'F', color: tier?.color ?? '#ef4444' };
}
```

Grade tiers are fetched from `/api/academics/classes/settings` once and cached in the school store.

### Screen Map

```
mobile/app/(teacher)/
├── marks/
│   ├── index.tsx                          ← Pending exams list
│   ├── [examId].tsx                       ← Class + subject selection
│   └── [examId]/
│       ├── [classId]/
│       │   ├── [subjectId].tsx            ← Marks entry grid (CRITICAL)
│       │   └── performance.tsx            ← Class performance analytics
├── assignments/
│   ├── index.tsx                          ← My assignments list
│   ├── create.tsx                         ← Create assignment form
│   └── [id]/
│       ├── submissions.tsx                ← Submissions list
│       └── grade/
│           └── [submissionId].tsx         ← Grade submission
```

---

## PHASE 4: Database Design

> `marksDrafts` table already created in PROMPT-12. No new tables needed.

---

## PHASE 5: Backend Implementation

### Extend Examination Results Controller

```csharp
// Ensure idempotency key support on bulk marks entry
[HttpPut("examinations/results/bulk")]
[Authorize]
public async Task<IActionResult> BulkUpdateResults(
    [FromBody] BulkResultsRequest request,
    [FromHeader(Name = "X-Idempotency-Key")] string? idempotencyKey = null)
{
    if (!string.IsNullOrEmpty(idempotencyKey))
    {
        var cacheKey = $"marks_idempotency:{idempotencyKey}";
        var existing = await _cacheService.GetAsync<object>(cacheKey);
        if (existing != null) return Ok(existing);
    }

    var result = await _examinationService.BulkUpdateResultsAsync(request);

    if (!string.IsNullOrEmpty(idempotencyKey))
        await _cacheService.SetAsync($"marks_idempotency:{idempotencyKey}", result, TimeSpan.FromHours(24));

    return Ok(result);
}
```

---

## PHASE 6: Mobile Implementation

### 6.1 Teacher Exam API

```typescript
// mobile/src/api/endpoints/teacher.ts — ADD to existing teacherApi:
getMyExams: () => apiClient.get('/examinations/exams'),
getExamSetup: (classId: string) => apiClient.get('/examinations/exam-setup', { params: { classId } }),
getExistingMarks: (examId: string, classId: string, subjectId: string) =>
  apiClient.get(`/examinationreports/student-marks/${examId}`, { params: { classId, subjectId } }),
submitBulkMarks: (payload: any, idempotencyKey: string) =>
  apiClient.put('/examinations/results/bulk', payload, {
    headers: { 'X-Idempotency-Key': idempotencyKey },
  }),
getClassPerformance: (examId: string, classId: string) =>
  apiClient.get(`/examinationreports/exam-performance/${examId}`, { params: { classId } }),
getGradeTiers: (classId: string) =>
  apiClient.get(`/academics/classes/settings`, { params: { classId } }),
getMyAssignments: () => apiClient.get('/assignments', { params: { teacherId: 'me' } }),
createAssignment: (data: any) => apiClient.post('/assignments', data),
getSubmissions: (assignmentId: string) => apiClient.get(`/assignments/${assignmentId}/submissions`),
gradeSubmission: (assignmentId: string, submissionId: string, data: { marksObtained: number; feedback: string }) =>
  apiClient.put(`/assignments/${assignmentId}/grade/${submissionId}`, data),
```

### 6.2 Marks Entry Grid

```typescript
// mobile/app/(teacher)/marks/[examId]/[classId]/[subjectId].tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { teacherApi } from '../../../../../src/api/endpoints/teacher';
import { marksDraftService, MarksEntry } from '../../../../../src/offline/marksDraftService';
import { OfflineQueueProcessor } from '../../../../../src/offline/queue';
import { useAuthStore } from '../../../../../src/stores/authStore';
import { useAppTheme } from '../../../../../src/theme/SchoolThemeProvider';
import { queryClient } from '../../../../../src/api/queryClient';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

function computeGrade(marks: number, maxMarks: number): { grade: string; color: string } {
  if (marks < 0) return { grade: 'AB', color: '#9ca3af' };
  const pct = (marks / maxMarks) * 100;
  if (pct >= 91) return { grade: 'A1', color: '#16a34a' };
  if (pct >= 81) return { grade: 'A2', color: '#22c55e' };
  if (pct >= 71) return { grade: 'B1', color: '#3b82f6' };
  if (pct >= 61) return { grade: 'B2', color: '#60a5fa' };
  if (pct >= 51) return { grade: 'C1', color: '#f59e0b' };
  if (pct >= 41) return { grade: 'C2', color: '#f97316' };
  if (pct >= 33) return { grade: 'D',  color: '#ef4444' };
  return { grade: 'F', color: '#dc2626' };
}

export default function MarksEntryGrid() {
  const { examId, classId, subjectId } = useLocalSearchParams<{
    examId: string; classId: string; subjectId: string;
  }>();
  const { user } = useAuthStore();
  const { colors } = useAppTheme();

  const [marksMap, setMarksMap] = useState<Record<string, { theory: string; practical: string; isAbsent: boolean }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftLoadedAt, setDraftLoadedAt] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const { data: students } = useQuery({
    queryKey: ['students', classId],
    queryFn: () => teacherApi.getClassStudents(classId!),
  });

  const { data: examSetup } = useQuery({
    queryKey: ['exam-setup', classId, examId],
    queryFn: () => teacherApi.getExamSetup(classId!),
  });

  const subjectSetup = examSetup?.find((s: any) => s.subjectId === subjectId);
  const maxTheory = subjectSetup?.maxTheoryMarks ?? 100;
  const maxPractical = subjectSetup?.maxPracticalMarks ?? null;
  const hasPractical = maxPractical !== null;

  // Load draft or existing marks on mount
  useEffect(() => {
    loadInitialData();
  }, [students, examId, classId, subjectId]);

  async function loadInitialData() {
    if (!students?.length) return;

    // Try to load from draft first
    const draft = await marksDraftService.loadDraft(examId!, classId!, subjectId!);
    if (draft) {
      const map: Record<string, any> = {};
      draft.marks.forEach((m: MarksEntry) => {
        map[m.studentId] = {
          theory: m.theory !== null ? String(m.theory) : '',
          practical: m.practical !== null ? String(m.practical) : '',
          isAbsent: m.isAbsent,
        };
      });
      setMarksMap(map);
      setDraftLoadedAt(new Date(draft.lastModified).toLocaleTimeString('en-IN'));
      return;
    }

    // No draft — try loading existing server marks
    try {
      const existing = await teacherApi.getExistingMarks(examId!, classId!, subjectId!);
      if (existing?.length > 0) {
        const map: Record<string, any> = {};
        (existing as any[]).forEach(m => {
          map[m.studentId] = {
            theory: m.marks !== null ? String(m.marks) : '',
            practical: m.practicalMarks !== null ? String(m.practicalMarks) : '',
            isAbsent: m.isAbsent ?? false,
          };
        });
        setMarksMap(map);
      }
    } catch { /* first time — no server data */ }

    // Default all present
    if (students) {
      const map: Record<string, any> = {};
      (students as any[]).forEach(s => {
        if (!marksMap[s.id]) {
          map[s.id] = { theory: '', practical: '', isAbsent: false };
        }
      });
      setMarksMap(prev => ({ ...map, ...prev }));
    }
  }

  // Auto-save draft every 30 seconds (debounced)
  const saveDraft = useCallback(async () => {
    if (!user || !students) return;
    const entries: MarksEntry[] = (students as any[]).map(s => ({
      studentId: s.id,
      theory: marksMap[s.id]?.theory ? parseFloat(marksMap[s.id].theory) : null,
      practical: marksMap[s.id]?.practical ? parseFloat(marksMap[s.id].practical) : null,
      isAbsent: marksMap[s.id]?.isAbsent ?? false,
    }));
    await marksDraftService.saveDraft(examId!, classId!, subjectId!, entries, user.id, user.schoolId);
  }, [marksMap, examId, classId, subjectId, user, students]);

  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveDraft, 30000);
    return () => clearTimeout(saveTimer.current);
  }, [marksMap]);

  function updateMarks(studentId: string, field: 'theory' | 'practical', value: string) {
    setMarksMap(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  }

  function toggleAbsent(studentId: string) {
    setMarksMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        isAbsent: !prev[studentId]?.isAbsent,
        theory: !prev[studentId]?.isAbsent ? '' : prev[studentId].theory,
        practical: !prev[studentId]?.isAbsent ? '' : prev[studentId].practical,
      },
    }));
  }

  async function handleSubmit() {
    // Validation
    for (const student of (students ?? []) as any[]) {
      const entry = marksMap[student.id];
      if (!entry?.isAbsent) {
        const theory = parseFloat(entry?.theory ?? '');
        if (entry?.theory !== '' && (isNaN(theory) || theory < 0 || theory > maxTheory)) {
          Alert.alert('Invalid Marks', `${student.firstName} ${student.lastName}: Theory marks must be 0–${maxTheory}`);
          return;
        }
        if (hasPractical) {
          const practical = parseFloat(entry?.practical ?? '');
          if (entry?.practical !== '' && (isNaN(practical) || practical < 0 || practical > maxPractical!)) {
            Alert.alert('Invalid Marks', `${student.firstName} ${student.lastName}: Practical marks must be 0–${maxPractical}`);
            return;
          }
        }
      }
    }

    setIsSubmitting(true);
    const { generateUUID } = await import('@vitana/shared-utils');
    const idempotencyKey = (await marksDraftService.loadDraft(examId!, classId!, subjectId!))?.idempotencyKey ?? generateUUID();

    const results = (students ?? [] as any[]).map((s: any) => {
      const entry = marksMap[s.id];
      return {
        studentId: s.id,
        isAbsent: entry?.isAbsent ?? false,
        marks: entry?.isAbsent ? null : parseFloat(entry?.theory ?? '0') || 0,
        practicalMarks: hasPractical ? (entry?.isAbsent ? null : parseFloat(entry?.practical ?? '0') || null) : undefined,
      };
    });

    const payload = { examId, classId, subjectId, results };

    try {
      const isConnected = (await NetInfo.fetch()).isConnected;
      if (isConnected) {
        await teacherApi.submitBulkMarks(payload, idempotencyKey);
        await marksDraftService.markSubmitted(examId!, classId!, subjectId!);
        queryClient.invalidateQueries({ queryKey: ['exam-performance', examId, classId] });
        router.replace(`/(teacher)/marks/${examId}/${classId}/performance`);
      } else {
        await OfflineQueueProcessor.enqueue({
          method: 'PUT',
          endpoint: '/examinations/results/bulk',
          body: payload,
          extraHeaders: { 'X-Idempotency-Key': idempotencyKey },
          operationType: 'marks_entry',
          userId: user!.id,
          schoolId: user!.schoolId,
        });
        Alert.alert('Saved', 'Marks saved offline. Will submit when connected.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to submit marks.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const filledCount = (students ?? [] as any[]).filter((s: any) =>
    marksMap[s.id]?.isAbsent || marksMap[s.id]?.theory !== ''
  ).length;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <View className="flex-row items-center mb-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Feather name="arrow-left" size={22} color={VITANA_DESIGN_TOKENS.colors.textPrimary} />
          </TouchableOpacity>
          <Text className="font-heading text-base text-text-primary flex-1">Marks Entry</Text>
          {draftLoadedAt && (
            <Text className="font-body text-xs text-success">Draft: {draftLoadedAt}</Text>
          )}
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="font-body text-text-secondary text-xs">
            Max Theory: {maxTheory}{hasPractical ? ` · Practical: ${maxPractical}` : ''}
          </Text>
          <Text className="font-body text-text-secondary text-xs">
            {filledCount}/{(students ?? []).length} filled
          </Text>
        </View>
      </View>

      {/* Table Header */}
      <View className="flex-row px-4 py-2 bg-surface border-b border-border">
        <Text className="font-body-semibold text-text-secondary text-xs w-8">Roll</Text>
        <Text className="font-body-semibold text-text-secondary text-xs flex-1">Name</Text>
        <Text className="font-body-semibold text-text-secondary text-xs w-16 text-center">Theory</Text>
        {hasPractical && <Text className="font-body-semibold text-text-secondary text-xs w-16 text-center">Prac</Text>}
        <Text className="font-body-semibold text-text-secondary text-xs w-10 text-center">Grade</Text>
        <Text className="font-body-semibold text-text-secondary text-xs w-8 text-center">AB</Text>
      </View>

      {/* Student Rows */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <FlashList
          data={students as any[] ?? []}
          estimatedItemSize={52}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => {
            const entry = marksMap[item.id] ?? { theory: '', practical: '', isAbsent: false };
            const theoryVal = entry.theory !== '' ? parseFloat(entry.theory) : -1;
            const totalForGrade = hasPractical && entry.practical !== ''
              ? (theoryVal + parseFloat(entry.practical))
              : theoryVal;
            const maxForGrade = hasPractical ? maxTheory + (maxPractical ?? 0) : maxTheory;
            const { grade, color } = computeGrade(entry.isAbsent ? -1 : totalForGrade, maxForGrade);

            const isTheoryInvalid = entry.theory !== '' && !entry.isAbsent &&
              (parseFloat(entry.theory) > maxTheory || parseFloat(entry.theory) < 0);

            return (
              <View className="flex-row items-center px-4 py-2 border-b border-border bg-white">
                <Text className="font-body text-text-secondary text-xs w-8">{item.rollNumber}</Text>
                <Text className="font-body-medium text-text-primary text-xs flex-1 pr-2" numberOfLines={1}>
                  {item.firstName} {item.lastName}
                </Text>
                <TextInput
                  value={entry.theory}
                  onChangeText={v => updateMarks(item.id, 'theory', v)}
                  keyboardType="numeric"
                  maxLength={3}
                  editable={!entry.isAbsent}
                  className={`w-16 border rounded-lg px-2 py-1.5 text-center font-body text-sm ${
                    isTheoryInvalid ? 'border-danger bg-danger/10' : 'border-border bg-surface'
                  } ${entry.isAbsent ? 'opacity-30' : ''}`}
                  placeholder={entry.isAbsent ? 'AB' : '—'}
                />
                {hasPractical && (
                  <TextInput
                    value={entry.practical}
                    onChangeText={v => updateMarks(item.id, 'practical', v)}
                    keyboardType="numeric"
                    maxLength={3}
                    editable={!entry.isAbsent}
                    className={`w-16 border rounded-lg px-2 py-1.5 text-center font-body text-sm ml-1 ${
                      entry.isAbsent ? 'opacity-30 border-border bg-surface' : 'border-border bg-surface'
                    }`}
                    placeholder={entry.isAbsent ? 'AB' : '—'}
                  />
                )}
                <View className="w-10 items-center">
                  <Text className="font-body-semibold text-xs" style={{ color }}>{grade}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => toggleAbsent(item.id)}
                  className="w-8 items-center"
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <View
                    className={`w-5 h-5 rounded border-2 items-center justify-center ${
                      entry.isAbsent ? 'bg-danger border-danger' : 'border-border bg-white'
                    }`}
                  >
                    {entry.isAbsent && <Feather name="x" size={12} color="white" />}
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </KeyboardAvoidingView>

      {/* Submit Footer */}
      <View className="px-4 py-3 bg-white border-t border-border">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="rounded-xl py-3.5 items-center"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="font-body-semibold text-white text-base">
            {isSubmitting ? 'Saving...' : 'Review & Submit'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

---

## PHASE 9: Testing

### Maestro E2E

```yaml
# mobile/maestro/tests/teacher_enter_marks.yaml
appId: com.vitana.sms
---
- launchApp
- tapOn: "Marks"
- assertVisible: "Marks Entry"
- tapOn: index: 0   # first pending exam
- tapOn: index: 0   # first class
- tapOn: index: 0   # first subject
- assertVisible: "Marks Entry"
- tapOn: index: 0   # first theory input
- inputText: "22"
- tapOn: "Review & Submit"
- assertVisible: "Performance"
```

### Validation Checklist

- [ ] Marks grid renders 35 students in < 500ms
- [ ] Invalid marks (> max): red border on field, "Review & Submit" blocked
- [ ] Grade badge updates instantly as marks typed
- [ ] Auto-save: make changes → wait 30s → verify SQLite has updated marks
- [ ] Draft loads on grid reopen with correct time in header
- [ ] Offline submit: enable airplane mode → submit → airplane off → syncs
- [ ] Theory + Practical columns visible for applicable exam types only
- [ ] Class performance shows after submission

---

## PHASE 10: Documentation & Verification

### Git Commit

```bash
git add .
git commit -m "feat(mobile/marks): marks entry grid and assignment management

- Teacher marks entry grid: FlashList for 40+ students
- Offline marks draft: auto-save to SQLite every 30s
- Grade computed client-side on each keystroke (no round trip)
- Theory + Practical separate columns (conditional on exam setup)
- Invalid marks: red border + blocked submission
- Offline submission via OfflineQueueProcessor
- Class performance analytics after submission
- Assignment list (pending grading / active / completed tabs)
- Create assignment form with push notification to students
- Submissions list per assignment
- Grade submission with marks + feedback + student push notification

Next: PROMPT-14 (Communication & Messaging)"
```

---

**END OF PROMPT-13**
