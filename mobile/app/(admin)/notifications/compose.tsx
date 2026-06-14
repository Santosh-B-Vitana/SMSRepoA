import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

interface BroadcastPayload {
  title: string;
  body: string;
  targetAudience: 'All' | 'Parents' | 'Staff' | 'Students';
  priority: 'Normal' | 'High' | 'Urgent';
}

const AUDIENCES = [
  { value: 'All',      label: 'All Users',    icon: 'users',       color: '#2563eb' },
  { value: 'Parents',  label: 'Parents',       icon: 'user',        color: '#059669' },
  { value: 'Staff',    label: 'Staff',         icon: 'briefcase',   color: '#7c3aed' },
  { value: 'Students', label: 'Students',      icon: 'book-open',   color: '#f59e0b' },
] as const;

const PRIORITIES = [
  { value: 'Normal', label: 'Normal',   color: '#64748b' },
  { value: 'High',   label: 'High',     color: '#d97706' },
  { value: 'Urgent', label: 'Urgent',   color: '#dc2626' },
] as const;

export default function NotificationComposeScreen() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<BroadcastPayload>({
    title: '',
    body: '',
    targetAudience: 'All',
    priority: 'Normal',
  });

  const broadcastMutation = useMutation({
    mutationFn: (payload: BroadcastPayload) =>
      apiClient.post('/notifications/broadcast', {
        title: payload.title,
        message: payload.body,
        targetRole: payload.targetAudience === 'All' ? null : payload.targetAudience.toLowerCase(),
        priority: payload.priority,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      Alert.alert(
        'Notification Sent',
        `Push notification broadcast to "${form.targetAudience}" successfully.`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
    },
    onError: (err: any) => Alert.alert('Error', err?.message ?? 'Failed to send notification'),
  });

  function handleSend() {
    if (!form.title.trim()) { Alert.alert('Validation', 'Notification title is required.'); return; }
    if (!form.body.trim()) { Alert.alert('Validation', 'Notification message is required.'); return; }

    const audienceLabel = AUDIENCES.find(a => a.value === form.targetAudience)?.label ?? form.targetAudience;

    Alert.alert(
      'Send Notification',
      `This will send a push notification to all ${audienceLabel.toLowerCase()}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', style: 'default', onPress: () => broadcastMutation.mutate(form) },
      ]
    );
  }

  const charCount = form.body.length;
  const isUrgent = form.priority === 'Urgent';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Send Notification" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isUrgent && (
            <View style={styles.urgentBanner}>
              <Feather name="alert-triangle" size={14} color="#92400e" />
              <Text style={styles.urgentText}>
                Urgent notifications send immediately and may wake up device screens.
              </Text>
            </View>
          )}

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Content</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Title <Text style={{ color: '#ef4444' }}>*</Text></Text>
              <TextInput
                style={styles.fieldInput}
                value={form.title}
                onChangeText={(v) => setForm(f => ({ ...f, title: v }))}
                placeholder="e.g. School closed tomorrow"
                placeholderTextColor={VITANA_COLORS.textSecondary}
                maxLength={100}
                returnKeyType="next"
              />
              <Text style={styles.charCount}>{form.title.length}/100</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Message <Text style={{ color: '#ef4444' }}>*</Text></Text>
              <TextInput
                style={[styles.fieldInput, styles.bodyInput]}
                value={form.body}
                onChangeText={(v) => setForm(f => ({ ...f, body: v }))}
                placeholder="Write your notification message here..."
                placeholderTextColor={VITANA_COLORS.textSecondary}
                multiline
                maxLength={300}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{charCount}/300</Text>
            </View>
          </View>

          {/* Audience */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send To</Text>
            <View style={styles.grid2}>
              {AUDIENCES.map((a) => (
                <TouchableOpacity
                  key={a.value}
                  style={[
                    styles.audienceCard,
                    form.targetAudience === a.value && { borderColor: a.color, backgroundColor: `${a.color}08` },
                  ]}
                  onPress={() => setForm(f => ({ ...f, targetAudience: a.value }))}
                >
                  <View style={[styles.audienceIcon, { backgroundColor: `${a.color}18` }]}>
                    <Feather name={a.icon as any} size={20} color={a.color} />
                  </View>
                  <Text style={[styles.audienceLabel, form.targetAudience === a.value && { color: a.color, fontWeight: '700' }]}>
                    {a.label}
                  </Text>
                  {form.targetAudience === a.value && (
                    <Feather name="check-circle" size={14} color={a.color} style={{ position: 'absolute', top: 8, right: 8 }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Priority */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Priority</Text>
            <View style={styles.pillRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.priorityPill,
                    form.priority === p.value && { backgroundColor: `${p.color}18`, borderColor: p.color },
                  ]}
                  onPress={() => setForm(f => ({ ...f, priority: p.value }))}
                >
                  <Text style={[styles.priorityText, form.priority === p.value && { color: p.color, fontWeight: '700' }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Preview */}
          {(form.title || form.body) && (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Preview</Text>
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <Feather name="bell" size={14} color={primaryColor} />
                  <Text style={[styles.previewTitle, { color: primaryColor }]}>
                    {form.title || 'Notification Title'}
                  </Text>
                </View>
                <Text style={styles.previewBody} numberOfLines={3}>
                  {form.body || 'Your message will appear here'}
                </Text>
              </View>
            </View>
          )}

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: isUrgent ? '#dc2626' : primaryColor },
              broadcastMutation.isPending && { opacity: 0.6 },
            ]}
            onPress={handleSend}
            disabled={broadcastMutation.isPending}
          >
            {broadcastMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="send" size={18} color="#fff" />
                <Text style={styles.sendText}>
                  {isUrgent ? 'Send Urgent Notification' : 'Send Notification'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  urgentBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: 10, padding: 12, marginBottom: 14,
  },
  urgentText: { flex: 1, fontSize: 13, color: '#92400e', fontWeight: '500' },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 14, fontFamily: 'Poppins' },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: VITANA_COLORS.text, marginBottom: 6 },
  fieldInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 14,
    color: VITANA_COLORS.text, backgroundColor: '#fafafa',
  },
  bodyInput: { height: 120, paddingTop: 11 },
  charCount: { fontSize: 11, color: VITANA_COLORS.textSecondary, textAlign: 'right', marginTop: 4 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  audienceCard: {
    width: '47%', flexGrow: 1, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#fff', padding: 14, alignItems: 'center', gap: 8,
  },
  audienceIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  audienceLabel: { fontSize: 13, fontWeight: '500', color: VITANA_COLORS.text },
  pillRow: { flexDirection: 'row', gap: 10 },
  priorityPill: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  priorityText: { fontSize: 13, fontWeight: '500', color: VITANA_COLORS.textSecondary },
  preview: { marginBottom: 14 },
  previewLabel: { fontSize: 11, fontWeight: '600', color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  previewCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  previewTitle: { fontSize: 14, fontWeight: '700' },
  previewBody: { fontSize: 13, color: VITANA_COLORS.textSecondary, lineHeight: 19 },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, paddingVertical: 15,
  },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
