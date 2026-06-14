import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
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
import { queryClient } from '@/api/queryClient';

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  body: z.string().min(10, 'Message must be at least 10 characters').max(4000, 'Message too long'),
  priority: z.enum(['Low', 'Normal', 'High', 'Urgent']),
  audience: z.enum(['All', 'Parents', 'Staff', 'Students']),
});

type FormData = z.infer<typeof schema>;

const PRIORITY_CONFIG = {
  Low: { color: '#94a3b8', label: 'Low', icon: 'minus-circle' as const },
  Normal: { color: '#3b82f6', label: 'Normal', icon: 'info' as const },
  High: { color: '#f59e0b', label: 'High', icon: 'alert-circle' as const },
  Urgent: { color: '#ef4444', label: 'Urgent', icon: 'alert-triangle' as const },
} as const;

const AUDIENCE_OPTIONS = [
  { value: 'All', label: 'All School', icon: 'users' as const },
  { value: 'Parents', label: 'Parents', icon: 'user' as const },
  { value: 'Staff', label: 'Staff', icon: 'briefcase' as const },
  { value: 'Students', label: 'Students', icon: 'book-open' as const },
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

  const submitBgColor = watchedPriority === 'Urgent' ? '#ef4444' : colors.primary;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Feather name="volume-2" size={18} color={colors.primary} />
          <Text style={styles.headerTitle}>Post Announcement</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title Field */}
        <View style={styles.card}>
          <View style={styles.fieldLabelRow}>
            <Feather name="type" size={14} color="#64748b" />
            <Text style={styles.label}>Title</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="e.g. School Closed Tomorrow"
                placeholderTextColor="#94a3b8"
                maxLength={100}
                style={[styles.input, errors.title ? styles.inputError : styles.inputNormal]}
              />
            )}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title.message}</Text>}
        </View>

        {/* Message Field */}
        <View style={styles.card}>
          <View style={styles.fieldLabelRow}>
            <Feather name="align-left" size={14} color="#64748b" />
            <Text style={styles.label}>Message</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <Controller
            control={control}
            name="body"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Write your announcement message here..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={4000}
                style={[
                  styles.input,
                  styles.textArea,
                  errors.body ? styles.inputError : styles.inputNormal,
                ]}
              />
            )}
          />
          {errors.body && <Text style={styles.errorText}>{errors.body.message}</Text>}
        </View>

        {/* Priority Field */}
        <View style={styles.card}>
          <View style={styles.fieldLabelRow}>
            <Feather name="flag" size={14} color="#64748b" />
            <Text style={styles.label}>Priority</Text>
          </View>
          <Controller
            control={control}
            name="priority"
            render={({ field: { onChange, value } }) => (
              <View style={styles.priorityRow}>
                {(Object.keys(PRIORITY_CONFIG) as (keyof typeof PRIORITY_CONFIG)[]).map((p, idx) => {
                  const conf = PRIORITY_CONFIG[p];
                  const selected = value === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => onChange(p)}
                      activeOpacity={0.75}
                      style={[
                        styles.priorityBtn,
                        idx < 3 && styles.priorityBtnGap,
                        {
                          backgroundColor: selected ? conf.color : '#f8fafc',
                          borderColor: selected ? conf.color : '#e2e8f0',
                        },
                      ]}
                    >
                      <Feather
                        name={conf.icon}
                        size={12}
                        color={selected ? '#fff' : conf.color}
                      />
                      <Text
                        style={[
                          styles.priorityLabel,
                          { color: selected ? '#fff' : conf.color },
                        ]}
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
            <View style={styles.urgentBanner}>
              <Feather name="alert-triangle" size={13} color="#dc2626" />
              <Text style={styles.urgentText}>
                Urgent posts send immediate push notifications to all recipients.
              </Text>
            </View>
          )}
        </View>

        {/* Audience Field */}
        <View style={styles.card}>
          <View style={styles.fieldLabelRow}>
            <Feather name="send" size={14} color="#64748b" />
            <Text style={styles.label}>Send To</Text>
          </View>
          <Controller
            control={control}
            name="audience"
            render={({ field: { onChange, value } }) => (
              <View>
                {[AUDIENCE_OPTIONS.slice(0, 2), AUDIENCE_OPTIONS.slice(2, 4)].map(
                  (row, rowIdx) => (
                    <View
                      key={rowIdx}
                      style={[styles.audienceRow, rowIdx === 0 && styles.audienceRowGap]}
                    >
                      {row.map((opt, colIdx) => {
                        const selected = value === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            onPress={() => onChange(opt.value)}
                            activeOpacity={0.75}
                            style={[
                              styles.audienceBtn,
                              colIdx === 0 && styles.audienceBtnLeft,
                              {
                                backgroundColor: selected ? colors.primary : '#f8fafc',
                                borderColor: selected ? colors.primary : '#e2e8f0',
                              },
                            ]}
                          >
                            <Feather
                              name={opt.icon}
                              size={15}
                              color={selected ? '#fff' : '#64748b'}
                            />
                            <Text
                              style={[
                                styles.audienceLabel,
                                { color: selected ? '#fff' : '#475569' },
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ),
                )}
              </View>
            )}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={mutation.isPending}
          activeOpacity={0.85}
          style={[styles.submitBtn, { backgroundColor: submitBgColor }]}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.submitInner}>
              <Feather
                name={watchedPriority === 'Urgent' ? 'alert-triangle' : 'send'}
                size={16}
                color="#fff"
              />
              <Text style={styles.submitText}>
                {watchedPriority === 'Urgent' ? 'Post Urgent Announcement' : 'Post Announcement'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  required: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  inputNormal: {
    borderColor: '#e2e8f0',
  },
  inputError: {
    borderColor: '#f87171',
    backgroundColor: '#fff5f5',
  },
  textArea: {
    height: 120,
    paddingTop: 11,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 5,
    marginLeft: 2,
  },
  priorityRow: {
    flexDirection: 'row',
  },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 4,
  },
  priorityBtnGap: {
    marginRight: 8,
  },
  priorityLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  urgentText: {
    fontSize: 12,
    color: '#dc2626',
    flex: 1,
    lineHeight: 17,
  },
  audienceRow: {
    flexDirection: 'row',
  },
  audienceRowGap: {
    marginBottom: 8,
  },
  audienceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 7,
  },
  audienceBtnLeft: {
    marginRight: 8,
  },
  audienceLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#1a6fd8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
