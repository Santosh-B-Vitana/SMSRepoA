import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi, type SubmissionDto } from '@/api/endpoints/teacher';
import { VITANA_COLORS } from '@/theme/tokens';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  submitted: { label: 'Submitted', bg: '#dbeafe', text: '#2563eb', icon: 'upload' },
  graded: { label: 'Graded', bg: '#dcfce7', text: '#16a34a', icon: 'check-circle' },
  pending: { label: 'Not Submitted', bg: VITANA_COLORS.surface, text: VITANA_COLORS.textSecondary, icon: 'clock' },
  late: { label: 'Late', bg: VITANA_COLORS.warningLight, text: VITANA_COLORS.warning, icon: 'alert-circle' },
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status.toLowerCase()] ?? {
      label: status,
      bg: VITANA_COLORS.surface,
      text: VITANA_COLORS.textSecondary,
      icon: 'circle',
    }
  );
}

function SubmissionCard({
  submission,
  assignmentId,
}: {
  submission: SubmissionDto;
  assignmentId: string;
}) {
  const config = getStatusConfig(submission.status);
  const canGrade =
    submission.status.toLowerCase() === 'submitted' ||
    submission.status.toLowerCase() === 'late';
  const isGraded = submission.status.toLowerCase() === 'graded';

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: canGrade ? VITANA_COLORS.warning + '55' : VITANA_COLORS.border,
        marginBottom: 8,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text, flex: 1 }}>
          {submission.studentName}
        </Text>
        <View
          style={{
            backgroundColor: config.bg,
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 3,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Feather name={config.icon as any} size={11} color={config.text} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: config.text }}>
            {config.label}
          </Text>
        </View>
      </View>

      {submission.submittedAt && (
        <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
          Submitted: {new Date(submission.submittedAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      )}

      {isGraded && submission.marksObtained !== null && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View
            style={{
              backgroundColor: VITANA_COLORS.successLight,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803d' }}>
              {submission.marksObtained} marks
            </Text>
          </View>
          {submission.feedback && (
            <Text
              style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, flex: 1 }}
              numberOfLines={1}
            >
              &quot;{submission.feedback}&quot;
            </Text>
          )}
        </View>
      )}

      {(canGrade || isGraded) && (
        <TouchableOpacity
          onPress={() =>
            router.push(`/(teacher)/assignments/${assignmentId}/grade/${submission.id}` as never)
          }
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingTop: 2,
          }}
        >
          <Feather
            name={isGraded ? 'edit-2' : 'award'}
            size={14}
            color={VITANA_COLORS.primary}
          />
          <Text style={{ fontSize: 13, fontWeight: '600', color: VITANA_COLORS.primary }}>
            {isGraded ? 'Edit Grade' : 'Grade Submission'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function SubmissionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['submissions', id],
    queryFn: () => teacherApi.getSubmissions(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  const submissions = data ?? [];
  const gradedCount = submissions.filter(
    (s: SubmissionDto) => s.status.toLowerCase() === 'graded',
  ).length;
  const pendingCount = submissions.filter(
    (s: SubmissionDto) =>
      s.status.toLowerCase() === 'submitted' || s.status.toLowerCase() === 'late',
  ).length;

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
        <Text style={{ fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text, flex: 1 }}>
          Submissions
        </Text>
        {!isLoading && (
          <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary }}>
            {gradedCount}/{submissions.length} graded
          </Text>
        )}
      </View>

      {/* Summary bar */}
      {!isLoading && submissions.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#fff',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: VITANA_COLORS.border,
            gap: 20,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: VITANA_COLORS.warning }}
            />
            <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
              {pendingCount} to grade
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: VITANA_COLORS.success }}
            />
            <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
              {gradedCount} graded
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: VITANA_COLORS.border }}
            />
            <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
              {submissions.length - gradedCount - pendingCount} not submitted
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading && (
          <View style={{ gap: 8 }}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={{
                  height: 80,
                  backgroundColor: VITANA_COLORS.border,
                  borderRadius: 12,
                  opacity: 0.5,
                }}
              />
            ))}
          </View>
        )}

        {!isLoading && submissions.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
            <Feather name="inbox" size={48} color={VITANA_COLORS.border} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: VITANA_COLORS.text }}>
              No submissions yet
            </Text>
            <Text style={{ fontSize: 14, color: VITANA_COLORS.textSecondary, textAlign: 'center' }}>
              Students haven&apos;t submitted anything for this assignment.
            </Text>
          </View>
        )}

        {/* Pending grading first */}
        {submissions
          .filter(
            (s: SubmissionDto) =>
              s.status.toLowerCase() === 'submitted' || s.status.toLowerCase() === 'late',
          )
          .map((s: SubmissionDto) => (
            <SubmissionCard key={s.id} submission={s} assignmentId={id!} />
          ))}

        {/* Then graded */}
        {submissions
          .filter((s: SubmissionDto) => s.status.toLowerCase() === 'graded')
          .map((s: SubmissionDto) => (
            <SubmissionCard key={s.id} submission={s} assignmentId={id!} />
          ))}

        {/* Then not submitted */}
        {submissions
          .filter(
            (s: SubmissionDto) =>
              s.status.toLowerCase() !== 'submitted' &&
              s.status.toLowerCase() !== 'late' &&
              s.status.toLowerCase() !== 'graded',
          )
          .map((s: SubmissionDto) => (
            <SubmissionCard key={s.id} submission={s} assignmentId={id!} />
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}
