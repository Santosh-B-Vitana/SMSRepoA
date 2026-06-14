import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi, type ExamSetupBasicDto, type MarksEntrySheetDto } from '@/api/endpoints/teacher';
import { VITANA_COLORS } from '@/theme/tokens';

interface SubjectCardProps {
  examSetupId: string;
  subjectId: string;
}

function SubjectCard({ examSetupId, subjectId }: SubjectCardProps) {
  const { data: sheet, isLoading } = useQuery<MarksEntrySheetDto>({
    queryKey: ['marks-sheet', examSetupId, subjectId],
    queryFn: () => teacherApi.getMarksSheet(examSetupId, subjectId),
    staleTime: 2 * 60 * 1000,
  });

  const isLocked = sheet?.isLocked ?? false;
  const total = sheet?.rows.length ?? 0;

  // A row is "filled" when a marks record has been created (marksEntryId is set) or the student is marked absent.
  // Using marksEntryId (not obtainedMarks) correctly identifies 0-marks submissions as filled too.
  const filled = sheet
    ? sheet.rows.filter((r) => r.marksEntryId !== null || r.isAbsent).length
    : 0;

  // Show "Done" once every student has a marks record, regardless of the backend status string.
  // The backend keeps status as "marks_entry" even after saves; the filled count is more accurate.
  const allFilled = total > 0 && filled === total;
  const isPendingEntry = !sheet || total === 0 || !allFilled || sheet.status.toLowerCase() === 'draft';

  return (
    <TouchableOpacity
      onPress={() => {
        if (!isLocked) {
          router.push(`/(teacher)/marks/${examSetupId}/${subjectId}` as never);
        }
      }}
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: isLocked ? VITANA_COLORS.border : VITANA_COLORS.primary + '33',
        marginBottom: 10,
        opacity: isLocked ? 0.7 : 1,
        gap: 8,
      }}
      activeOpacity={0.75}
    >
      {isLoading ? (
        <View style={{ height: 60, justifyContent: 'center' }}>
          <View
            style={{
              height: 14,
              width: '60%',
              backgroundColor: VITANA_COLORS.border,
              borderRadius: 6,
              marginBottom: 8,
            }}
          />
          <View
            style={{
              height: 12,
              width: '40%',
              backgroundColor: VITANA_COLORS.border,
              borderRadius: 6,
            }}
          />
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text
              style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text, flex: 1 }}
              numberOfLines={1}
            >
              {sheet?.subjectName ?? subjectId}
            </Text>
            {isLocked ? (
              <View
                style={{
                  backgroundColor: '#f3e8ff',
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Feather name="lock" size={11} color="#7c3aed" />
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#7c3aed' }}>Locked</Text>
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: isPendingEntry ? '#fef3c7' : '#dcfce7',
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: isPendingEntry ? '#d97706' : '#16a34a',
                  }}
                >
                  {isPendingEntry ? 'Pending' : 'Done'}
                </Text>
              </View>
            )}
          </View>

          {sheet && (
            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
                  Theory: {sheet.maxTheoryMarks}
                  {sheet.maxPracticalMarks > 0 ? ` · Practical: ${sheet.maxPracticalMarks}` : ''}
                </Text>
              </View>
              {total > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View
                    style={{
                      flex: 1,
                      height: 4,
                      backgroundColor: VITANA_COLORS.border,
                      borderRadius: 2,
                    }}
                  >
                    <View
                      style={{
                        height: 4,
                        width: `${(filled / total) * 100}%`,
                        backgroundColor: filled === total ? VITANA_COLORS.success : VITANA_COLORS.primary,
                        borderRadius: 2,
                      }}
                    />
                  </View>
                  <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
                    {filled}/{total}
                  </Text>
                </View>
              )}
            </View>
          )}

          {!isLocked && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 13, color: VITANA_COLORS.primary, fontWeight: '600' }}>
                  {isPendingEntry ? 'Enter Marks' : 'View / Edit'}
                </Text>
                <Feather name="chevron-right" size={14} color={VITANA_COLORS.primary} />
              </View>
              {allFilled && (
                <TouchableOpacity
                  onPress={() => {
                    router.push({
                      pathname: '/(teacher)/marks/[examSetupId]/performance' as never,
                      params: { examSetupId, examSetupSubjectId: subjectId },
                    } as never);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: '#f3e8ff',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Feather name="bar-chart-2" size={13} color="#7c3aed" />
                  <Text style={{ fontSize: 12, color: '#7c3aed', fontWeight: '600' }}>
                    Performance
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

export default function ExamSubjectSelection() {
  const { examSetupId } = useLocalSearchParams<{ examSetupId: string }>();

  const { data: exams, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-exam-assignments'],
    queryFn: () => teacherApi.getMyExamAssignments(),
    staleTime: 5 * 60 * 1000,
  });

  const exam = exams?.find((e: ExamSetupBasicDto) => e.id === examSetupId);

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
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text }}
            numberOfLines={1}
          >
            {exam?.name ?? 'Select Subject'}
          </Text>
          {exam && (
            <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
              {exam.className} · {exam.academicYear}
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading && (
          <View style={{ gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  height: 100,
                  backgroundColor: VITANA_COLORS.border,
                  borderRadius: 12,
                  opacity: 0.5,
                }}
              />
            ))}
          </View>
        )}

        {!isLoading && !exam && (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
            <Feather name="alert-circle" size={48} color={VITANA_COLORS.border} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: VITANA_COLORS.text }}>
              Exam not found
            </Text>
          </View>
        )}

        {exam && exam.myAssignedSubjectIds.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
            <Feather name="book-open" size={48} color={VITANA_COLORS.border} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: VITANA_COLORS.text }}>
              No subjects assigned
            </Text>
          </View>
        )}

        {exam &&
          exam.myAssignedSubjectIds.map((subjectId: string) => (
            <SubjectCard
              key={subjectId}
              examSetupId={examSetupId!}
              subjectId={subjectId}
            />
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}
