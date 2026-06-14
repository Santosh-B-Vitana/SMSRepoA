import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import * as Crypto from 'expo-crypto';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import {
  teacherApi,
  type MarksEntrySheetDto,
  type StudentMarksRowDto,
  type SingleStudentMarksDto,
  type BulkMarksEntryPayload,
} from '@/api/endpoints/teacher';
import { marksDraftService, type MarksEntry } from '@/offline/marksDraftService';
import { OfflineQueueProcessor } from '@/offline/queue';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';

// ─── Grade computation ────────────────────────────────────────────────────────

function computeGrade(
  obtained: number,
  maxMarks: number,
): { grade: string; color: string } {
  if (obtained < 0) return { grade: 'AB', color: VITANA_COLORS.textSecondary };
  if (maxMarks <= 0) return { grade: '—', color: VITANA_COLORS.textSecondary };
  const pct = (obtained / maxMarks) * 100;
  if (pct >= 91) return { grade: 'A1', color: '#15803d' };
  if (pct >= 81) return { grade: 'A2', color: '#16a34a' };
  if (pct >= 71) return { grade: 'B1', color: '#2563eb' };
  if (pct >= 61) return { grade: 'B2', color: '#3b82f6' };
  if (pct >= 51) return { grade: 'C1', color: '#d97706' };
  if (pct >= 41) return { grade: 'C2', color: '#f97316' };
  if (pct >= 33) return { grade: 'D', color: '#dc2626' };
  return { grade: 'F', color: '#b91c1c' };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarkState {
  theory: string;
  practical: string;
  internal: string;
  isAbsent: boolean;
}

type MarksMap = Record<string, MarkState>;

// ─── Student row ──────────────────────────────────────────────────────────────

interface RowProps {
  row: StudentMarksRowDto;
  state: MarkState;
  maxTheory: number;
  maxPractical: number;
  maxInternal: number;
  hasPractical: boolean;
  hasInternal: boolean;
  maxTotal: number;
  onTheoryChange: (v: string) => void;
  onPracticalChange: (v: string) => void;
  onInternalChange: (v: string) => void;
  onToggleAbsent: () => void;
}

function StudentRow({
  row,
  state,
  maxTheory,
  maxPractical,
  maxInternal,
  hasPractical,
  hasInternal,
  maxTotal,
  onTheoryChange,
  onPracticalChange,
  onInternalChange,
  onToggleAbsent,
}: RowProps) {
  const theoryNum   = state.theory   !== '' ? parseFloat(state.theory)   : NaN;
  const practicalNum = state.practical !== '' ? parseFloat(state.practical) : NaN;
  const internalNum  = state.internal  !== '' ? parseFloat(state.internal)  : NaN;

  const isTheoryInvalid =
    state.theory !== '' && !state.isAbsent &&
    (isNaN(theoryNum) || theoryNum < 0 || theoryNum > maxTheory);

  const isPracticalInvalid =
    hasPractical && state.practical !== '' && !state.isAbsent &&
    (isNaN(practicalNum) || practicalNum < 0 || practicalNum > maxPractical);

  const isInternalInvalid =
    hasInternal && state.internal !== '' && !state.isAbsent &&
    (isNaN(internalNum) || internalNum < 0 || internalNum > maxInternal);

  const totalObtained = state.isAbsent
    ? -1
    : (isNaN(theoryNum) ? 0 : theoryNum) +
      (hasPractical && !isNaN(practicalNum) ? practicalNum : 0) +
      (hasInternal && !isNaN(internalNum) ? internalNum : 0);

  const { grade, color } = computeGrade(totalObtained, maxTotal);

  const inputStyle = (invalid: boolean) => ({
    width: 46,
    height: 34,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 4,
    textAlign: 'center' as const,
    fontSize: 13,
    fontWeight: '600' as const,
    borderColor: invalid ? VITANA_COLORS.error : VITANA_COLORS.border,
    backgroundColor: invalid
      ? VITANA_COLORS.errorLight
      : state.isAbsent
      ? VITANA_COLORS.surface
      : '#fff',
    color: invalid ? VITANA_COLORS.error : VITANA_COLORS.text,
    opacity: state.isAbsent ? 0.4 : 1,
    marginLeft: 4,
  });

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: VITANA_COLORS.border,
        backgroundColor: '#fff',
      }}
    >
      {/* Roll */}
      <Text
        style={{ width: 28, fontSize: 11, color: VITANA_COLORS.textSecondary, fontWeight: '500' }}
        numberOfLines={1}
      >
        {row.rollNumber ?? '—'}
      </Text>

      {/* Name */}
      <Text
        style={{ flex: 1, fontSize: 13, color: VITANA_COLORS.text, fontWeight: '500', paddingRight: 4 }}
        numberOfLines={1}
      >
        {row.studentName}
      </Text>

      {/* Theory */}
      <TextInput
        value={state.theory}
        onChangeText={onTheoryChange}
        keyboardType="decimal-pad"
        maxLength={5}
        editable={!state.isAbsent}
        style={inputStyle(isTheoryInvalid)}
        placeholder={state.isAbsent ? 'AB' : '—'}
        placeholderTextColor={VITANA_COLORS.textSecondary}
      />

      {/* Practical */}
      {hasPractical && (
        <TextInput
          value={state.practical}
          onChangeText={onPracticalChange}
          keyboardType="decimal-pad"
          maxLength={5}
          editable={!state.isAbsent}
          style={inputStyle(isPracticalInvalid)}
          placeholder={state.isAbsent ? 'AB' : '—'}
          placeholderTextColor={VITANA_COLORS.textSecondary}
        />
      )}

      {/* Internal */}
      {hasInternal && (
        <TextInput
          value={state.internal}
          onChangeText={onInternalChange}
          keyboardType="decimal-pad"
          maxLength={5}
          editable={!state.isAbsent}
          style={inputStyle(isInternalInvalid)}
          placeholder={state.isAbsent ? 'AB' : '—'}
          placeholderTextColor={VITANA_COLORS.textSecondary}
        />
      )}

      {/* Total */}
      <View style={{ width: 38, alignItems: 'center', marginLeft: 4 }}>
        {state.isAbsent ? (
          <Text style={{ fontSize: 10, color: VITANA_COLORS.textSecondary, fontWeight: '600' }}>AB</Text>
        ) : (
          <Text style={{ fontSize: 12, fontWeight: '700', color: color }}>
            {totalObtained >= 0 ? totalObtained.toFixed(totalObtained % 1 !== 0 ? 1 : 0) : '—'}
          </Text>
        )}
        <Text style={{ fontSize: 9, color: VITANA_COLORS.textSecondary }}>{grade}</Text>
      </View>

      {/* Absent checkbox */}
      <TouchableOpacity
        onPress={onToggleAbsent}
        style={{ width: 28, alignItems: 'center' }}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: state.isAbsent ? VITANA_COLORS.error : VITANA_COLORS.border,
            backgroundColor: state.isAbsent ? VITANA_COLORS.error : '#fff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {state.isAbsent && <Feather name="x" size={12} color="#fff" />}
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MarksEntryGrid() {
  const { examSetupId, examSetupSubjectId } = useLocalSearchParams<{
    examSetupId: string;
    examSetupSubjectId: string;
  }>();
  const user = useAuthStore((s) => s.user);
  const { primaryColor } = useSchoolTheme();
  const qc = useQueryClient();

  const [marksMap, setMarksMap] = useState<MarksMap>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftLoadedAt, setDraftLoadedAt] = useState<string | null>(null);
  const [initialised, setInitialised] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: sheet, isLoading } = useQuery<MarksEntrySheetDto>({
    queryKey: ['marks-sheet', examSetupId, examSetupSubjectId],
    queryFn: () => teacherApi.getMarksSheet(examSetupId!, examSetupSubjectId!),
    enabled: !!examSetupId && !!examSetupSubjectId,
    staleTime: 2 * 60 * 1000,
  });

  const hasPractical = (sheet?.maxPracticalMarks ?? 0) > 0;
  const hasInternal  = (sheet?.maxInternalMarks  ?? 0) > 0;
  const maxTheory    = sheet?.maxTheoryMarks ?? 100;
  const maxPractical = sheet?.maxPracticalMarks ?? 0;
  const maxInternal  = sheet?.maxInternalMarks ?? 0;
  const maxTotal     = sheet?.maxTotalMarks > 0 ? sheet.maxTotalMarks : maxTheory;

  // Initialise from draft → server data → defaults
  useEffect(() => {
    if (!sheet || initialised) return;

    void (async () => {
      const draft = await marksDraftService.loadDraft(examSetupId!, examSetupSubjectId!, '-');

      if (draft && draft.marks.length > 0) {
        const map: MarksMap = {};
        draft.marks.forEach((m: MarksEntry) => {
          map[m.studentId] = {
            theory:    m.theory    !== null ? String(m.theory)    : '',
            practical: m.practical !== null ? String(m.practical) : '',
            internal:  m.internal !== null && m.internal !== undefined
                         ? String(m.internal) : '',
            isAbsent: m.isAbsent,
          };
        });
        setMarksMap(map);
        setDraftLoadedAt(new Date(draft.lastModified).toLocaleTimeString('en-IN'));
      } else {
        const map: MarksMap = {};
        sheet.rows.forEach((r) => {
          map[r.studentId] = {
            theory:    r.theoryMarks    !== null ? String(r.theoryMarks)    : '',
            practical: r.practicalMarks !== null ? String(r.practicalMarks) : '',
            internal:  r.internalMarks  !== null ? String(r.internalMarks)  : '',
            isAbsent: r.isAbsent,
          };
        });
        setMarksMap(map);
      }

      setInitialised(true);
    })();
  }, [sheet, initialised, examSetupId, examSetupSubjectId]);

  // Safely parse a mark string: '' → null, NaN → null, '0' → 0 (preserves zero marks).
  const parseMark = (s: string | undefined): number | null => {
    if (s === undefined || s === '') return null;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };

  // 30-second debounced auto-save
  const saveDraft = useCallback(async () => {
    if (!user || !sheet) return;
    const entries: MarksEntry[] = sheet.rows.map((r) => ({
      studentId: r.studentId,
      theory: parseMark(marksMap[r.studentId]?.theory),
      practical: hasPractical ? parseMark(marksMap[r.studentId]?.practical) : null,
      internal: hasInternal ? parseMark(marksMap[r.studentId]?.internal) : null,
      isAbsent: marksMap[r.studentId]?.isAbsent ?? false,
    }));
    await marksDraftService.saveDraft(
      examSetupId!, examSetupSubjectId!, '-',
      entries, user.id, user.schoolId,
    );
  }, [marksMap, sheet, examSetupId, examSetupSubjectId, user, hasPractical, hasInternal, parseMark]);

  useEffect(() => {
    if (!initialised) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void saveDraft(); }, 30_000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [marksMap, initialised, saveDraft]);

  function updateField(studentId: string, field: keyof MarkState, value: string | boolean) {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  }

  function toggleAbsent(studentId: string) {
    setMarksMap((prev) => {
      const current = prev[studentId];
      const nowAbsent = !current?.isAbsent;
      return {
        ...prev,
        [studentId]: {
          theory:    nowAbsent ? '' : current?.theory    ?? '',
          practical: nowAbsent ? '' : current?.practical ?? '',
          internal:  nowAbsent ? '' : current?.internal  ?? '',
          isAbsent: nowAbsent,
        },
      };
    });
  }

  async function handleSubmit() {
    if (!sheet || !user) return;

    // Guard: at least one student must have marks or be marked absent.
    const hasAnyEntry = sheet.rows.some((row) => {
      const state = marksMap[row.studentId];
      return state?.isAbsent || state?.theory !== '';
    });
    if (!hasAnyEntry) {
      Alert.alert(
        'No Marks Entered',
        'Please enter marks for at least one student before submitting.',
        [{ text: 'OK' }],
      );
      return;
    }

    // Guard: warn if most marks are still blank (likely submitted by mistake)
    const blankCount = sheet.rows.filter((row) => {
      const state = marksMap[row.studentId];
      return !state?.isAbsent && (state?.theory === '' || state?.theory === undefined);
    }).length;
    if (blankCount > 0 && blankCount === sheet.rows.length) {
      Alert.alert(
        'Marks Are Empty',
        'All students have blank marks. If you submit now they will be recorded as 0. Continue anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit as 0', style: 'destructive', onPress: () => void doSubmit() },
        ],
      );
      return;
    }

    await doSubmit();
  }

  async function doSubmit() {
    if (!sheet || !user) return;

    // Validate all rows
    for (const row of sheet.rows) {
      const state = marksMap[row.studentId];
      if (state?.isAbsent) continue;

      if (state?.theory !== '') {
        const t = parseFloat(state?.theory ?? '');
        if (isNaN(t) || t < 0 || t > maxTheory) {
          Alert.alert('Invalid Marks', `${row.studentName}: Theory marks must be 0–${maxTheory}`);
          return;
        }
      }
      if (hasPractical && state?.practical !== '') {
        const p = parseFloat(state?.practical ?? '');
        if (isNaN(p) || p < 0 || p > maxPractical) {
          Alert.alert('Invalid Marks', `${row.studentName}: Practical marks must be 0–${maxPractical}`);
          return;
        }
      }
      if (hasInternal && state?.internal !== '') {
        const i = parseFloat(state?.internal ?? '');
        if (isNaN(i) || i < 0 || i > maxInternal) {
          Alert.alert('Invalid Marks', `${row.studentName}: Internal marks must be 0–${maxInternal}`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const draft = await marksDraftService.loadDraft(examSetupId!, examSetupSubjectId!, '-');
      const idempotencyKey = draft?.idempotencyKey ?? Crypto.randomUUID();

      const entries: SingleStudentMarksDto[] = sheet.rows.map((r) => {
        const state = marksMap[r.studentId];
        const isAbsent = state?.isAbsent ?? false;
        return {
          studentId: r.studentId,
          isAbsent,
          theoryMarks: isAbsent || state?.theory === '' ? null : parseFloat(state!.theory),
          practicalMarks:
            hasPractical && !isAbsent && state?.practical !== ''
              ? parseFloat(state!.practical) : null,
          internalMarks:
            hasInternal && !isAbsent && state?.internal !== ''
              ? parseFloat(state!.internal) : null,
        };
      });

      const payload: BulkMarksEntryPayload = {
        examSetupId: examSetupId!,
        examSetupSubjectId: examSetupSubjectId!,
        entries,
      };

      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        const result = await teacherApi.saveBulkMarks(
          examSetupId!, examSetupSubjectId!, payload, idempotencyKey,
        );

        await marksDraftService.markSubmitted(examSetupId!, examSetupSubjectId!, '-');

        // Show partial-failure errors if any
        if ((result.errors?.length ?? 0) > 0) {
          const errMsg = result.errors.slice(0, 3).join('\n');
          Alert.alert(
            `${result.successCount} Saved, ${result.failureCount} Failed`,
            `Some entries had errors:\n${errMsg}`,
            [{ text: 'Continue', onPress: navigateToPerformance }],
          );
        } else {
          navigateToPerformance();
        }
      } else {
        await OfflineQueueProcessor.enqueue({
          method: 'POST',
          endpoint: `/examinations/exam-setup/${examSetupId}/subjects/${examSetupSubjectId}/marks`,
          body: payload,
          extraHeaders: { 'X-Idempotency-Key': idempotencyKey },
          operationType: 'marks_entry',
          userId: user.id,
          schoolId: user.schoolId,
        });
        Alert.alert(
          'Saved Offline',
          'Marks saved locally. They will be submitted automatically when you reconnect.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit marks.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  } // end doSubmit

  function navigateToPerformance() {
    // Invalidate cache so performance screen gets fresh computed data
    void qc.invalidateQueries({ queryKey: ['marks-sheet', examSetupId, examSetupSubjectId] });
    router.replace(
      `/(teacher)/marks/${examSetupId}/performance?examSetupSubjectId=${examSetupSubjectId}` as never,
    );
  }

  const filledCount =
    sheet?.rows.filter(
      (r) => marksMap[r.studentId]?.isAbsent || marksMap[r.studentId]?.theory !== '',
    ).length ?? 0;
  const totalCount = sheet?.rows.length ?? 0;

  if (isLoading || !sheet) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: VITANA_COLORS.surface }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={VITANA_COLORS.primary} />
          <Text style={{ fontSize: 14, color: VITANA_COLORS.textSecondary }}>Loading marks sheet…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (sheet.isLocked) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: VITANA_COLORS.surface }} edges={['top']}>
        <View
          style={{
            paddingHorizontal: 16, paddingVertical: 14,
            backgroundColor: '#fff', borderBottomWidth: 1,
            borderBottomColor: VITANA_COLORS.border,
            flexDirection: 'row', alignItems: 'center',
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text }}>
            {sheet.subjectName}
          </Text>
        </View>
        {/* Read-only locked view */}
        <View style={{ flex: 1 }}>
          <View
            style={{
              backgroundColor: '#fef3c7', padding: 12, margin: 16, borderRadius: 12,
              flexDirection: 'row', alignItems: 'center', gap: 8,
              borderWidth: 1, borderColor: '#fde68a',
            }}
          >
            <Feather name="lock" size={16} color="#d97706" />
            <Text style={{ fontSize: 13, color: '#92400e', flex: 1, fontWeight: '500' }}>
              Marks are locked. Shown in read-only mode. Contact admin to unlock for editing.
            </Text>
          </View>
          {/* Show submitted marks read-only */}
          <View
            style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 10, paddingVertical: 6,
              backgroundColor: VITANA_COLORS.surface,
              borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
            }}
          >
            {['Roll', 'Student', 'Th', hasPractical && 'Pr', hasInternal && 'Int', 'Total', 'Grade']
              .filter(Boolean)
              .map((h) => (
                <Text
                  key={h as string}
                  style={{
                    fontSize: 10, fontWeight: '700', color: VITANA_COLORS.textSecondary,
                    textTransform: 'uppercase',
                    width: h === 'Student' ? undefined : h === 'Roll' ? 28 : 46,
                    flex: h === 'Student' ? 1 : undefined,
                    textAlign: 'center',
                    marginLeft: h === 'Roll' || h === 'Student' ? 0 : 4,
                  }}
                >
                  {h as string}
                </Text>
              ))}
          </View>
          <FlashList
            data={sheet.rows}
            estimatedItemSize={44}
            keyExtractor={(item) => item.studentId}
            renderItem={({ item }) => {
              const total = item.obtainedMarks ?? 0;
              const { grade, color } = computeGrade(
                item.isAbsent ? -1 : total,
                maxTotal,
              );
              return (
                <View
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 10, paddingVertical: 8,
                    borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
                    backgroundColor: item.isAbsent ? '#fef2f2' : '#fff',
                  }}
                >
                  <Text style={{ width: 28, fontSize: 11, color: VITANA_COLORS.textSecondary }}>
                    {item.rollNumber ?? '—'}
                  </Text>
                  <Text style={{ flex: 1, fontSize: 13, color: VITANA_COLORS.text, fontWeight: '500', paddingRight: 4 }} numberOfLines={1}>
                    {item.studentName}
                  </Text>
                  {[
                    String(item.theoryMarks ?? (item.isAbsent ? 'AB' : '—')),
                    hasPractical && String(item.practicalMarks ?? (item.isAbsent ? 'AB' : '—')),
                    hasInternal  && String(item.internalMarks  ?? (item.isAbsent ? 'AB' : '—')),
                  ].filter(Boolean).map((v, i) => (
                    <Text key={i} style={{ width: 46, fontSize: 12, fontWeight: '600', textAlign: 'center', color: VITANA_COLORS.text, marginLeft: 4 }}>
                      {v as string}
                    </Text>
                  ))}
                  <Text style={{ width: 46, fontSize: 12, fontWeight: '700', textAlign: 'center', color, marginLeft: 4 }}>
                    {item.isAbsent ? 'AB' : String(total)}
                  </Text>
                  <Text style={{ width: 32, fontSize: 12, fontWeight: '700', textAlign: 'center', color, marginLeft: 4 }}>
                    {item.isAbsent ? '—' : (item.grade ?? grade)}
                  </Text>
                </View>
              );
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Editable mode ──────────────────────────────────────────────────────────

  const maxLabel = [
    `Th ${maxTheory}`,
    hasPractical && `Pr ${maxPractical}`,
    hasInternal  && `Int ${maxInternal}`,
  ].filter(Boolean).join(' · ');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: VITANA_COLORS.surface }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
          backgroundColor: '#fff',
          borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: VITANA_COLORS.text }}>
              {sheet.subjectName}
            </Text>
            <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
              {sheet.examName}
            </Text>
          </View>
          {draftLoadedAt && (
            <View
              style={{
                backgroundColor: VITANA_COLORS.successLight, borderRadius: 8,
                paddingHorizontal: 8, paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 11, color: VITANA_COLORS.success, fontWeight: '600' }}>
                Draft {draftLoadedAt}
              </Text>
            </View>
          )}
        </View>
        {/* Max marks info bar */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
            Max: {maxLabel}  ·  Total {maxTotal}  ·  Pass {sheet.passingMarks}
          </Text>
          <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
            {filledCount}/{totalCount} filled
          </Text>
        </View>
      </View>

      {/* Column headers */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 10, paddingVertical: 6,
          backgroundColor: VITANA_COLORS.surface,
          borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
        }}
      >
        {[
          { label: 'Roll', width: 28 },
          { label: 'Student', flex: 1 },
          { label: `Th/${maxTheory}`, width: 46 },
          hasPractical && { label: `Pr/${maxPractical}`, width: 46 },
          hasInternal  && { label: `Int/${maxInternal}`, width: 46 },
          { label: 'Total', width: 38 },
          { label: 'AB', width: 28 },
        ].filter(Boolean).map((col: any, i) => (
          <Text
            key={i}
            style={{
              width: col.width,
              flex: col.flex,
              fontSize: 10,
              fontWeight: '700',
              color: VITANA_COLORS.textSecondary,
              textTransform: 'uppercase',
              textAlign: 'center',
              marginLeft: i === 0 || col.flex ? 0 : 4,
            }}
          >
            {col.label}
          </Text>
        ))}
      </View>

      {/* Student rows */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlashList
          data={sheet.rows}
          estimatedItemSize={52}
          keyExtractor={(item) => item.studentId}
          renderItem={({ item }) => (
            <StudentRow
              row={item}
              state={marksMap[item.studentId] ?? { theory: '', practical: '', internal: '', isAbsent: false }}
              maxTheory={maxTheory}
              maxPractical={maxPractical}
              maxInternal={maxInternal}
              hasPractical={hasPractical}
              hasInternal={hasInternal}
              maxTotal={maxTotal}
              onTheoryChange={(v) => updateField(item.studentId, 'theory', v)}
              onPracticalChange={(v) => updateField(item.studentId, 'practical', v)}
              onInternalChange={(v) => updateField(item.studentId, 'internal', v)}
              onToggleAbsent={() => toggleAbsent(item.studentId)}
            />
          )}
        />
      </KeyboardAvoidingView>

      {/* Submit footer */}
      <View
        style={{
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: '#fff',
          borderTopWidth: 1, borderTopColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity
          onPress={() => { void handleSubmit(); }}
          disabled={isSubmitting}
          style={{
            backgroundColor: primaryColor ?? VITANA_COLORS.primary,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="check-circle" size={18} color="#fff" />
          )}
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
            {isSubmitting ? 'Submitting…' : 'Review & Submit'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
