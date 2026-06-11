import { View, Text, Switch, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';

interface NotificationPreference {
  pushEnabled: boolean;
  inAppEnabled: boolean;
}

type PreferencesMap = Record<string, NotificationPreference>;

const TYPE_LABELS: Record<string, { label: string; description: string }> = {
  fee_due: { label: 'Fee Due Reminders', description: 'Get notified when a fee payment is due' },
  fee_overdue: { label: 'Overdue Fee Alerts', description: 'Get notified when a fee payment is overdue' },
  attendance_absent: { label: 'Absence Alerts', description: "Get notified when your child is marked absent" },
  result_published: { label: 'Exam Results', description: 'Get notified when exam results are published' },
  new_announcement: { label: 'School Announcements', description: 'Get notified about new school announcements' },
  new_diary_entry: { label: 'Diary Updates', description: "Get notified about new diary entries for your child" },
  leave_approved: { label: 'Leave Status', description: 'Get notified when a leave request is approved or rejected' },
  assignment_graded: { label: 'Assignment Grades', description: 'Get notified when your assignment is graded' },
  assignment_created: { label: 'New Assignments', description: 'Get notified when a new assignment is posted' },
  leave_request_received: { label: 'Leave Requests', description: "Get notified when a student's leave request arrives" },
  submission_received: { label: 'Assignment Submissions', description: 'Get notified when a student submits an assignment' },
  timetable_change: { label: 'Timetable Changes', description: 'Get notified about changes to your schedule' },
  new_message: { label: 'New Messages', description: 'Get notified when you receive a new message' },
  billing_expiry_warning: { label: 'Billing Expiry Warning', description: 'Get notified when a billing plan is about to expire' },
  billing_expired: { label: 'Billing Expired', description: 'Get notified when a billing plan has expired' },
};

interface Props {
  roleTypes: string[];
}

export function NotificationPreferencesScreen({ roleTypes }: Props) {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery<PreferencesMap>({
    queryKey: ['notification-preferences'],
    queryFn: () => apiClient.get('/notifications/preferences') as Promise<PreferencesMap>,
    staleTime: 5 * 60 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ type, pushEnabled }: { type: string; pushEnabled: boolean }) =>
      apiClient.put(`/notifications/preferences/${type}`, { pushEnabled }) as Promise<void>,
    onMutate: async ({ type, pushEnabled }) => {
      await queryClient.cancelQueries({ queryKey: ['notification-preferences'] });
      const previous = queryClient.getQueryData<PreferencesMap>(['notification-preferences']);
      queryClient.setQueryData<PreferencesMap>(['notification-preferences'], (old) => ({
        ...old,
        [type]: { ...(old?.[type] ?? { inAppEnabled: true }), pushEnabled },
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notification-preferences'], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}>
          Notification Settings
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={primaryColor} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: VITANA_COLORS.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 8,
            }}
          >
            Push Notifications
          </Text>

          <View style={{ backgroundColor: '#fff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: VITANA_COLORS.border }}>
            {roleTypes.map((type, index) => {
              const meta = TYPE_LABELS[type];
              if (!meta) return null;
              const isEnabled = preferences?.[type]?.pushEnabled ?? true;
              const isPending = toggleMutation.isPending && toggleMutation.variables?.type === type;

              return (
                <View
                  key={type}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: index < roleTypes.length - 1 ? 1 : 0,
                    borderBottomColor: VITANA_COLORS.border,
                    backgroundColor: '#fff',
                  }}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: '500', color: VITANA_COLORS.text }}>
                      {meta.label}
                    </Text>
                    <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
                      {meta.description}
                    </Text>
                  </View>
                  {isPending ? (
                    <ActivityIndicator size="small" color={primaryColor} />
                  ) : (
                    <Switch
                      value={isEnabled}
                      onValueChange={(value) => toggleMutation.mutate({ type, pushEnabled: value })}
                      trackColor={{ false: '#d1d5db', true: primaryColor + '80' }}
                      thumbColor={isEnabled ? primaryColor : '#9ca3af'}
                    />
                  )}
                </View>
              );
            })}
          </View>

          <Text
            style={{
              fontSize: 12,
              color: VITANA_COLORS.textSecondary,
              paddingHorizontal: 16,
              paddingTop: 12,
              lineHeight: 18,
            }}
          >
            These settings control push notifications to your device. In-app notifications are always shown.
            You can also manage notifications in your device Settings.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
