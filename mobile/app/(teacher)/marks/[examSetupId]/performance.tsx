import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi, type MarksEntrySheetDto } from '@/api/endpoints/teacher';
import { VITANA_COLORS } from '@/theme/tokens';

// ─── Grade colour map ─────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  A1: '#15803d',
  A2: '#16a34a',
  B1: '#2563eb',
  B2: '#3b82f6',
  C1: '#d97706',
  C2: '#f97316',
  D: '#dc2626',
  F: '#b91c1c',
  AB: VITANA_COLORS.textSecondary,
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: VITANA_COLORS.border,
        gap: 4,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: '800', color: color ?? VITANA_COLORS.primary }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: VITANA_COLORS.textSecondary, fontWeight: '600' }}>
        {label}
      </Text>
      {sub && <Text style={{ fontSize: 10, color: VITANA_COLORS.textSecondary }}>{sub}</Text>}
    </View>
  );
}

// ─── Grade bar ────────────────────────────────────────────────────────────────

function GradeBar({
  grade,
  count,
  total,
}: {
  grade: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const color = GRADE_COLORS[grade] ?? VITANA_COLORS.textSecondary;
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}
    >
      <Text
        style={{
          width: 28,
          fontSize: 12,
          fontWeight: '700',
          color,
          textAlign: 'right',
        }}
      >
        {grade}
      </Text>
      <View
        style={{
          flex: 1,
          height: 14,
          backgroundColor: VITANA_COLORS.surface,
          borderRadius: 7,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 14,
            width: `${pct}%`,
            backgroundColor: color,
            borderRadius: 7,
            opacity: 0.85,
          }}
        />
      </View>
      <Text
        style={{
          width: 28,
          fontSize: 12,
          color: VITANA_COLORS.textSecondary,
          fontWeight: '600',
        }}
      >
        {count}
      </Text>
    </View>
  );
}

// ─── Compute stats ────────────────────────────────────────────────────────────

function usePerformanceStats(sheet: MarksEntrySheetDto | undefined) {
  return useMemo(() => {
    if (!sheet) return null;

    const present = sheet.rows.filter((r) => !r.isAbsent);
    const absent = sheet.rows.filter((r) => r.isAbsent).length;

    if (present.length === 0)
      return {
        average: 0,
        highest: 0,
        lowest: 0,
        passCount: 0,
        failCount: 0,
        absentCount: absent,
        total: sheet.rows.length,
        passRate: 0,
        gradeDistribution: {} as Record<string, number>,
      };

    const percentages = present.map((r) => {
      const marks = r.obtainedMarks ?? 0;
      const max = sheet.maxTotalMarks > 0 ? sheet.maxTotalMarks : sheet.maxTheoryMarks;
      return max > 0 ? (marks / max) * 100 : 0;
    });

    const average = percentages.reduce((a, b) => a + b, 0) / percentages.length;
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    const passCount = present.filter((r) => r.isPass).length;
    const failCount = present.length - passCount;

    const gradeDistribution: Record<string, number> = {};
    present.forEach((r) => {
      const g = r.grade ?? 'F';
      gradeDistribution[g] = (gradeDistribution[g] ?? 0) + 1;
    });

    return {
      average: Math.round(average * 10) / 10,
      highest: Math.round(highest * 10) / 10,
      lowest: Math.round(lowest * 10) / 10,
      passCount,
      failCount,
      absentCount: absent,
      total: sheet.rows.length,
      passRate: Math.round((passCount / present.length) * 100),
      gradeDistribution,
    };
  }, [sheet]);
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MarksPerformance() {
  const { examSetupId, examSetupSubjectId } = useLocalSearchParams<{
    examSetupId: string;
    examSetupSubjectId?: string;
  }>();

  const { data: sheet, isLoading } = useQuery<MarksEntrySheetDto>({
    queryKey: ['marks-sheet', examSetupId, examSetupSubjectId],
    queryFn: () =>
      teacherApi.getMarksSheet(examSetupId!, examSetupSubjectId!),
    enabled: !!examSetupId && !!examSetupSubjectId,
    staleTime: 1 * 60 * 1000,
  });

  const stats = usePerformanceStats(sheet);
  const gradeOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D', 'F', 'AB'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: VITANA_COLORS.surface }} edges={['top']}>
      {/* Header */}
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
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text }}>
            Class Performance
          </Text>
          {sheet && (
            <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
              {sheet.subjectName} · {sheet.examName}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => router.replace('/(teacher)/marks' as never)}
          style={{
            backgroundColor: VITANA_COLORS.primary,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Done</Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={VITANA_COLORS.primary} />
          <Text style={{ fontSize: 14, color: VITANA_COLORS.textSecondary }}>
            Loading results…
          </Text>
        </View>
      )}

      {!isLoading && stats && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
          {/* Submitted banner */}
          <View
            style={{
              backgroundColor: VITANA_COLORS.successLight,
              borderRadius: 12,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderWidth: 1,
              borderColor: '#bbf7d0',
            }}
          >
            <Feather name="check-circle" size={20} color={VITANA_COLORS.success} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#15803d' }}>
                Marks Submitted
              </Text>
              <Text style={{ fontSize: 12, color: '#166534' }}>
                Results are now available for finalization.
              </Text>
            </View>
          </View>

          {/* Summary stats row */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard
              label="Average"
              value={`${stats.average}%`}
              color={VITANA_COLORS.primary}
            />
            <StatCard
              label="Pass Rate"
              value={`${stats.passRate}%`}
              sub={`${stats.passCount}/${stats.total - stats.absentCount} students`}
              color={VITANA_COLORS.success}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard
              label="Highest"
              value={`${stats.highest}%`}
              color="#15803d"
            />
            <StatCard
              label="Lowest"
              value={`${stats.lowest}%`}
              color={stats.lowest < 33 ? VITANA_COLORS.error : VITANA_COLORS.warning}
            />
            <StatCard
              label="Absent"
              value={String(stats.absentCount)}
              color={VITANA_COLORS.textSecondary}
            />
          </View>

          {/* Grade distribution */}
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: VITANA_COLORS.border,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: VITANA_COLORS.text,
                marginBottom: 14,
              }}
            >
              Grade Distribution
            </Text>
            {gradeOrder
              .filter((g) => (stats.gradeDistribution[g] ?? 0) > 0)
              .map((g) => (
                <GradeBar
                  key={g}
                  grade={g}
                  count={stats.gradeDistribution[g] ?? 0}
                  total={stats.total - stats.absentCount}
                />
              ))}
            {Object.keys(stats.gradeDistribution).length === 0 && (
              <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary }}>
                Grade data will appear after finalization.
              </Text>
            )}
          </View>

          {/* Pass/Fail summary */}
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: VITANA_COLORS.border,
              flexDirection: 'row',
              gap: 16,
            }}
          >
            <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: VITANA_COLORS.success }}>
                {stats.passCount}
              </Text>
              <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, fontWeight: '600' }}>
                Passed
              </Text>
            </View>
            <View
              style={{
                width: 1,
                backgroundColor: VITANA_COLORS.border,
                marginVertical: 4,
              }}
            />
            <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: VITANA_COLORS.error }}>
                {stats.failCount}
              </Text>
              <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, fontWeight: '600' }}>
                Failed
              </Text>
            </View>
            <View
              style={{
                width: 1,
                backgroundColor: VITANA_COLORS.border,
                marginVertical: 4,
              }}
            />
            <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '800',
                  color: VITANA_COLORS.textSecondary,
                }}
              >
                {stats.absentCount}
              </Text>
              <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, fontWeight: '600' }}>
                Absent
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
