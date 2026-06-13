import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { communicationApi, type AnnouncementPriority } from '@/api/endpoints/communication';
import { teacherApi } from '@/api/endpoints/teacher';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS } from '@/theme/tokens';
import { queryClient } from '@/api/queryClient';

const schema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title too long'),
  body: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(4000, 'Message too long'),
  priority: z.enum(['Low', 'Normal', 'High', 'Urgent']),
  classId: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

const PRIORITY_CONFIG: Record<
  AnnouncementPriority,
  { color: string; label: string }
> = {
  Low: { color: '#94a3b8', label: 'Low' },
  Normal: { color: '#6b7280', label: 'Normal' },
  High: { color: '#f59e0b', label: 'High' },
  Urgent: { color: '#ef4444', label: 'Urgent' },
};

export default function TeacherCreateAnnouncement() {
  const { colors } = useAppTheme();

  const { data: assignments = [] } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: teacherApi.getTeacherAssignments,
    staleTime: 10 * 60_000,
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      priority: 'Normal',
      classId: null,
      title: '',
      body: '',
    },
  });

  const watchedPriority = watch('priority');
  const watchedClassId = watch('classId');

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      communicationApi.createAnnouncement({
        title: data.title,
        body: data.body,
        priority: data.priority,
        classId: data.classId ?? null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teacher-announcements'] });
      Alert.alert('Posted!', 'Your announcement has been published.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () =>
      Alert.alert('Error', 'Failed to post announcement. Please try again.'),
  });

  function onSubmit(data: FormData) {
    const selectedClass = assignments.find((a) => a.classId === data.classId);
    const recipientInfo = selectedClass
      ? `parents of ${selectedClass.className}`
      : 'all your classes';

    if (data.priority === 'Urgent') {
      Alert.alert(
        'Urgent Announcement',
        `This will send push notifications immediately to ${recipientInfo}. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Post Urgent',
            style: 'destructive',
            onPress: () => mutation.mutate(data),
          },
        ],
      );
    } else {
      mutation.mutate(data);
    }
  }

  const submitBgColor =
    watchedPriority === 'Urgent' ? VITANA_COLORS.error : colors.primary;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pt-3 pb-2 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-3">
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Post Announcement</Text>
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-4 pt-5 pb-10">
          {/* Title */}
          <View className="mb-5">
            <Text className="text-gray-700 font-medium mb-1.5">
              Title <Text className="text-red-500">*</Text>
            </Text>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g. Parent-Teacher Meeting"
                  placeholderTextColor={VITANA_COLORS.textSecondary}
                  maxLength={100}
                  className={`border rounded-xl px-4 py-3.5 text-gray-900 bg-white ${errors.title ? 'border-red-400' : 'border-gray-200'}`}
                />
              )}
            />
            {errors.title && (
              <Text className="text-red-500 text-xs mt-1">{errors.title.message}</Text>
            )}
          </View>

          {/* Body */}
          <View className="mb-5">
            <Text className="text-gray-700 font-medium mb-1.5">
              Message <Text className="text-red-500">*</Text>
            </Text>
            <Controller
              control={control}
              name="body"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="Write your announcement..."
                  placeholderTextColor={VITANA_COLORS.textSecondary}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={4000}
                  className={`border rounded-xl px-4 py-3 text-gray-900 bg-white h-36 ${errors.body ? 'border-red-400' : 'border-gray-200'}`}
                />
              )}
            />
            {errors.body && (
              <Text className="text-red-500 text-xs mt-1">{errors.body.message}</Text>
            )}
          </View>

          {/* Priority */}
          <View className="mb-5">
            <Text className="text-gray-700 font-medium mb-2">Priority</Text>
            <Controller
              control={control}
              name="priority"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row gap-2">
                  {(
                    Object.keys(PRIORITY_CONFIG) as AnnouncementPriority[]
                  ).map((p) => {
                    const conf = PRIORITY_CONFIG[p];
                    const selected = value === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        onPress={() => onChange(p)}
                        className="flex-1 py-2.5 rounded-xl items-center border"
                        style={{
                          backgroundColor: selected ? conf.color + '20' : 'white',
                          borderColor: selected ? conf.color : VITANA_COLORS.border,
                        }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{ color: conf.color }}
                        >
                          {conf.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            />
            {watchedPriority === 'Urgent' && (
              <View className="flex-row items-center mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <Feather name="alert-triangle" size={14} color={VITANA_COLORS.error} />
                <Text className="text-red-600 text-xs ml-1.5 flex-1">
                  Urgent posts send immediate push notifications to all recipients.
                </Text>
              </View>
            )}
          </View>

          {/* Class selector */}
          {assignments.length > 0 && (
            <View className="mb-7">
              <Text className="text-gray-700 font-medium mb-2">Send To</Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setValue('classId', null)}
                  className="px-4 py-2 rounded-full border"
                  style={{
                    backgroundColor: !watchedClassId ? colors.primary : 'white',
                    borderColor: !watchedClassId ? colors.primary : VITANA_COLORS.border,
                  }}
                >
                  <Text
                    className="font-medium text-sm"
                    style={{ color: !watchedClassId ? 'white' : VITANA_COLORS.textSecondary }}
                  >
                    All My Classes
                  </Text>
                </TouchableOpacity>
                {assignments.map((a) => {
                  const selected = watchedClassId === a.classId;
                  return (
                    <TouchableOpacity
                      key={a.classId}
                      onPress={() => setValue('classId', a.classId)}
                      className="px-4 py-2 rounded-full border"
                      style={{
                        backgroundColor: selected ? colors.primary : 'white',
                        borderColor: selected ? colors.primary : VITANA_COLORS.border,
                      }}
                    >
                      <Text
                        className="font-medium text-sm"
                        style={{ color: selected ? 'white' : VITANA_COLORS.textSecondary }}
                      >
                        {a.className}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={mutation.isPending}
            className="rounded-xl py-4 items-center"
            style={{ backgroundColor: submitBgColor }}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="flex-row items-center gap-2">
                {watchedPriority === 'Urgent' && (
                  <Feather name="alert-triangle" size={16} color="white" />
                )}
                <Text className="text-white font-semibold text-base">
                  {watchedPriority === 'Urgent'
                    ? 'Post Urgent Announcement'
                    : 'Post Announcement'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
