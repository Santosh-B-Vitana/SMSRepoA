import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi } from '@/api/endpoints/teacher';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentPerformance {
  studentId: string;
  studentName: string;
  rollNumber?: string | null;
  admissionNumber?: string | null;
  averagePercentage: number;
  grade: string;
  totalExams: number;
  rank?: number | null;
}

interface ClassPerformanceSummary {
  classId: string;
  className: string;
  totalStudents: number;
  averagePercentage: number;
  passPercentage: number;
  highestMarks: number;
  lowestMarks: number;
  gradeDistribution: Record<string, number>;
  students: StudentPerformance[];
}

// ─── Grade distribution bar ───────────────────────────────────────────────────

function GradeBar({ grade, count, total, primaryColor }: { grade: string; count: number; total: number; primaryColor: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const GRADE_COLORS: Record<string, string> = {
    'A1': '#15803d', 'A2': '#16a34a', 'B1': '#2563eb', 'B2': '#3b82f6',
    'C1': '#d97706', 'C2': '#f97316', 'D': '#dc2626', 'F': '#991b1b',
  };
  const color = GRADE_COLORS[grade] ?? primaryColor;
  return (
    <View style={styles.gradeBarRow}>
      <Text style={[styles.gradeLabel, { color }]}>{grade}</Text>
      <View style={styles.gradeTrack}>
        <View style={[styles.gradeFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={styles.gradeCount}>{count}</Text>
    </View>
  );
}

// ─── Student row ─────────────────────────────────────────────────────────────

function StudentPerfRow({ student, rank, primaryColor }: { student: StudentPerformance; rank: number; primaryColor: string }) {
  const pct = Math.round(student.averagePercentage);
  const color = pct >= 75 ? '#15803d' : pct >= 50 ? '#d97706' : '#dc2626';
  return (
    <View style={styles.studentRow}>
      <View style={[styles.rankBadge, { backgroundColor: `${primaryColor}15` }]}>
        <Text style={[styles.rankText, { color: primaryColor }]}>{rank}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.studentName}>{student.studentName}</Text>
        {student.rollNumber && <Text style={styles.studentMeta}>Roll: {student.rollNumber}</Text>}
      </View>
      <View style={styles.gradeChip}>
        <Text style={[styles.gradeChipText, { color }]}>{student.grade}</Text>
      </View>
      <Text style={[styles.pctText, { color }]}>{pct}%</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PerformanceScreen() {
  const { primaryColor } = useSchoolTheme();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['teacher-assignments-perf'],
    queryFn: teacherApi.getTeacherAssignments,
    staleTime: 10 * 60 * 1000,
  });

  const { data: performance, isLoading: perfLoading } = useQuery<ClassPerformanceSummary>({
    queryKey: ['class-performance', selectedClassId],
    queryFn: () =>
      (apiClient.get('/examinations/class-performance', {
        params: { classId: selectedClassId },
      }) as Promise<any>).then((r) => r?.data ?? r),
    enabled: !!selectedClassId,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = assignmentsLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Student Performance" />

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={primaryColor} size="large" /></View>
      ) : assignments.length === 0 ? (
        <EmptyState icon="bar-chart-2" title="No classes assigned" subtitle="You have no class assignments for performance analytics." />
      ) : (
        <>
          {/* Class selector */}
          <View style={styles.selectorWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {assignments.map((a) => (
                  <TouchableOpacity
                    key={a.classId}
                    onPress={() => setSelectedClassId(a.classId)}
                    style={[
                      styles.chip,
                      selectedClassId === a.classId && { backgroundColor: primaryColor, borderColor: primaryColor },
                    ]}
                  >
                    <Text style={[styles.chipText, selectedClassId === a.classId && { color: '#fff' }]}>
                      {a.className}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {!selectedClassId ? (
            <EmptyState icon="bar-chart-2" title="Select a class" subtitle="Choose a class above to view performance analytics." />
          ) : perfLoading ? (
            <View style={styles.center}><ActivityIndicator color={primaryColor} size="large" /></View>
          ) : !performance ? (
            <EmptyState icon="bar-chart-2" title="No data available" subtitle="No exam results recorded for this class yet." />
          ) : (
            <FlatList
              data={[...performance.students].sort((a, b) => b.averagePercentage - a.averagePercentage)}
              keyExtractor={(s) => s.studentId}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              ListHeaderComponent={
                <View style={{ gap: 12, marginBottom: 16 }}>
                  {/* KPI cards */}
                  <View style={styles.kpiRow}>
                    <KpiCard label="Average" value={`${Math.round(performance.averagePercentage)}%`} icon="trending-up" color={primaryColor} />
                    <KpiCard label="Pass Rate" value={`${Math.round(performance.passPercentage)}%`} icon="check-circle" color="#15803d" />
                    <KpiCard label="Highest" value={`${performance.highestMarks}%`} icon="award" color="#7c3aed" />
                    <KpiCard label="Students" value={`${performance.totalStudents}`} icon="users" color="#0891b2" />
                  </View>

                  {/* Grade distribution */}
                  <View style={styles.gradeCard}>
                    <Text style={styles.gradeCardTitle}>Grade Distribution</Text>
                    {Object.entries(performance.gradeDistribution)
                      .sort((a, b) => {
                        const order = ['A1','A2','B1','B2','C1','C2','D','F'];
                        return order.indexOf(a[0]) - order.indexOf(b[0]);
                      })
                      .map(([grade, count]) => (
                        <GradeBar
                          key={grade}
                          grade={grade}
                          count={count}
                          total={performance.totalStudents}
                          primaryColor={primaryColor}
                        />
                      ))}
                  </View>

                  <Text style={styles.listTitle}>Student Rankings</Text>
                </View>
              }
              renderItem={({ item, index }) => (
                <StudentPerfRow student={item} rank={index + 1} primaryColor={primaryColor} />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <View style={[styles.kpiCard, { borderTopColor: color }]}>
      <Feather name={icon} size={16} color={color} style={{ marginBottom: 4 }} />
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: VITANA_COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  selectorWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border },
  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: VITANA_COLORS.border, backgroundColor: '#fff',
  },
  chipText: { fontSize: 13, fontWeight: '500', color: VITANA_COLORS.textSecondary },

  kpiRow: { flexDirection: 'row', gap: 8 },
  kpiCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', borderTopWidth: 3, borderWidth: 1, borderColor: VITANA_COLORS.border,
  },
  kpiValue: { fontSize: 16, fontWeight: '700' },
  kpiLabel: { fontSize: 10, color: VITANA_COLORS.textSecondary, marginTop: 2, textAlign: 'center' },

  gradeCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: VITANA_COLORS.border, gap: 8,
  },
  gradeCardTitle: { fontSize: 13, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 4 },
  gradeBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gradeLabel: { width: 24, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  gradeTrack: { flex: 1, height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  gradeFill: { height: '100%', borderRadius: 3 },
  gradeCount: { width: 24, fontSize: 11, color: VITANA_COLORS.textSecondary, textAlign: 'right' },

  listTitle: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text },

  studentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12,
  },
  rankBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontWeight: '700' },
  studentName: { fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text },
  studentMeta: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 1 },
  gradeChip: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#f8fafc', borderRadius: 6 },
  gradeChipText: { fontSize: 12, fontWeight: '700' },
  pctText: { width: 36, fontSize: 13, fontWeight: '600', textAlign: 'right' },
});
