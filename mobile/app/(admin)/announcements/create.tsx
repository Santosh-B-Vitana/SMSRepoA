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
import { useMutation } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { adminApi, type CreateAnnouncementRequest } from '@/api/endpoints/admin';
import { useAppTheme } from '@/theme';
import { VITANA_COLORS } from '@/theme/tokens';
import { queryClient } from '@/api/queryClient';

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  body: z.string().min(10, 'Message must be at least 10 characters').max(4000, 'Message too long'),
  priority: z.enum(['Low', 'Normal', 'High', 'Urgent']),
  audience: z.enum(['All', 'Parents', 'Staff', 'Students']),
});

type FormData = z.infer<typeof schema>;

const PRIORITY_CONFIG = {
  Low: { color: '#94a3b8', label: 'Low' },
  Normal: { color: '#6b7280', label: 'Normal' },
  High: { color: '#f59e0b', label: 'High' },
  Urgent: { color: '#ef4444', label: 'Urgent' },
} as const;

const AUDIENCE_OPTIONS = [
  { value: 'All', label: 'All School' },
  { value: 'Parents', label: 'Parents Only' },
  { value: 'Staff', label: 'Staff Only' },
  { value: 'Students', label: 'Students Only' },
] as const;

export default function CreateAnnouncement() {
  const { colors } = useAppTheme();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      priority: 'Normal',
      audience: 'All',
      title: '',
      body: '',
    },
  });

  const watchedPriority = watch('priority');

  const mutation = useMutation({
    mutationFn: (data: CreateAnnouncementRequest) => adminApi.createAnnouncement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      Alert.alert('Posted!', 'Your announcement has been published.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => Alert.alert('Error', 'Failed to post announcement. Please try again.'),
  });

  function onSubmit(data: FormData) {
    if (data.priority === 'Urgent') {
      Alert.alert(
        'Urgent Announcement',
        'This will send push notifications immediately to all recipients. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Post Urgent', style: 'destructive', onPress: () => mutation.mutate(data) },
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
      {/* Nav header */}
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
                  placeholder="e.g. School Closed Tomorrow"
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
                  placeholder="Write your announcement message here..."
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
                  {(Object.keys(PRIORITY_CONFIG) as (keyof typeof PRIORITY_CONFIG)[]).map(
                    (p) => {
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
                    },
                  )}
                </View>
              )}
            />
            {watchedPriority === 'Urgent' && (
              <View className="flex-row items-center mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <Feather name="alert-triangle" size={14} color={VITANA_COLORS.error} />
                <Text className="text-red-600 text-xs ml-1.5">
                  Urgent posts send immediate push notifications to all recipients.
                </Text>
              </View>
            )}
          </View>

          {/* Audience */}
          <View className="mb-7">
            <Text className="text-gray-700 font-medium mb-2">Send To</Text>
            <Controller
              control={control}
              name="audience"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row flex-wrap gap-2">
                  {AUDIENCE_OPTIONS.map((opt) => {
                    const selected = value === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => onChange(opt.value)}
                        className="px-4 py-2 rounded-full border"
                        style={{
                          backgroundColor: selected ? colors.primary : 'white',
                          borderColor: selected ? colors.primary : VITANA_COLORS.border,
                        }}
                      >
                        <Text
                          className="font-medium text-sm"
                          style={{
                            color: selected ? 'white' : VITANA_COLORS.textSecondary,
                          }}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            />
          </View>

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
