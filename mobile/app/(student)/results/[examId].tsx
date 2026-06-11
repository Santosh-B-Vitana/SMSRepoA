import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { studentApi } from '@/api/endpoints/student';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { VITANA_COLORS } from '@/theme/tokens';

function SubjectRow({ name, obtained, max, grade, isPass }: {
  name: string; obtained: number; max: number; grade: string; isPass: boolean;
}) {
  const percent = max > 0 ? ((obtained / max) * 100).toFixed(1) : '0.0';
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text }}>{name}</Text>
        <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
          {obtained}/{max} · {percent}%
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: VITANA_COLORS.text }}>{grade}</Text>
        <View
          style={{
            backgroundColor: isPass ? '#dcfce7' : '#fee2e2',
            borderRadius: 6, paddingHorizontal: 8, paddingVertical: 1,
          }}
        >
          <Text style={{ fontSize: 11, color: isPass ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
            {isPass ? 'Pass' : 'Fail'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function ExamResultDetail() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const { primaryColor } = useSchoolTheme();

  const { data: result, isLoading } = useQuery({
    queryKey: ['exam-result', examId],
    queryFn: () => studentApi.getExamResultDetail(examId!),
    enabled: !!examId,
  });

  const overallPercent = result && result.totalMarks > 0
    ? ((result.obtainedMarks / result.totalMarks) * 100).toFixed(1)
    : '—';

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
          Result Detail
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16, gap: 14 }}>
          {isLoading ? (
            <>
              <SkeletonLoader height={100} borderRadius={12} />
              <SkeletonLoader height={200} borderRadius={12} />
            </>
          ) : !result ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Feather name="alert-circle" size={32} color={VITANA_COLORS.textSecondary} />
              <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 14, marginTop: 8 }}>
                Result not found
              </Text>
            </View>
          ) : (
            <>
              {/* Overall summary card */}
              <View
                style={{
                  backgroundColor: primaryColor, borderRadius: 16, padding: 20, alignItems: 'center',
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 4 }}>
                  {result.examName}
                </Text>
                <Text style={{ color: '#fff', fontSize: 42, fontWeight: '800' }}>
                  {result.grade}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, marginTop: 4 }}>
                  {result.obtainedMarks}/{result.totalMarks} · {overallPercent}%
                </Text>
                {result.remarks && (
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                    {result.remarks}
                  </Text>
                )}
              </View>

              {/* Subject breakdown */}
              <View
                style={{
                  backgroundColor: '#fff', borderRadius: 12, padding: 16,
                  borderWidth: 1, borderColor: VITANA_COLORS.border,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text, marginBottom: 4 }}>
                  Subject Breakdown
                </Text>
                {(result.subjects ?? []).map((subject, i) => (
                  <SubjectRow
                    key={i}
                    name={subject.subjectName}
                    obtained={subject.obtainedMarks}
                    max={subject.maxMarks}
                    grade={subject.grade}
                    isPass={subject.isPass}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
