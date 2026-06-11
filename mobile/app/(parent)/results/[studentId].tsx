import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Feather } from '@expo/vector-icons';
import { parentApi } from '@/api/endpoints/parent';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonLoader, SkeletonCard } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/common/EmptyState';
import { VITANA_COLORS } from '@/theme/tokens';
import type { ExamResult } from '@vitana/shared-types';

const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  'A+': { bg: '#dcfce7', text: '#16a34a' },
  A: { bg: '#dcfce7', text: '#16a34a' },
  'B+': { bg: '#dbeafe', text: '#1d4ed8' },
  B: { bg: '#dbeafe', text: '#1d4ed8' },
  'C+': { bg: '#fef3c7', text: '#d97706' },
  C: { bg: '#fef3c7', text: '#d97706' },
  D: { bg: '#fde68a', text: '#92400e' },
  F: { bg: '#fee2e2', text: '#dc2626' },
};

function GradeBadge({ grade }: { grade: string }) {
  const colors = GRADE_COLORS[grade] ?? { bg: '#f3f4f6', text: '#6b7280' };
  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{grade}</Text>
    </View>
  );
}

// Group results by exam name
function groupByExam(results: ExamResult[]): Record<string, ExamResult[]> {
  return results.reduce<Record<string, ExamResult[]>>((acc, r) => {
    const key = `${r.examId}|${r.examName}`;
    acc[key] = [...(acc[key] ?? []), r];
    return acc;
  }, {});
}

export default function ExamResults() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const { primaryColor } = useSchoolTheme();

  const {
    data: results,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['exam-results', studentId],
    queryFn: () => parentApi.getExamResults(studentId!),
    enabled: !!studentId,
    staleTime: 15 * 60 * 1000,
  });

  const { data: reportCard } = useQuery({
    queryKey: ['report-card', studentId],
    queryFn: () => parentApi.getReportCard(studentId!),
    enabled: !!studentId,
    staleTime: 30 * 60 * 1000,
  });

  async function openReportCard() {
    if (reportCard?.id) {
      await WebBrowser.openBrowserAsync(
        `${process.env.EXPO_PUBLIC_API_BASE_URL ?? ''}/examinations/report-cards/${studentId}/download`,
      );
    }
  }

  const grouped = results ? groupByExam(results) : {};
  const examEntries = Object.entries(grouped);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}>
          Exam Results
        </Text>
        {reportCard && (
          <TouchableOpacity onPress={openReportCard} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="download" size={16} color={primaryColor} />
              <Text style={{ fontSize: 13, color: primaryColor, fontWeight: '500' }}>Report Card</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={{ padding: 16, paddingBottom: 32, gap: 16 }}>
          {isLoading ? (
            <>
              <SkeletonLoader height={24} width="50%" />
              <SkeletonCard lines={4} />
              <SkeletonCard lines={4} />
            </>
          ) : examEntries.length === 0 ? (
            <EmptyState
              icon="award"
              title="No results published"
              subtitle="Exam results will appear here once published by the school."
            />
          ) : (
            examEntries.map(([key, subjects]) => {
              const examName = key.split('|')[1] ?? 'Exam';
              const totalObtained = subjects.reduce((s, r) => s + r.marksObtained, 0);
              const totalMax = subjects.reduce((s, r) => s + r.maxMarks, 0);
              const overallPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
              const overallGrade = subjects[0]?.grade ?? '—';

              return (
                <View
                  key={key}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: VITANA_COLORS.border,
                  }}
                >
                  {/* Exam header */}
                  <View
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      backgroundColor: '#f8fafc',
                      borderBottomWidth: 1,
                      borderBottomColor: VITANA_COLORS.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>
                        {examName}
                      </Text>
                      <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
                        {totalObtained}/{totalMax} · {overallPct.toFixed(1)}%
                      </Text>
                    </View>
                    <GradeBadge grade={overallGrade} />
                  </View>

                  {/* Subject rows */}
                  {subjects.map((result, idx) => (
                    <View
                      key={result.id}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderBottomWidth: idx < subjects.length - 1 ? 1 : 0,
                        borderBottomColor: VITANA_COLORS.border,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text }}>
                          {result.subjectName}
                        </Text>
                        <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
                          {result.marksObtained} / {result.maxMarks} marks
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <GradeBadge grade={result.grade} />
                        <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
                          {result.percentage.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
