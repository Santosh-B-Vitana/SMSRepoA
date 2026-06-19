/**
 * CRM Broadcast Screen — Admin → Specific Parents
 *
 * Allows the admin to compose a free-form message, pick recipients from
 * the parent directory (or type phone numbers directly), and send it as
 * a WhatsApp utility message via Groq AI formatting.
 *
 * Cost strategy: Utility template type (cheapest WhatsApp category).
 */

import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { apiClient } from '@/api/client';
import { adminApi, type CrmParent } from '@/api/endpoints/admin';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';

// ─── Parent picker ────────────────────────────────────────────────────────────

interface SelectedRecipient {
  phone: string;
  name: string;
  studentName?: string;
}

function ParentPickerModal({
  visible,
  selected,
  onToggle,
  onClose,
}: {
  visible: boolean;
  selected: Set<string>;
  onToggle: (phone: string, name: string, studentName?: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading } = useQuery<any>({
    queryKey: ['crm-parents-list'],
    queryFn: () =>
      (apiClient.get('/students', { params: { page: 1, pageSize: 200, isActive: true } }) as Promise<any>)
        .then((r: any) => {
          const items = r?.items ?? r?.data ?? (Array.isArray(r) ? r : []);
          // Deduplicate by guardian phone
          const seen = new Set<string>();
          return items.reduce((acc: CrmParent[], s: any) => {
            const phone = s.guardianPhone ?? s.primaryPhone;
            if (phone && !seen.has(phone)) {
              seen.add(phone);
              acc.push({
                id: s.id,
                name: s.guardianName ?? 'Parent',
                phone,
                studentName: s.name ?? s.fullName,
                className: s.class ?? s.className,
              });
            }
            return acc;
          }, []);
        }),
    staleTime: 5 * 60 * 1000,
    enabled: visible,
  });

  const parents: CrmParent[] = Array.isArray(data) ? data : [];
  const filtered = search.trim()
    ? parents.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.phone.includes(search) ||
        (p.studentName ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : parents;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={pickerStyles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={20} color={VITANA_COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={pickerStyles.headerTitle}>Select Recipients</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[pickerStyles.doneBtn, { color: primaryColor }]}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={pickerStyles.searchRow}>
          <Feather name="search" size={16} color={VITANA_COLORS.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, phone or student..."
            placeholderTextColor={VITANA_COLORS.textSecondary}
            style={pickerStyles.searchInput}
            autoCapitalize="none"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x-circle" size={16} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Selected count */}
        {selected.size > 0 && (
          <View style={[pickerStyles.selectedBadge, { backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}30` }]}>
            <Feather name="check-circle" size={13} color={primaryColor} />
            <Text style={[pickerStyles.selectedBadgeText, { color: primaryColor }]}>
              {selected.size} recipient{selected.size !== 1 ? 's' : ''} selected
            </Text>
          </View>
        )}

        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={primaryColor} size="large" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.phone}
            contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />}
            renderItem={({ item }) => {
              const isSelected = selected.has(item.phone);
              return (
                <TouchableOpacity
                  style={[pickerStyles.parentRow, isSelected && { backgroundColor: `${primaryColor}08` }]}
                  onPress={() => onToggle(item.phone, item.name, item.studentName)}
                  activeOpacity={0.7}
                >
                  <View style={[pickerStyles.avatar, isSelected && { backgroundColor: `${primaryColor}20` }]}>
                    <Text style={[pickerStyles.avatarInitial, isSelected && { color: primaryColor }]}>
                      {item.name[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={pickerStyles.parentName}>{item.name}</Text>
                    <Text style={pickerStyles.parentPhone}>{item.phone}</Text>
                    {item.studentName && (
                      <Text style={pickerStyles.parentStudentName}>Ward: {item.studentName}{item.className ? ` · ${item.className}` : ''}</Text>
                    )}
                  </View>
                  {isSelected ? (
                    <Feather name="check-circle" size={20} color={primaryColor} />
                  ) : (
                    <View style={pickerStyles.unchecked} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Feather name="users" size={36} color="#cbd5e1" />
                <Text style={{ fontSize: 14, color: VITANA_COLORS.textSecondary, marginTop: 12 }}>
                  {search ? 'No matching parents' : 'No parents found'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CrmBroadcastScreen() {
  const { primaryColor } = useSchoolTheme();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [recipients, setRecipients] = useState<SelectedRecipient[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Phone set for quick look-up in picker
  const selectedPhones = new Set(recipients.map((r) => r.phone));

  function toggleRecipient(phone: string, name: string, studentName?: string) {
    setRecipients((prev) =>
      prev.some((r) => r.phone === phone)
        ? prev.filter((r) => r.phone !== phone)
        : [...prev, { phone, name, studentName }],
    );
  }

  function addManualPhone() {
    const trimmed = manualPhone.trim();
    if (!trimmed) return;
    if (recipients.some((r) => r.phone === trimmed)) {
      Alert.alert('Already added', `${trimmed} is already in the recipient list.`);
      return;
    }
    setRecipients((prev) => [...prev, { phone: trimmed, name: 'Recipient' }]);
    setManualPhone('');
  }

  function removeRecipient(phone: string) {
    setRecipients((prev) => prev.filter((r) => r.phone !== phone));
  }

  const broadcastMutation = useMutation({
    mutationFn: () =>
      adminApi.crmBroadcastWhatsApp({
        recipients: recipients.map((r) => r.phone),
        message,
        subject: subject.trim() || undefined,
      }),
    onSuccess: (result) => {
      const count = result.recipientsQueued ?? 0;
      const preview = result.messagePreview ?? '';
      Alert.alert(
        'Broadcast Queued!',
        `WhatsApp utility messages queued for ${count} recipient${count !== 1 ? 's' : ''}.\n\nGroq AI formatted your message.\n\nPreview:\n"${preview}"`,
        [
          {
            text: 'Send Another',
            onPress: () => {
              setSubject('');
              setMessage('');
              setRecipients([]);
            },
          },
          { text: 'Done', style: 'cancel' },
        ],
      );
    },
    onError: (err: any) =>
      Alert.alert('Failed', err?.message ?? 'Could not send broadcast. Check WhatsApp settings.'),
  });

  function handleSend() {
    if (recipients.length === 0) {
      Alert.alert('No Recipients', 'Please add at least one recipient.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Empty Message', 'Please enter a message to send.');
      return;
    }
    Alert.alert(
      'Send WhatsApp Broadcast',
      `Send to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}?\n\nGroq AI will format your message as a WhatsApp utility message (cheapest rate).`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => broadcastMutation.mutate() },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Send to Parents (CRM)" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Cost note */}
          <View style={styles.costBanner}>
            <Feather name="zap" size={12} color="#7c3aed" />
            <Text style={styles.costBannerText}>
              <Text style={{ fontWeight: '700' }}>Utility template · Lowest cost.</Text>{'  '}
              Groq Llama 4 Scout formats your message before sending.
            </Text>
          </View>

          {/* Subject */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Subject (Optional)</Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="e.g. Reminder: Parent-Teacher Meeting"
              placeholderTextColor={VITANA_COLORS.textSecondary}
              maxLength={100}
              style={styles.input}
            />
          </View>

          {/* Message */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Message</Text>
              <Text style={styles.charCount}>{message.length}/1000</Text>
            </View>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Type your message here. Groq AI will convert it to a WhatsApp-friendly format automatically..."
              placeholderTextColor={VITANA_COLORS.textSecondary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={1000}
              style={[styles.input, styles.textArea]}
            />
          </View>

          {/* Recipients */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Recipients</Text>
              <Text style={styles.recipientCount}>
                {recipients.length} selected
              </Text>
            </View>

            {/* Select from parents directory */}
            <TouchableOpacity
              style={[styles.selectFromDirBtn, { borderColor: primaryColor }]}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.75}
            >
              <Feather name="users" size={16} color={primaryColor} />
              <Text style={[styles.selectFromDirText, { color: primaryColor }]}>
                Select from Parent Directory
              </Text>
              <Feather name="chevron-right" size={16} color={primaryColor} />
            </TouchableOpacity>

            {/* Manual phone entry */}
            <View style={styles.manualRow}>
              <TextInput
                value={manualPhone}
                onChangeText={setManualPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={VITANA_COLORS.textSecondary}
                keyboardType="phone-pad"
                style={[styles.input, styles.manualInput]}
                returnKeyType="done"
                onSubmitEditing={addManualPhone}
              />
              <TouchableOpacity
                onPress={addManualPhone}
                style={[styles.addPhoneBtn, { backgroundColor: primaryColor }]}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Selected recipient chips */}
            {recipients.length > 0 && (
              <View style={styles.chipContainer}>
                {recipients.map((r) => (
                  <View key={r.phone} style={styles.chip}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.chipName} numberOfLines={1}>{r.name}</Text>
                      <Text style={styles.chipPhone}>{r.phone}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeRecipient(r.phone)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="x" size={14} color={VITANA_COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* AI Preview note */}
          <View style={styles.aiNote}>
            <View style={styles.aiBadge}>
              <Feather name="zap" size={11} color="#7c3aed" />
              <Text style={styles.aiBadgeText}>AI-Powered</Text>
            </View>
            <Text style={styles.aiNoteText}>
              Groq (Llama 4 Scout) will reformat your message into a concise, professional WhatsApp utility message before it's delivered. You'll see a preview in the confirmation.
            </Text>
          </View>

          {/* Send button */}
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: recipients.length > 0 && message.trim() ? '#25d366' : '#94a3b8' },
              broadcastMutation.isPending && { opacity: 0.7 },
            ]}
            onPress={handleSend}
            disabled={broadcastMutation.isPending || recipients.length === 0 || !message.trim()}
            activeOpacity={0.85}
          >
            {broadcastMutation.isPending ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={styles.sendBtnText}>AI Formatting & Sending…</Text>
              </>
            ) : (
              <>
                <Feather name="message-circle" size={20} color="#fff" />
                <Text style={styles.sendBtnText}>
                  Send to {recipients.length > 0 ? `${recipients.length} Recipient${recipients.length !== 1 ? 's' : ''}` : 'Recipients'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Parent picker modal */}
      <ParentPickerModal
        visible={pickerVisible}
        selected={selectedPhones}
        onToggle={toggleRecipient}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },

  scrollContent: { padding: 16, paddingBottom: 40, gap: 4 },

  costBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#f5f3ff', borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#e9d5ff',
  },
  costBannerText: { flex: 1, fontSize: 12, color: '#6d28d9', lineHeight: 17 },

  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: VITANA_COLORS.text },
  charCount: { fontSize: 11, color: VITANA_COLORS.textSecondary },
  recipientCount: { fontSize: 12, fontWeight: '600', color: '#25d366' },

  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 14, color: VITANA_COLORS.text, backgroundColor: '#fafafa',
  },
  textArea: { height: 120, paddingTop: 11, textAlignVertical: 'top' },

  selectFromDirBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14,
    borderStyle: 'dashed',
  },
  selectFromDirText: { flex: 1, fontSize: 14, fontWeight: '600' },

  manualRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  manualInput: { flex: 1 },
  addPhoneBtn: {
    width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },

  chipContainer: { gap: 8, marginTop: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  chipName: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.text },
  chipPhone: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 1 },

  aiNote: {
    backgroundColor: '#faf5ff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e9d5ff', marginBottom: 4, gap: 8,
  },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: '#f5f3ff', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1, borderColor: '#e9d5ff',
  },
  aiBadgeText: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },
  aiNoteText: { fontSize: 12, color: '#6d28d9', lineHeight: 18 },

  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, paddingVertical: 16, marginTop: 8,
  },
  sendBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

// ─── Picker Styles ────────────────────────────────────────────────────────────

const pickerStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: VITANA_COLORS.text },
  doneBtn: { fontSize: 15, fontWeight: '700' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginVertical: 10,
    backgroundColor: '#f1f5f9', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: VITANA_COLORS.text },

  selectedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 14, marginBottom: 6,
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6,
  },
  selectedBadgeText: { fontSize: 12, fontWeight: '700' },

  parentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 2, borderRadius: 10,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 16, fontWeight: '700', color: '#4f46e5' },
  parentName: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  parentPhone: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 1 },
  parentStudentName: { fontSize: 11, color: '#64748b', marginTop: 1 },
  unchecked: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#cbd5e1',
  },
});
