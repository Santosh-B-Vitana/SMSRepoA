import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { studentApi } from '@/api/endpoints/student';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/common/EmptyState';
import { VITANA_COLORS } from '@/theme/tokens';

function gradeColor(grade: string): { bg: string; text: string } {
  if (['A+', 'A'].includes(grade)) return { bg: '#dcfce7', text: '#16a34a' };
  if (grade === 'B') return { bg: '#dbeafe', text: '#2563eb' };
  if (grade === 'C') return { bg: '#fef3c7', text: '#d97706' };
  return { bg: '#fee2e2', text: '#dc2626' };
}

export default function ExamResultsList() {
  const { primaryColor } = useSchoolTheme();

  const { data: results, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['student-results'],
    queryFn: studentApi.getExamResults,
    staleTime: 10 * 60 * 1000,
  });

  const { data: reportCards } = useQuery({
    queryKey: ['student-report-cards'],
    queryFn: studentApi.getReportCards,
    staleTime: 30 * 60 * 1000,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}>
          Exam Results
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={{ padding: 16, gap: 10 }}>
          {/* Report cards section */}
          {(reportCards?.length ?? 0) > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: VITANA_COLORS.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Report Cards
              </Text>
              {reportCards!.map((rc) => (
                <TouchableOpacity
                  key={rc.id}
                  onPress={() => router.push({ pathname: '/(student)/results/report-card/[id]', params: { id: rc.id } })}
                  style={{
                    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
                    borderWidth: 1, borderColor: VITANA_COLORS.border,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ backgroundColor: primaryColor + '15', borderRadius: 10, padding: 8 }}>
                      <Feather name="file-text" size={18} color={primaryColor} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text }}>
                        {rc.examName} — Report Card
                      </Text>
                      <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
                        {rc.generatedAt.split('T')[0]}
                      </Text>
                    </View>
                  </View>
                  <Feather name="external-link" size={16} color={VITANA_COLORS.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Results section */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: VITANA_COLORS.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Exam Results
          </Text>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonLoader key={i} height={80} borderRadius={12} />)
          ) : (results?.length ?? 0) === 0 ? (
            <EmptyState icon="award" title="No results yet" subtitle="Your exam results will appear here once published." />
          ) : (
            results!.map((result) => {
              const colors = gradeColor(result.grade ?? 'F');
              return (
                <TouchableOpacity
                  key={result.id}
                  onPress={() => router.push({ pathname: '/(student)/results/[examId]', params: { examId: result.id } })}
                  style={{
                    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
                    borderWidth: 1, borderColor: VITANA_COLORS.border,
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }} numberOfLines={1}>
                        {result.examName}
                      </Text>
                      <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 4 }}>
                        {result.percentage?.toFixed(1)}% · {result.marksObtained}/{result.maxMarks} marks
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <View style={{ backgroundColor: colors.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                          {result.grade ?? '—'}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={VITANA_COLORS.textSecondary} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
