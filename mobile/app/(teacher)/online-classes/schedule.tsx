import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { onlineClassesApi } from '@/api/endpoints/online-classes';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import type { ScheduleOnlineClassRequest } from '@/shared-types/api/online-classes';

const schema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    scheduledStart: z.string().min(1, 'Start time is required'),
    scheduledEnd: z.string().min(1, 'End time is required'),
    maxParticipants: z.coerce.number().int().min(2).max(500).default(100),
    isRecordingEnabled: z.boolean().default(false),
  })
  .refine((d) => new Date(d.scheduledEnd) > new Date(d.scheduledStart), {
    message: 'End time must be after start time',
    path: ['scheduledEnd'],
  });

type FormData = z.infer<typeof schema>;

function toLocalDateTimeValue(date: Date): string {
  // Format: YYYY-MM-DDTHH:mm (for datetime-local input)
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function DateTimeInput({
  value,
  onChange,
  label,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  error?: string;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DDTHH:mm"
        placeholderTextColor="#9ca3af"
        style={{
          borderWidth: 1,
          borderColor: error ? '#ef4444' : '#e5e7eb',
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 14,
          color: '#1a1a2e',
          backgroundColor: '#fff',
        }}
      />
      {error && <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{error}</Text>}
    </View>
  );
}

export default function ScheduleOnlineClass() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();

  const now = new Date();
  const oneHour = new Date(now.getTime() + 60 * 60 * 1000);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      scheduledStart: toLocalDateTimeValue(now),
      scheduledEnd: toLocalDateTimeValue(oneHour),
      maxParticipants: 100,
      isRecordingEnabled: false,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ScheduleOnlineClassRequest) => onlineClassesApi.schedule(data),
    onSuccess: (cls) => {
      queryClient.invalidateQueries({ queryKey: ['online-classes'] });
      Alert.alert('Class Scheduled', `"${cls.title}" has been scheduled. Students will be notified 15 minutes before the class starts.`, [
        { text: 'View Class', onPress: () => router.replace(`/(teacher)/online-classes/${cls.id}`) },
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'Could not schedule the class. Please try again.');
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      title: data.title,
      description: data.description,
      scheduledStart: new Date(data.scheduledStart).toISOString(),
      scheduledEnd: new Date(data.scheduledEnd).toISOString(),
      maxParticipants: data.maxParticipants,
      isRecordingEnabled: data.isRecordingEnabled,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: primaryColor,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Schedule Class</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          {/* Title */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
            Class Title *
          </Text>
          <Controller
            control={control}
            name="title"
            render={({ field: { value, onChange } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="e.g. Mathematics — Chapter 5 Revision"
                placeholderTextColor="#9ca3af"
                style={{
                  borderWidth: 1,
                  borderColor: errors.title ? '#ef4444' : '#e5e7eb',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: '#1a1a2e',
                  marginBottom: 4,
                }}
              />
            )}
          />
          {errors.title && (
            <Text style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{errors.title.message}</Text>
          )}

          {/* Description */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 }}>
            Description (optional)
          </Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { value, onChange } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Topic coverage, prerequisites, etc."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                style={{
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: '#1a1a2e',
                  textAlignVertical: 'top',
                  minHeight: 80,
                  marginBottom: 16,
                }}
              />
            )}
          />

          {/* Start Time */}
          <Controller
            control={control}
            name="scheduledStart"
            render={({ field: { value, onChange } }) => (
              <DateTimeInput
                value={value}
                onChange={onChange}
                label="Start Date & Time *"
                error={errors.scheduledStart?.message}
              />
            )}
          />

          {/* End Time */}
          <Controller
            control={control}
            name="scheduledEnd"
            render={({ field: { value, onChange } }) => (
              <DateTimeInput
                value={value}
                onChange={onChange}
                label="End Date & Time *"
                error={errors.scheduledEnd?.message}
              />
            )}
          />

          {/* Recording toggle */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Enable Recording</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Recording stored in your school's cloud storage</Text>
            </View>
            <Controller
              control={control}
              name="isRecordingEnabled"
              render={({ field: { value, onChange } }) => (
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{ false: '#d1d5db', true: primaryColor }}
                  thumbColor="#fff"
                />
              )}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={mutation.isPending}
            style={{
              backgroundColor: primaryColor,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
              {mutation.isPending ? 'Scheduling...' : 'Schedule Class'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
