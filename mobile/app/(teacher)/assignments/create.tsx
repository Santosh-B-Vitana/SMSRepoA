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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi, type CreateAssignmentPayload } from '@/api/endpoints/teacher';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';

const schema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  classId: z.string().min(1, 'Please select a class'),
  subjectName: z.string().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter date as YYYY-MM-DD')
    .refine((d) => new Date(d) > new Date(), 'Due date must be in the future'),
  maxMarks: z
    .string()
    .optional()
    .refine(
      (v) => !v || (!isNaN(Number(v)) && Number(v) > 0 && Number(v) <= 1000),
      'Enter a valid marks value (1–1000)',
    ),
});

type FormData = z.infer<typeof schema>;

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '600',
        color: VITANA_COLORS.text,
        marginBottom: 6,
      }}
    >
      {label}
      {required && (
        <Text style={{ color: VITANA_COLORS.error }}> *</Text>
      )}
    </Text>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Text style={{ fontSize: 12, color: VITANA_COLORS.error, marginTop: 4 }}>{message}</Text>
  );
}

export default function CreateAssignment() {
  const { primaryColor } = useSchoolTheme();
  const qc = useQueryClient();

  const { data: teacherAssignments } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: () => teacherApi.getTeacherAssignments(),
    staleTime: 10 * 60 * 1000,
  });

  const classes = teacherAssignments ?? [];

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      classId: '',
      subjectName: '',
      dueDate: '',
      maxMarks: '',
    },
  });

  const selectedClassId = watch('classId');
  const selectedClass = classes.find(
    (c: { classId: string; className: string; subjects: string[] }) =>
      c.classId === selectedClassId,
  );

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload: CreateAssignmentPayload = {
        title: data.title,
        description: data.description || null,
        classId: data.classId,
        dueDate: data.dueDate,
        maxMarks: data.maxMarks ? Number(data.maxMarks) : null,
      };
      return teacherApi.createAssignment(payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-assignments'] });
      router.back();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to create assignment.';
      Alert.alert('Error', message);
    },
  });

  function onSubmit(data: FormData) {
    mutation.mutate(data);
  }

  const inputStyle = (hasError: boolean) => ({
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: hasError ? VITANA_COLORS.error : VITANA_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: VITANA_COLORS.text,
  });

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
        <Text style={{ fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text }}>
          Create Assignment
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View>
            <FieldLabel label="Title" required />
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. Chapter 5 Practice Problems"
                  placeholderTextColor={VITANA_COLORS.textSecondary}
                  style={inputStyle(!!errors.title)}
                />
              )}
            />
            <FieldError message={errors.title?.message} />
          </View>

          {/* Description */}
          <View>
            <FieldLabel label="Instructions / Description" />
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Describe the task, pages to read, or instructions…"
                  placeholderTextColor={VITANA_COLORS.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[
                    inputStyle(!!errors.description),
                    { minHeight: 90, paddingTop: 11 },
                  ]}
                />
              )}
            />
            <FieldError message={errors.description?.message} />
          </View>

          {/* Class picker */}
          <View>
            <FieldLabel label="Class" required />
            <Controller
              control={control}
              name="classId"
              render={({ field: { onChange, value } }) => (
                <View style={{ gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
                  {classes.map(
                    (c: { classId: string; className: string; subjects: string[] }) => {
                      const isSelected = value === c.classId;
                      return (
                        <TouchableOpacity
                          key={c.classId}
                          onPress={() => onChange(c.classId)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 8,
                            borderWidth: 1.5,
                            borderColor: isSelected
                              ? (primaryColor ?? VITANA_COLORS.primary)
                              : VITANA_COLORS.border,
                            backgroundColor: isSelected
                              ? (primaryColor ?? VITANA_COLORS.primary) + '18'
                              : '#fff',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: isSelected ? '700' : '500',
                              color: isSelected
                                ? (primaryColor ?? VITANA_COLORS.primary)
                                : VITANA_COLORS.text,
                            }}
                          >
                            {c.className}
                          </Text>
                        </TouchableOpacity>
                      );
                    },
                  )}
                  {classes.length === 0 && (
                    <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary }}>
                      No classes assigned.
                    </Text>
                  )}
                </View>
              )}
            />
            <FieldError message={errors.classId?.message} />
          </View>

          {/* Subject (from selected class) */}
          {selectedClass && selectedClass.subjects.length > 0 && (
            <View>
              <FieldLabel label="Subject (optional)" />
              <Controller
                control={control}
                name="subjectName"
                render={({ field: { onChange, value } }) => (
                  <View style={{ gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
                    {selectedClass.subjects.map((subject: string) => {
                      const isSelected = value === subject;
                      return (
                        <TouchableOpacity
                          key={subject}
                          onPress={() => onChange(isSelected ? '' : subject)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 8,
                            borderWidth: 1.5,
                            borderColor: isSelected
                              ? (primaryColor ?? VITANA_COLORS.primary)
                              : VITANA_COLORS.border,
                            backgroundColor: isSelected
                              ? (primaryColor ?? VITANA_COLORS.primary) + '18'
                              : '#fff',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: isSelected ? '700' : '500',
                              color: isSelected
                                ? (primaryColor ?? VITANA_COLORS.primary)
                                : VITANA_COLORS.text,
                            }}
                          >
                            {subject}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              />
            </View>
          )}

          {/* Due Date */}
          <View>
            <FieldLabel label="Due Date" required />
            <Controller
              control={control}
              name="dueDate"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={VITANA_COLORS.textSecondary}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  style={inputStyle(!!errors.dueDate)}
                />
              )}
            />
            <FieldError message={errors.dueDate?.message} />
          </View>

          {/* Max Marks */}
          <View>
            <FieldLabel label="Max Marks (optional)" />
            <Controller
              control={control}
              name="maxMarks"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. 20"
                  placeholderTextColor={VITANA_COLORS.textSecondary}
                  keyboardType="number-pad"
                  maxLength={4}
                  style={inputStyle(!!errors.maxMarks)}
                />
              )}
            />
            <FieldError message={errors.maxMarks?.message} />
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
              <Feather name="send" size={16} color="#fff" />
            )}
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
              {mutation.isPending ? 'Creating…' : 'Create Assignment'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
