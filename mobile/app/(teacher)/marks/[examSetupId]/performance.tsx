import { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi, type MarksEntrySheetDto } from '@/api/endpoints/teacher';
import { VITANA_COLORS, VITANA_SHADOWS } from '@/theme/tokens';
import { useSchoolTheme } from '@/theme/useSchoolTheme';

// ─── Grade helpers ────────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  A1: '#15803d', A2: '#16a34a', B1: '#2563eb', B2: '#3b82f6',
  C1: '#d97706', C2: '#f97316', D: '#dc2626', F: '#b91c1c',
  AB: VITANA_COLORS.textSecondary,
};

const GRADE_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D', 'F', 'AB'];

function computeGrade(obtained: number, maxMarks: number): string {
  if (obtained < 0) return 'AB';
  if (maxMarks <= 0) return '—';
  const pct = (obtained / maxMarks) * 100;
  if (pct >= 91) return 'A1';
  if (pct >= 81) return 'A2';
  if (pct >= 71) return 'B1';
  if (pct >= 61) return 'B2';
  if (pct >= 51) return 'C1';
  if (pct >= 41) return 'C2';
  if (pct >= 33) return 'D';
  return 'F';
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color, style,
}: {
  label: string; value: string; sub?: string; color?: string; style?: object;
}) {
  return (
    <View style={[st.statCard, VITANA_SHADOWS.sm, style]}>
      <Text style={[st.statValue, { color: color ?? VITANA_COLORS.primary }]}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
      {sub ? <Text style={st.statSub}>{sub}</Text> : null}
    </View>
  );
}

// ─── Grade distribution bar ───────────────────────────────────────────────────

