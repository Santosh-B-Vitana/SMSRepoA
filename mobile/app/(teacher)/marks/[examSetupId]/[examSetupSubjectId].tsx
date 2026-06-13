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
import { useQuery } from '@tanstack/react-query';
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

// ─── Grade computation (client-side, no API call) ─────────────────────────────

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
  isAbsent: boolean;
}

type MarksMap = Record<string, MarkState>;

// ─── Row component ────────────────────────────────────────────────────────────

interface RowProps {
  row: StudentMarksRowDto;
  state: MarkState;
  maxTheory: number;
  maxPractical: number;
  hasPractical: boolean;
  onTheoryChange: (v: string) => void;
  onPracticalChange: (v: string) => void;
  onToggleAbsent: () => void;
}

function StudentRow({
  row,
  state,
  maxTheory,
  maxPractical,
  hasPractical,
  onTheoryChange,
  onPracticalChange,
  onToggleAbsent,
}: RowProps) {
  const theoryNum = state.theory !== '' ? parseFloat(state.theory) : NaN;
  const practicalNum = state.practical !== '' ? parseFloat(state.practical) : NaN;

  const isTheoryInvalid =
    state.theory !== '' &&
    !state.isAbsent &&
    (isNaN(theoryNum) || theoryNum < 0 || theoryNum > maxTheory);

  const isPracticalInvalid =
    hasPractical &&
    state.practical !== '' &&
    !state.isAbsent &&
    (isNaN(practicalNum) || practicalNum < 0 || practicalNum > maxPractical);

  const obtained = state.isAbsent
    ? -1
    : (isNaN(theoryNum) ? 0 : theoryNum) + (hasPractical && !isNaN(practicalNum) ? practicalNum : 0);
  const maxForGrade = hasPractical ? maxTheory + maxPractical : maxTheory;
  const { grade, color } = computeGrade(obtained, maxForGrade);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: VITANA_COLORS.border,
        backgroundColor: '#fff',
      }}
    >
      {/* Roll number */}
      <Text
        style={{
          width: 32,
          fontSize: 11,
          color: VITANA_COLORS.textSecondary,
          fontWeight: '500',
        }}
        numberOfLines={1}
      >
        {row.rollNumber ?? '—'}
      </Text>

      {/* Name */}
      <Text
        style={{
          flex: 1,
          fontSize: 13,
          color: VITANA_COLORS.text,
          fontWeight: '500',
          paddingRight: 8,
        }}
        numberOfLines={1}
      >
        {row.studentName}
      </Text>

      {/* Theory input */}
      <TextInput
        value={state.theory}
        onChangeText={onTheoryChange}
        keyboardType="decimal-pad"
        maxLength={4}
        editable={!state.isAbsent}
        style={{
          width: 52,
          height: 34,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 6,
          textAlign: 'center',
          fontSize: 13,
          fontWeight: '600',
          borderColor: isTheoryInvalid ? VITANA_COLORS.error : VITANA_COLORS.border,
          backgroundColor: isTheoryInvalid
            ? VITANA_COLORS.errorLight
            : state.isAbsent
            ? VITANA_COLORS.surface
            : '#fff',
          color: isTheoryInvalid ? VITANA_COLORS.error : VITANA_COLORS.text,
          opacity: state.isAbsent ? 0.4 : 1,
        }}
        placeholder={state.isAbsent ? 'AB' : '—'}
        placeholderTextColor={VITANA_COLORS.textSecondary}
      />

      {/* Practical input */}
      {hasPractical && (
        <TextInput
          value={state.practical}
          onChangeText={onPracticalChange}
          keyboardType="decimal-pad"
          maxLength={4}
          editable={!state.isAbsent}
          style={{
            width: 52,
            height: 34,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 6,
            textAlign: 'center',
            fontSize: 13,
            fontWeight: '600',
            marginLeft: 6,
            borderColor: isPracticalInvalid ? VITANA_COLORS.error : VITANA_COLORS.border,
            backgroundColor: isPracticalInvalid
              ? VITANA_COLORS.errorLight
              : state.isAbsent
              ? VITANA_COLORS.surface
              : '#fff',
            color: isPracticalInvalid ? VITANA_COLORS.error : VITANA_COLORS.text,
            opacity: state.isAbsent ? 0.4 : 1,
          }}
          placeholder={state.isAbsent ? 'AB' : '—'}
          placeholderTextColor={VITANA_COLORS.textSecondary}
        />
      )}

      {/* Grade badge */}
      <View style={{ width: 30, alignItems: 'center', marginLeft: 6 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color }}>{grade}</Text>
      </View>

      {/* Absent checkbox */}
      <TouchableOpacity
        onPress={onToggleAbsent}
        style={{ width: 30, alignItems: 'center' }}
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
  const maxTheory = sheet?.maxTheoryMarks ?? 100;
  const maxPractical = sheet?.maxPracticalMarks ?? 0;

  // Initialise marksMap from draft → existing sheet rows → defaults
  useEffect(() => {
    if (!sheet || initialised) return;

    void (async () => {
      const draft = await marksDraftService.loadDraft(
        examSetupId!,
        examSetupSubjectId!,
        '-',
      );

      if (draft && draft.marks.length > 0) {
        const map: MarksMap = {};
        draft.marks.forEach((m: MarksEntry) => {
          map[m.studentId] = {
            theory: m.theory !== null ? String(m.theory) : '',
            practical: m.practical !== null ? String(m.practical) : '',
            isAbsent: m.isAbsent,
          };
        });
        setMarksMap(map);
        setDraftLoadedAt(new Date(draft.lastModified).toLocaleTimeString('en-IN'));
      } else {
        const map: MarksMap = {};
        sheet.rows.forEach((r) => {
          map[r.studentId] = {
            theory: r.theoryMarks !== null ? String(r.theoryMarks) : '',
            practical: r.practicalMarks !== null ? String(r.practicalMarks) : '',
            isAbsent: r.isAbsent,
          };
        });
        setMarksMap(map);
      }

      setInitialised(true);
    })();
  }, [sheet, initialised, examSetupId, examSetupSubjectId]);

  // 30-second debounced auto-save
  const saveDraft = useCallback(async () => {
    if (!user || !sheet) return;
    const entries: MarksEntry[] = sheet.rows.map((r) => ({
      studentId: r.studentId,
      theory:
        marksMap[r.studentId]?.theory !== ''
          ? parseFloat(marksMap[r.studentId]?.theory ?? '0') || null
          : null,
      practical:
        hasPractical && marksMap[r.studentId]?.practical !== ''
          ? parseFloat(marksMap[r.studentId]?.practical ?? '0') || null
          : null,
      isAbsent: marksMap[r.studentId]?.isAbsent ?? false,
    }));
    await marksDraftService.saveDraft(
      examSetupId!,
      examSetupSubjectId!,
      '-',
      entries,
      user.id,
      user.schoolId,
    );
  }, [marksMap, sheet, examSetupId, examSetupSubjectId, user, hasPractical]);

  useEffect(() => {
    if (!initialised) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void saveDraft(); }, 30_000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [marksMap, initialised, saveDraft]);

  function updateTheory(studentId: string, value: string) {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], theory: value },
    }));
  }

  function updatePractical(studentId: string, value: string) {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], practical: value },
    }));
  }

  function toggleAbsent(studentId: string) {
    setMarksMap((prev) => {
      const current = prev[studentId];
      const nowAbsent = !current?.isAbsent;
      return {
        ...prev,
        [studentId]: {
          theory: nowAbsent ? '' : current?.theory ?? '',
          practical: nowAbsent ? '' : current?.practical ?? '',
          isAbsent: nowAbsent,
        },
      };
    });
  }

  async function handleSubmit() {
    if (!sheet || !user) return;

    // Validate all entries
    for (const row of sheet.rows) {
      const state = marksMap[row.studentId];
      if (state?.isAbsent) continue;

      if (state?.theory !== '') {
        const t = parseFloat(state?.theory ?? '');
        if (isNaN(t) || t < 0 || t > maxTheory) {
          Alert.alert(
            'Invalid Marks',
            `${row.studentName}: Theory marks must be 0–${maxTheory}`,
          );
          return;
        }
      }
      if (hasPractical && state?.practical !== '') {
        const p = parseFloat(state?.practical ?? '');
        if (isNaN(p) || p < 0 || p > maxPractical) {
          Alert.alert(
            'Invalid Marks',
            `${row.studentName}: Practical marks must be 0–${maxPractical}`,
          );
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
              ? parseFloat(state!.practical)
              : null,
        };
      });

      const payload: BulkMarksEntryPayload = {
        examSetupId: examSetupId!,
        examSetupSubjectId: examSetupSubjectId!,
        entries,
      };

      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        await teacherApi.saveBulkMarks(
          examSetupId!,
          examSetupSubjectId!,
          payload,
          idempotencyKey,
        );
        await marksDraftService.markSubmitted(examSetupId!, examSetupSubjectId!, '-');
        router.replace(
          `/(teacher)/marks/${examSetupId}/performance?examSetupSubjectId=${examSetupSubjectId}` as never,
        );
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
          <Text style={{ fontSize: 14, color: VITANA_COLORS.textSecondary }}>
            Loading marks sheet…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (sheet.isLocked) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: VITANA_COLORS.surface }} edges={['top']}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: '#fff',
            borderBottomWidth: 1,
            borderBottomColor: VITANA_COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text }}>
            {sheet.subjectName}
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
          <Feather name="lock" size={48} color={VITANA_COLORS.border} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: VITANA_COLORS.text }}>
            Marks Locked
          </Text>
          <Text
            style={{ fontSize: 14, color: VITANA_COLORS.textSecondary, textAlign: 'center' }}
          >
            This subject&apos;s marks have been locked. Contact the admin to unlock for editing.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: VITANA_COLORS.surface }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 10,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: VITANA_COLORS.border,
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
                backgroundColor: VITANA_COLORS.successLight,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 11, color: VITANA_COLORS.success, fontWeight: '600' }}>
                Draft {draftLoadedAt}
              </Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
            Max: {maxTheory}
            {hasPractical ? ` Th · ${maxPractical} Pr` : ' marks'}
            {' · Pass: '}{sheet.passingMarks}
          </Text>
          <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
            {filledCount}/{totalCount} filled
          </Text>
        </View>
      </View>

      {/* Column headers */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 6,
          backgroundColor: VITANA_COLORS.surface,
          borderBottomWidth: 1,
          borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <Text
          style={{
            width: 32,
            fontSize: 11,
            fontWeight: '700',
            color: VITANA_COLORS.textSecondary,
            textTransform: 'uppercase',
          }}
        >
          Roll
        </Text>
        <Text
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: '700',
            color: VITANA_COLORS.textSecondary,
            textTransform: 'uppercase',
          }}
        >
          Student
        </Text>
        <Text
          style={{
            width: 52,
            fontSize: 11,
            fontWeight: '700',
            color: VITANA_COLORS.textSecondary,
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          Th
        </Text>
        {hasPractical && (
          <Text
            style={{
              width: 52,
              fontSize: 11,
              fontWeight: '700',
              color: VITANA_COLORS.textSecondary,
              textTransform: 'uppercase',
              textAlign: 'center',
              marginLeft: 6,
            }}
          >
            Pr
          </Text>
        )}
        <Text
          style={{
            width: 30,
            fontSize: 11,
            fontWeight: '700',
            color: VITANA_COLORS.textSecondary,
            textTransform: 'uppercase',
            textAlign: 'center',
            marginLeft: 6,
          }}
        >
          Gr
        </Text>
        <Text
          style={{
            width: 30,
            fontSize: 11,
            fontWeight: '700',
            color: VITANA_COLORS.textSecondary,
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          AB
        </Text>
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
              state={marksMap[item.studentId] ?? { theory: '', practical: '', isAbsent: false }}
              maxTheory={maxTheory}
              maxPractical={maxPractical}
              hasPractical={hasPractical}
              onTheoryChange={(v) => updateTheory(item.studentId, v)}
              onPracticalChange={(v) => updatePractical(item.studentId, v)}
              onToggleAbsent={() => toggleAbsent(item.studentId)}
            />
          )}
        />
      </KeyboardAvoidingView>

      {/* Submit footer */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: VITANA_COLORS.border,
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
