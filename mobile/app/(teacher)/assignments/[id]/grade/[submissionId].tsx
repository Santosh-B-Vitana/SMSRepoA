import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi, type SubmissionDto } from '@/api/endpoints/teacher';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';

const schema = z.object({
  marksObtained: z
    .string()
    .min(1, 'Marks are required')
    .refine(
      (v) => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 1000,
      'Enter a valid marks value (0–1000)',
    ),
  feedback: z.string().max(1000, 'Feedback too long').optional(),
});

type FormData = z.infer<typeof schema>;

export default function GradeSubmission() {
  const { id: assignmentId, submissionId } = useLocalSearchParams<{
    id: string;
    submissionId: string;
  }>();
  const { primaryColor } = useSchoolTheme();
  const qc = useQueryClient();

  // Pre-fill with existing grade if this was graded before
  const { data: submissions } = useQuery<SubmissionDto[]>({
    queryKey: ['submissions', assignmentId],
    queryFn: () => teacherApi.getSubmissions(assignmentId!),
    enabled: !!assignmentId,
    staleTime: 2 * 60 * 1000,
  });

  const submission = submissions?.find((s) => s.id === submissionId);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      marksObtained:
        submission?.marksObtained !== null && submission?.marksObtained !== undefined
          ? String(submission.marksObtained)
          : '',
      feedback: submission?.feedback ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      teacherApi.gradeSubmission(submissionId!, {
        marksObtained: Number(data.marksObtained),
        feedback: data.feedback ?? '',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['submissions', assignmentId] });
      void qc.invalidateQueries({ queryKey: ['my-assignments'] });
      router.back();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to save grade.';
      Alert.alert('Error', message);
    },
  });

  function onSubmit(data: FormData) {
    mutation.mutate(data);
  }

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
            Grade Submission
          </Text>
          {submission && (
            <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
              {submission.studentName}
            </Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Submission info card */}
          {submission && (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: VITANA_COLORS.border,
                gap: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="user" size={16} color={VITANA_COLORS.primary} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>
                  {submission.studentName}
                </Text>
              </View>
              {submission.submittedAt && (
                <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
                  Submitted:{' '}
                  {new Date(submission.submittedAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              )}
              {submission.attachmentUrl && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Feather name="paperclip" size={13} color={VITANA_COLORS.primary} />
                  <Text style={{ fontSize: 12, color: VITANA_COLORS.primary, fontWeight: '600' }}>
                    Attachment available
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Marks */}
          <View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: VITANA_COLORS.text,
                marginBottom: 6,
              }}
            >
              Marks Obtained <Text style={{ color: VITANA_COLORS.error }}>*</Text>
            </Text>
            <Controller
              control={control}
              name="marksObtained"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. 18"
                  placeholderTextColor={VITANA_COLORS.textSecondary}
                  keyboardType="decimal-pad"
                  maxLength={6}
                  style={{
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderColor: errors.marksObtained ? VITANA_COLORS.error : VITANA_COLORS.border,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 18,
                    fontWeight: '700',
                    color: VITANA_COLORS.text,
                    textAlign: 'center',
                  }}
                />
              )}
            />
            {errors.marksObtained && (
              <Text style={{ fontSize: 12, color: VITANA_COLORS.error, marginTop: 4 }}>
                {errors.marksObtained.message}
              </Text>
            )}
          </View>

          {/* Feedback */}
          <View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: VITANA_COLORS.text,
                marginBottom: 6,
              }}
            >
              Feedback <Text style={{ fontSize: 11, fontWeight: '400', color: VITANA_COLORS.textSecondary }}>(optional)</Text>
            </Text>
            <Controller
              control={control}
              name="feedback"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Write feedback for the student…"
                  placeholderTextColor={VITANA_COLORS.textSecondary}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={{
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderColor: errors.feedback ? VITANA_COLORS.error : VITANA_COLORS.border,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 14,
                    color: VITANA_COLORS.text,
                    minHeight: 110,
                  }}
                />
              )}
            />
            {errors.feedback && (
              <Text style={{ fontSize: 12, color: VITANA_COLORS.error, marginTop: 4 }}>
                {errors.feedback.message}
              </Text>
            )}
            <Text
              style={{
                fontSize: 11,
                color: VITANA_COLORS.textSecondary,
                marginTop: 4,
              }}
            >
              Feedback will be shared with the student via the app notification.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={() => { void handleSubmit(onSubmit)(); }}
            disabled={mutation.isPending}
            style={{
              backgroundColor: primaryColor ?? VITANA_COLORS.primary,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              opacity: mutation.isPending ? 0.7 : 1,
              marginTop: 8,
            }}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="check-circle" size={18} color="#fff" />
            )}
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
              {mutation.isPending ? 'Saving…' : 'Save Grade'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
