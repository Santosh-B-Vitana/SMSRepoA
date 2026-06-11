import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { studentApi } from '@/api/endpoints/student';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { VITANA_COLORS } from '@/theme/tokens';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending: { bg: '#fef3c7', text: '#d97706' },
  Submitted: { bg: '#dbeafe', text: '#2563eb' },
  Graded: { bg: '#dcfce7', text: '#16a34a' },
  Late: { bg: '#fee2e2', text: '#dc2626' },
  RevisionRequested: { bg: '#fce7f3', text: '#be185d' },
};

export default function AssignmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { primaryColor } = useSchoolTheme();

  const { data: assignment, isLoading } = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => studentApi.getAssignmentDetail(id!),
    enabled: !!id,
  });

  const statusColors = assignment
    ? (STATUS_COLORS[assignment.status] ?? { bg: '#f3f4f6', text: '#6b7280' })
    : { bg: '#f3f4f6', text: '#6b7280' };

  const dueDate = assignment?.dueDate ? assignment.dueDate.split('T')[0] : '';
  const isSubmittable = assignment &&
    ['Pending', 'Late', 'RevisionRequested'].includes(assignment.status);
  const isGraded = assignment?.status === 'Graded';

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
          Assignment
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16, gap: 14 }}>
          {isLoading ? (
            <>
              <SkeletonLoader height={120} borderRadius={12} />
              <SkeletonLoader height={200} borderRadius={12} />
            </>
          ) : !assignment ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Feather name="alert-circle" size={32} color={VITANA_COLORS.textSecondary} />
              <Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 14, marginTop: 8 }}>
                Assignment not found
              </Text>
            </View>
          ) : (
            <>
              {/* Header card */}
              <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: VITANA_COLORS.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: VITANA_COLORS.text, flex: 1, marginRight: 10 }}>
                    {assignment.title}
                  </Text>
                  <View style={{ backgroundColor: statusColors.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: statusColors.text, fontWeight: '600', fontSize: 12 }}>
                      {assignment.status}
                    </Text>
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Feather name="book" size={14} color={VITANA_COLORS.textSecondary} />
                    <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary }}>{assignment.subjectName}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Feather name="user" size={14} color={VITANA_COLORS.textSecondary} />
                    <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary }}>{assignment.teacherName}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Feather name="clock" size={14} color={VITANA_COLORS.textSecondary} />
                    <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary }}>Due: {dueDate}</Text>
                  </View>
                  {assignment.maxMarks && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="target" size={14} color={VITANA_COLORS.textSecondary} />
                      <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary }}>
                        Max marks: {assignment.maxMarks}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Description */}
              <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: VITANA_COLORS.border }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text, marginBottom: 8 }}>
                  Description
                </Text>
                <Text style={{ fontSize: 14, color: VITANA_COLORS.text, lineHeight: 22 }}>
                  {assignment.description || 'No description provided.'}
                </Text>
                {assignment.attachmentUrl && (
                  <TouchableOpacity
                    onPress={() => WebBrowser.openBrowserAsync(assignment.attachmentUrl!)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                      marginTop: 12, paddingTop: 12,
                      borderTopWidth: 1, borderTopColor: VITANA_COLORS.border,
                    }}
                  >
                    <Feather name="paperclip" size={16} color={primaryColor} />
                    <Text style={{ color: primaryColor, fontSize: 14, fontWeight: '500' }}>
                      Download Attachment
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Graded feedback */}
              {isGraded && assignment.submission && (
                <View
                  style={{
                    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16,
                    borderWidth: 1, borderColor: '#bbf7d0',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#15803d', marginBottom: 8 }}>
                    ✓ Graded
                  </Text>
                  {assignment.submission.marks != null && (
                    <Text style={{ fontSize: 15, color: VITANA_COLORS.text }}>
                      Marks: <Text style={{ fontWeight: '700' }}>{assignment.submission.marks}</Text>
                      {assignment.maxMarks ? `/${assignment.maxMarks}` : ''}
                      {assignment.submission.grade ? `  Grade: ${assignment.submission.grade}` : ''}
                    </Text>
                  )}
                  {assignment.submission.feedback && (
                    <Text style={{ fontSize: 14, color: VITANA_COLORS.text, marginTop: 8, lineHeight: 20 }}>
                      Feedback: {assignment.submission.feedback}
                    </Text>
                  )}
                </View>
              )}

              {/* Submission section */}
              {isSubmittable && (
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/(student)/assignments/[id]/submit', params: { id: assignment.id } })}
                  style={{
                    backgroundColor: primaryColor, borderRadius: 12,
                    paddingVertical: 15, alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Feather name="upload" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
                    {assignment.status === 'RevisionRequested' ? 'Re-submit Assignment' : 'Submit Assignment'}
                  </Text>
                </TouchableOpacity>
              )}

              {assignment.status === 'Submitted' && !isGraded && (
                <View
                  style={{
                    backgroundColor: '#eff6ff', borderRadius: 12, padding: 16,
                    borderWidth: 1, borderColor: '#bfdbfe', alignItems: 'center',
                  }}
                >
                  <Feather name="check-circle" size={24} color="#2563eb" />
                  <Text style={{ color: '#1d4ed8', fontWeight: '600', fontSize: 14, marginTop: 8 }}>
                    Submitted — Awaiting grading
                  </Text>
                  {assignment.submission?.submittedAt && (
                    <Text style={{ color: '#3b82f6', fontSize: 12, marginTop: 4 }}>
                      Submitted on {assignment.submission.submittedAt.split('T')[0]}
                    </Text>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