function GradeBar({ grade, count, total }: { grade: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const color = GRADE_COLORS[grade] ?? VITANA_COLORS.textSecondary;
  return (
    <View style={st.gradeBarRow}>
      <Text style={[st.gradeLabel, { color }]}>{grade}</Text>
      <View style={st.gradeTrack}>
        <View style={[st.gradeFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={st.gradeCount}>{count}</Text>
    </View>
  );
}

// ─── Performance stats hook ───────────────────────────────────────────────────

function usePerformanceStats(sheet: MarksEntrySheetDto | undefined) {
  return useMemo(() => {
    if (!sheet) return null;

    const maxTotal = sheet.maxTotalMarks > 0 ? sheet.maxTotalMarks : sheet.maxTheoryMarks;
    const present  = sheet.rows.filter((r) => !r.isAbsent);
    const absentCount = sheet.rows.filter((r) => r.isAbsent).length;

    const empty = {
      maxTotal, absentCount,
      total: sheet.rows.length,
      presentCount: 0,
      passCount: 0, failCount: 0, passRate: 0,
      avgPct: 0, avgMarks: 0,
      highestPct: 0, lowestPct: 0,
      highestMarks: 0, lowestMarks: 0,
      gradeDistribution: {} as Record<string, number>,
      isFinalized: false,
    };

    if (present.length === 0) return empty;

    const marksArr = present.map((r) => r.obtainedMarks ?? 0);
    const pctArr   = marksArr.map((m) => maxTotal > 0 ? (m / maxTotal) * 100 : 0);

    const avgPct     = pctArr.reduce((a, b) => a + b, 0) / pctArr.length;
    const highestPct = Math.max(...pctArr);
    const lowestPct  = Math.min(...pctArr);
    const highestMarks = Math.max(...marksArr);
    const lowestMarks  = Math.min(...marksArr);
    const avgMarks     = marksArr.reduce((a, b) => a + b, 0) / marksArr.length;

    // Compute pass/fail directly from marks — isPass is null until finalization
    const passCount = present.filter(
      (r) => (r.obtainedMarks ?? 0) >= sheet.passingMarks,
    ).length;
    const failCount = present.length - passCount;
    const passRate  = Math.round((passCount / present.length) * 100);

    // Grade distribution — use server grade if finalized, else compute client-side
    const isFinalized = present.some((r) => r.grade !== null);
    const gradeDistribution: Record<string, number> = {};
    present.forEach((r) => {
      const g = r.grade ?? computeGrade(r.obtainedMarks ?? 0, maxTotal);
      gradeDistribution[g] = (gradeDistribution[g] ?? 0) + 1;
    });

    return {
      maxTotal,
      total: sheet.rows.length,
      presentCount: present.length,
      absentCount,
      passCount,
      failCount,
      passRate,
      avgPct:    Math.round(avgPct    * 10) / 10,
      avgMarks:  Math.round(avgMarks  * 10) / 10,
      highestPct:    Math.round(highestPct    * 10) / 10,
      lowestPct:     Math.round(lowestPct     * 10) / 10,
      highestMarks,
      lowestMarks,
      gradeDistribution,
      isFinalized,
    };
  }, [sheet]);
}

// ─── Student scores mini-list ─────────────────────────────────────────────────

function StudentScoreRow({
  rank, name, roll, obtained, max, isAbsent, grade, passingMarks,
}: {
  rank: number; name: string; roll: string | null;
  obtained: number; max: number; isAbsent: boolean;
  grade: string | null; passingMarks: number;
}) {
  const pct  = max > 0 && !isAbsent ? Math.round((obtained / max) * 100) : 0;
  const grd  = grade ?? (isAbsent ? 'AB' : computeGrade(obtained, max));
  const color = GRADE_COLORS[grd] ?? VITANA_COLORS.textSecondary;
  const isPassing = !isAbsent && obtained >= passingMarks;

  return (
    <View style={[st.scoreRow, isAbsent && { backgroundColor: '#fef2f2' }]}>
      <Text style={st.scoreRank}>{rank}</Text>
      <View style={{ flex: 1 }}>
        <Text style={st.scoreName} numberOfLines={1}>{name}</Text>
        {roll ? <Text style={st.scoreRoll}>Roll {roll}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        {isAbsent ? (
          <Text style={{ fontSize: 12, color: VITANA_COLORS.error, fontWeight: '700' }}>Absent</Text>
        ) : (
          <>
            <Text style={{ fontSize: 14, fontWeight: '700', color }}>
              {obtained}/{max}
              <Text style={{ fontSize: 11, fontWeight: '400', color: VITANA_COLORS.textSecondary }}>
                {' '}({pct}%)
              </Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color }}>{grd}</Text>
              <View
                style={{
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  backgroundColor: isPassing ? '#dcfce7' : '#fee2e2',
                }}
              >
                <Text style={{
                  fontSize: 10, fontWeight: '700',
                  color: isPassing ? '#16a34a' : '#dc2626',
                }}>
                  {isPassing ? 'Pass' : 'Fail'}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MarksPerformance() {
  const { examSetupId, examSetupSubjectId } = useLocalSearchParams<{
    examSetupId: string;
    examSetupSubjectId?: string;
  }>();
  const { primaryColor } = useSchoolTheme();

  // Always fetch fresh data (staleTime 0) — cache was invalidated on submit
  const { data: sheet, isLoading } = useQuery<MarksEntrySheetDto>({
    queryKey: ['marks-sheet', examSetupId, examSetupSubjectId],
    queryFn: () => teacherApi.getMarksSheet(examSetupId!, examSetupSubjectId!),
    enabled: !!examSetupId && !!examSetupSubjectId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const stats = usePerformanceStats(sheet);

  // Sort students by obtained marks descending (absent last)
  const sortedRows = useMemo(() => {
    if (!sheet) return [];
    return [...sheet.rows].sort((a, b) => {
      if (a.isAbsent && !b.isAbsent) return 1;
      if (!a.isAbsent && b.isAbsent) return -1;
      return (b.obtainedMarks ?? 0) - (a.obtainedMarks ?? 0);
    });
  }, [sheet]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: VITANA_COLORS.surface }} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>Class Performance</Text>
          {sheet && (
            <Text style={st.headerSub}>{sheet.subjectName} · {sheet.examName}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => router.replace('/(teacher)/marks' as never)}
          style={[st.doneBtn, { backgroundColor: primaryColor ?? VITANA_COLORS.primary }]}
        >
          <Text style={st.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={primaryColor ?? VITANA_COLORS.primary} />
          <Text style={{ fontSize: 14, color: VITANA_COLORS.textSecondary }}>Loading results…</Text>
        </View>
      )}

      {!isLoading && stats && sheet && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}>

          {/* ── Submission success banner ─────────────────────── */}
          <View style={st.successBanner}>
            <Feather name="check-circle" size={20} color={VITANA_COLORS.success} />
            <View style={{ flex: 1 }}>
              <Text style={st.successTitle}>Marks Submitted</Text>
              <Text style={st.successSub}>
                {stats.isFinalized
                  ? 'Results finalized · Grades are official.'
                  : 'Awaiting admin finalization to publish grades to parents.'}
              </Text>
            </View>
          </View>

          {/* ── Exam info card ───────────────────────────────── */}
          <View style={st.infoCard}>
            <View style={st.infoRow}>
              <View style={st.infoItem}>
                <Text style={st.infoValue}>{stats.maxTotal}</Text>
                <Text style={st.infoLabel}>Max Marks</Text>
              </View>
              <View style={st.infoDivider} />
              <View style={st.infoItem}>
                <Text style={st.infoValue}>{sheet.passingMarks}</Text>
                <Text style={st.infoLabel}>Pass Marks</Text>
              </View>
              <View style={st.infoDivider} />
              <View style={st.infoItem}>
                <Text style={st.infoValue}>{stats.total}</Text>
                <Text style={st.infoLabel}>Students</Text>
              </View>
              <View style={st.infoDivider} />
              <View style={st.infoItem}>
                <Text style={st.infoValue}>{stats.presentCount}</Text>
                <Text style={st.infoLabel}>Present</Text>
              </View>
            </View>
            {(sheet.maxTheoryMarks > 0) && (
              <Text style={st.maxBreakdown}>
                {[
                  `Theory: ${sheet.maxTheoryMarks}`,
                  sheet.maxPracticalMarks > 0 && `Practical: ${sheet.maxPracticalMarks}`,
                  sheet.maxInternalMarks  > 0 && `Internal: ${sheet.maxInternalMarks}`,
                ].filter(Boolean).join('  ·  ')}
              </Text>
            )}
          </View>

          {/* ── Pass / Fail / Absent ─────────────────────────── */}
          <View style={st.pfRow}>
            <View style={st.pfCell}>
              <Text style={[st.pfCount, { color: VITANA_COLORS.success }]}>{stats.passCount}</Text>
              <Text style={st.pfLabel}>Passed</Text>
              <Text style={st.pfSub}>{stats.passRate}%</Text>
            </View>
            <View style={st.pfDivider} />
            <View style={st.pfCell}>
              <Text style={[st.pfCount, { color: VITANA_COLORS.error }]}>{stats.failCount}</Text>
              <Text style={st.pfLabel}>Failed</Text>
              <Text style={st.pfSub}>{100 - stats.passRate}%</Text>
            </View>
            <View style={st.pfDivider} />
            <View style={st.pfCell}>
              <Text style={[st.pfCount, { color: VITANA_COLORS.textSecondary }]}>{stats.absentCount}</Text>
              <Text style={st.pfLabel}>Absent</Text>
            </View>
          </View>

          {/* ── Key statistics ───────────────────────────────── */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard
              label="Class Average"
              value={`${stats.avgPct}%`}
              sub={`${stats.avgMarks}/${stats.maxTotal} marks`}
              color={primaryColor}
            />
            <StatCard
              label="Pass Rate"
              value={`${stats.passRate}%`}
              sub={`${stats.passCount} of ${stats.presentCount} present`}
              color={VITANA_COLORS.success}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard
              label="Highest Score"
              value={`${stats.highestMarks}/${stats.maxTotal}`}
              sub={`${stats.highestPct}%`}
              color="#15803d"
            />
            <StatCard
              label="Lowest Score"
              value={`${stats.lowestMarks}/${stats.maxTotal}`}
              sub={`${stats.lowestPct}%`}
              color={stats.lowestPct < 33 ? VITANA_COLORS.error : '#d97706'}
            />
          </View>

          {/* ── Grade distribution ───────────────────────────── */}
          <View style={st.card}>
            <View style={st.cardHeader}>
              <Text style={st.cardTitle}>Grade Distribution</Text>
              {!stats.isFinalized && (
                <View style={st.estimateBadge}>
                  <Text style={st.estimateText}>Estimated</Text>
                </View>
              )}
            </View>
            {GRADE_ORDER.filter((g) => (stats.gradeDistribution[g] ?? 0) > 0).map((g) => (
              <GradeBar
                key={g}
                grade={g}
                count={stats.gradeDistribution[g] ?? 0}
                total={stats.presentCount}
              />
            ))}
            {Object.keys(stats.gradeDistribution).length === 0 && (
              <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, textAlign: 'center', padding: 8 }}>
                No marks entered yet.
              </Text>
            )}
            {!stats.isFinalized && Object.keys(stats.gradeDistribution).length > 0 && (
              <Text style={st.estimateNote}>
                Grades shown are estimated from submitted marks. Official grades are assigned after the admin finalizes the exam.
              </Text>
            )}
          </View>

          {/* ── Student marks list ───────────────────────────── */}
          <View style={st.card}>
            <View style={[st.cardHeader, { marginBottom: 4 }]}>
              <Text style={st.cardTitle}>Student Scores</Text>
              <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary }}>
                Ranked by marks
              </Text>
            </View>
            {sortedRows.map((row, idx) => (
              <StudentScoreRow
                key={row.studentId}
                rank={row.isAbsent ? 0 : idx + 1}
                name={row.studentName}
                roll={row.rollNumber}
                obtained={row.obtainedMarks ?? 0}
                max={stats.maxTotal}
                isAbsent={row.isAbsent}
                grade={row.grade}
                passingMarks={sheet.passingMarks}
              />
            ))}
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  header: {
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
    flexDirection: 'row', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text, fontFamily: 'Inter' },
  headerSub: { fontSize: 12, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', marginTop: 1 },
  doneBtn: { borderRadius: 9, paddingHorizontal: 14, paddingVertical: 7 },
  doneBtnText: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: 'Inter' },

  successBanner: {
    backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  successTitle: { fontSize: 14, fontWeight: '700', color: '#15803d', fontFamily: 'Inter' },
  successSub: { fontSize: 12, color: '#166534', fontFamily: 'Inter', marginTop: 2 },

  infoCard: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: VITANA_COLORS.border,
    padding: 14,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  infoItem: { alignItems: 'center', gap: 2 },
  infoValue: { fontSize: 20, fontWeight: '800', color: VITANA_COLORS.text, fontFamily: 'Poppins' },
  infoLabel: { fontSize: 10, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', fontWeight: '600' },
  infoDivider: { width: 1, height: 36, backgroundColor: VITANA_COLORS.border },
  maxBreakdown: {
    fontSize: 11, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter',
    textAlign: 'center', marginTop: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: VITANA_COLORS.border,
  },

  pfRow: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: VITANA_COLORS.border,
    flexDirection: 'row', alignItems: 'center',
  },
  pfCell: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 2 },
  pfCount: { fontSize: 30, fontWeight: '800', fontFamily: 'Poppins' },
  pfLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary, fontWeight: '700', fontFamily: 'Inter' },
  pfSub: { fontSize: 10, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter' },
  pfDivider: { width: 1, height: 48, backgroundColor: VITANA_COLORS.border },

  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: VITANA_COLORS.border,
    padding: 14, gap: 2, alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800', fontFamily: 'Poppins' },
  statLabel: { fontSize: 10, color: VITANA_COLORS.textSecondary, fontWeight: '700', fontFamily: 'Inter', textTransform: 'uppercase' },
  statSub: { fontSize: 10, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter' },

  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: VITANA_COLORS.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: VITANA_COLORS.text, fontFamily: 'Inter' },

  gradeBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, marginBottom: 8 },
  gradeLabel: { width: 28, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  gradeTrack: {
    flex: 1, height: 14, backgroundColor: VITANA_COLORS.surface,
    borderRadius: 7, overflow: 'hidden',
  },
  gradeFill: { height: 14, borderRadius: 7, opacity: 0.85 },
  gradeCount: { width: 28, fontSize: 12, color: VITANA_COLORS.textSecondary, fontWeight: '600', textAlign: 'left' },

  estimateBadge: {
    backgroundColor: '#fef3c7', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  estimateText: { fontSize: 10, color: '#d97706', fontWeight: '700', fontFamily: 'Inter' },
  estimateNote: {
    fontSize: 11, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter',
    fontStyle: 'italic', paddingHorizontal: 14, paddingBottom: 12, marginTop: 4,
  },

  scoreRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
    gap: 10,
  },
  scoreRank: { width: 22, fontSize: 12, color: VITANA_COLORS.textSecondary, fontWeight: '700', textAlign: 'center' },
  scoreName: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.text, fontFamily: 'Inter' },
  scoreRoll: { fontSize: 10, color: VITANA_COLORS.textSecondary, fontFamily: 'Inter', marginTop: 1 },
});
