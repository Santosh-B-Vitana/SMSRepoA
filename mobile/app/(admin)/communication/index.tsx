/**
 * WhatsApp Communication Hub (Admin)
 *
 * IMPORTANT — WhatsApp Business API constraints:
 * ─────────────────────────────────────────────
 * Business-initiated messages (admin → parent/staff) MUST use
 * Meta-approved message templates. Free-form text is only allowed
 * if a user contacts the school first (within a 24-hour window).
 *
 * Each sent message is counted against the school's WhatsApp
 * subscription quota (stored in WhatsappSubscription.MessagesUsed).
 *
 * SMS has been disabled in favour of WhatsApp.
 */

import { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Modal, ScrollView,
  TextInput, ActivityIndicator, Alert, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WhatsAppTemplate {
  id: string;
  name: string;
  displayName?: string;
  category: 'Marketing' | 'Utility' | 'Authentication';
  language: string;
  status: 'Approved' | 'Pending' | 'Rejected' | 'Draft';
  body: string;
  headerText?: string;
  footerText?: string;
  placeholders?: string[];
}

interface WhatsAppUsage {
  messagesUsed: number;
  messagesQuota: number;
  messagesRemaining: number;
  periodStart?: string;
  periodEnd?: string;
  renewalPolicy?: string;
}

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; icon: string; description: string }> = {
  Marketing:      { color: '#d97706', bg: '#fffbeb', icon: 'trending-up',   description: 'Promotions, offers, announcements' },
  Utility:        { color: '#2563eb', bg: '#eff6ff', icon: 'tool',          description: 'Fee reminders, attendance alerts' },
  Authentication: { color: '#7c3aed', bg: '#f5f3ff', icon: 'shield',        description: 'OTPs, verification codes' },
};

// ─── Quota Bar ────────────────────────────────────────────────────────────────

function QuotaBar({ usage }: { usage: WhatsAppUsage }) {
  const { primaryColor } = useSchoolTheme();
  const pct = usage.messagesQuota > 0 ? (usage.messagesUsed / usage.messagesQuota) * 100 : 0;
  const barColor = pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#25d366';

  return (
    <View style={styles.quotaCard}>
      <View style={styles.quotaHeader}>
        <View style={styles.quotaLeft}>
          <View style={[styles.waIconSmall, { backgroundColor: '#25d36620' }]}>
            <Feather name="message-circle" size={16} color="#25d366" />
          </View>
          <Text style={styles.quotaTitle}>WhatsApp Quota</Text>
        </View>
        <Text style={[styles.quotaRemaining, { color: barColor }]}>
          {usage.messagesRemaining.toLocaleString('en-IN')} remaining
        </Text>
      </View>
      <View style={styles.quotaBarTrack}>
        <View style={[styles.quotaBarFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: barColor }]} />
      </View>
      <Text style={styles.quotaMeta}>
        {usage.messagesUsed.toLocaleString('en-IN')} of {usage.messagesQuota.toLocaleString('en-IN')} messages used this period
      </Text>
    </View>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({ item, onSelect }: { item: WhatsAppTemplate; onSelect: () => void }) {
  const { primaryColor } = useSchoolTheme();
  const catConf = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.Utility;

  return (
    <TouchableOpacity style={styles.templateCard} onPress={onSelect} activeOpacity={0.75}>
      {/* Header row */}
      <View style={styles.templateHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.templateName}>{item.displayName ?? item.name}</Text>
          <Text style={styles.templateLang}>{item.language}</Text>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: catConf.bg }]}>
          <Feather name={catConf.icon as any} size={10} color={catConf.color} />
          <Text style={[styles.categoryText, { color: catConf.color }]}>{item.category}</Text>
        </View>
      </View>

      {/* Body preview */}
      <View style={styles.templatePreview}>
        <Text style={styles.templateBody} numberOfLines={3}>{item.body}</Text>
      </View>

      {/* Placeholders if any */}
      {(item.placeholders?.length ?? 0) > 0 && (
        <View style={styles.placeholderRow}>
          <Feather name="edit-2" size={11} color={VITANA_COLORS.textSecondary} />
          <Text style={styles.placeholderHint}>
            Requires: {item.placeholders!.slice(0, 4).join(', ')}
            {(item.placeholders!.length ?? 0) > 4 ? ` +${item.placeholders!.length - 4} more` : ''}
          </Text>
        </View>
      )}

      <View style={styles.templateFooter}>
        <View style={[styles.approvedBadge]}>
          <Feather name="check-circle" size={11} color="#059669" />
          <Text style={styles.approvedText}>Approved by Meta</Text>
        </View>
        <View style={[styles.sendBtn, { backgroundColor: '#25d366' }]}>
          <Feather name="send" size={12} color="#fff" />
          <Text style={styles.sendBtnText}>Use Template</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Send Modal ───────────────────────────────────────────────────────────────

function SendModal({
  template,
  onClose,
  onSent,
}: {
  template: WhatsAppTemplate;
  onClose: () => void;
  onSent: () => void;
}) {
  const { primaryColor } = useSchoolTheme();
  const [phone, setPhone] = useState('');
  const [vars, setVars] = useState<Record<string, string>>({});

  const placeholders = template.placeholders ?? [];

  // Build preview with filled variables
  let preview = template.body;
  placeholders.forEach((p) => {
    const val = vars[p];
    preview = preview.replace(new RegExp(`{{${p}}}`, 'g'), val ? `[${val}]` : `{{${p}}}`);
  });

  const sendMutation = useMutation({
    mutationFn: () => {
      if (!phone.trim()) throw new Error('Recipient phone number is required');
      return apiClient.post('/whatsapp/messages/test', {
        templateName: template.name,
        recipientPhone: phone.trim().replace(/\s+/g, ''),
        placeholders: vars,
      });
    },
    onSuccess: () => {
      Alert.alert('Sent!', 'WhatsApp template message queued for delivery.', [
        { text: 'OK', onPress: onSent },
      ]);
    },
    onError: (err: any) =>
      Alert.alert('Failed', err?.message ?? 'Could not send WhatsApp message. Check the phone number and try again.'),
  });

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={20} color={VITANA_COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{template.displayName ?? template.name}</Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">

            {/* Live preview */}
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={[styles.waIconSmall, { backgroundColor: '#25d36620' }]}>
                  <Feather name="message-circle" size={14} color="#25d366" />
                </View>
                <Text style={styles.previewLabel}>Message Preview</Text>
              </View>
              {template.headerText && (
                <Text style={styles.previewHeaderText}>{template.headerText}</Text>
              )}
              <Text style={styles.previewBody}>{preview}</Text>
              {template.footerText && (
                <Text style={styles.previewFooterText}>{template.footerText}</Text>
              )}
            </View>

            {/* Variable inputs */}
            {placeholders.length > 0 && (
              <View>
                <Text style={styles.sectionLabel}>Fill in Placeholders</Text>
                {placeholders.map((p) => (
                  <View key={p} style={{ marginBottom: 12 }}>
                    <Text style={styles.fieldLabel}>
                      {`{{${p}}}`}
                    </Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={vars[p] ?? ''}
                      onChangeText={(v) => setVars((prev) => ({ ...prev, [p]: v }))}
                      placeholder={`Enter ${p}...`}
                      placeholderTextColor={VITANA_COLORS.textSecondary}
                    />
                  </View>
                ))}
              </View>
            )}

            {/* Recipient phone */}
            <View>
              <Text style={styles.sectionLabel}>Recipient Phone Number</Text>
              <TextInput
                style={styles.fieldInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={VITANA_COLORS.textSecondary}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
              <Text style={styles.phoneHint}>
                Include country code. Must be an opted-in WhatsApp number.
              </Text>
            </View>

            {/* Template info */}
            <View style={styles.infoBox}>
              <Feather name="info" size={13} color="#2563eb" />
              <Text style={styles.infoText}>
                This sends a <Text style={{ fontWeight: '700' }}>Meta-approved template</Text> message.
                It counts against your school's monthly WhatsApp quota.
                Recipients must have opted in to receive WhatsApp messages from your school.
              </Text>
            </View>

            {/* Send button */}
            <TouchableOpacity
              style={[styles.sendFullBtn, sendMutation.isPending && { opacity: 0.6 }]}
              onPress={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="message-circle" size={18} color="#fff" />
                  <Text style={styles.sendFullBtnText}>Send WhatsApp Message</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WhatsAppCommunicationScreen() {
  const { primaryColor } = useSchoolTheme();
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);

  const { data: templates, isLoading: templatesLoading, refetch } = useQuery<WhatsAppTemplate[]>({
    queryKey: ['wa-templates-approved'],
    queryFn: () =>
      (apiClient.get('/whatsapp/templates', { params: { status: 'approved' } }) as Promise<any>)
        .then((r: any) => r?.templates ?? r?.items ?? r?.data ?? (Array.isArray(r) ? r : [])),
    staleTime: 5 * 60 * 1000,
  });

  const { data: usage } = useQuery<WhatsAppUsage>({
    queryKey: ['wa-usage'],
    queryFn: () =>
      (apiClient.get('/whatsapp/usage') as Promise<any>)
        .then((r: any) => ({
          messagesUsed: r?.messagesUsed ?? r?.used ?? 0,
          messagesQuota: r?.messagesQuota ?? r?.quota ?? 0,
          messagesRemaining: r?.messagesRemaining ?? r?.remaining ?? 0,
          periodStart: r?.periodStart,
          periodEnd: r?.periodEnd,
          renewalPolicy: r?.renewalPolicy,
        })),
    staleTime: 2 * 60 * 1000,
  });

  const approvedTemplates = Array.isArray(templates) ? templates.filter((t) => t.status === 'Approved' || !t.status) : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="WhatsApp Communication" />

      {/* How WhatsApp works — educational strip */}
      <View style={styles.educationStrip}>
        <Feather name="alert-circle" size={13} color="#2563eb" />
        <Text style={styles.educationText}>
          <Text style={{ fontWeight: '700' }}>Templates only.</Text> WhatsApp Business requires
          Meta-approved templates for all outbound messages. Free-form text is not supported for school-initiated messages.
        </Text>
      </View>

      {/* CRM Broadcast shortcut */}
      <TouchableOpacity
        style={styles.crmBroadcastBtn}
        onPress={() => router.push('/(admin)/communication/broadcast')}
        activeOpacity={0.8}
      >
        <View style={styles.crmBroadcastLeft}>
          <View style={styles.crmBroadcastIcon}>
            <Feather name="send" size={16} color="#fff" />
          </View>
          <View>
            <Text style={styles.crmBroadcastTitle}>Send to Specific Parents</Text>
            <Text style={styles.crmBroadcastSub}>Groq AI formats · Utility rate · Targeted send</Text>
          </View>
        </View>
        <Feather name="chevron-right" size={16} color="#25d366" />
      </TouchableOpacity>

      <FlatList
        data={approvedTemplates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        refreshing={false}
        onRefresh={refetch}
        ListHeaderComponent={
          <>
            {/* Quota card */}
            {usage && <QuotaBar usage={usage} />}

            {/* Section label */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Approved Templates</Text>
              <View style={styles.waTag}>
                <Feather name="message-circle" size={13} color="#25d366" />
                <Text style={styles.waTagText}>WhatsApp</Text>
              </View>
            </View>
          </>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <TemplateCard item={item} onSelect={() => setSelectedTemplate(item)} />
        )}
        ListEmptyComponent={
          templatesLoading ? (
            <View style={{ padding: 48, alignItems: 'center' }}>
              <ActivityIndicator color="#25d366" size="large" />
              <Text style={{ color: VITANA_COLORS.textSecondary, marginTop: 12, fontSize: 13 }}>
                Loading approved templates...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Feather name="message-circle" size={36} color="#25d366" />
              </View>
              <Text style={styles.emptyTitle}>No approved templates yet</Text>
              <Text style={styles.emptyBody}>
                WhatsApp Business requires every outbound message to use a Meta-approved template.
              </Text>

              <View style={styles.stepsCard}>
                <Text style={styles.stepsTitle}>How to get templates approved:</Text>
                {[
                  { n: '1', text: 'Open the CRM portal (web browser)' },
                  { n: '2', text: 'Go to WhatsApp → Templates → Create Template' },
                  { n: '3', text: 'Write your template with {{placeholders}}' },
                  { n: '4', text: 'Submit to Meta for approval' },
                  { n: '5', text: 'Approval typically takes a few hours to 2 days' },
                  { n: '6', text: 'Once approved, templates appear here for sending' },
                ].map((step) => (
                  <View key={step.n} style={styles.stepRow}>
                    <View style={styles.stepNum}>
                      <Text style={styles.stepNumText}>{step.n}</Text>
                    </View>
                    <Text style={styles.stepText}>{step.text}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.autoNoteCard}>
                <Feather name="zap" size={14} color="#7c3aed" />
                <Text style={styles.autoNoteText}>
                  Automatic WhatsApp notifications (fee reminders, attendance alerts, exam results)
                  are sent by the system using pre-configured template mappings — no manual action needed.
                </Text>
              </View>
            </View>
          )
        }
      />

      {/* Send modal */}
      {selectedTemplate && (
        <SendModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onSent={() => setSelectedTemplate(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },

  educationStrip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#eff6ff', borderBottomWidth: 1, borderBottomColor: '#dbeafe',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  educationText: { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 17 },

  crmBroadcastBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 14, marginTop: 10, marginBottom: 2,
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: '#bbf7d0',
  },
  crmBroadcastLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  crmBroadcastIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#25d366',
    alignItems: 'center', justifyContent: 'center',
  },
  crmBroadcastTitle: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text },
  crmBroadcastSub: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 1 },

  quotaCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16, gap: 8,
  },
  quotaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quotaLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waIconSmall: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  quotaTitle: { fontSize: 13, fontWeight: '700', color: VITANA_COLORS.text },
  quotaRemaining: { fontSize: 13, fontWeight: '700' },
  quotaBarTrack: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  quotaBarFill: { height: 6, borderRadius: 3 },
  quotaMeta: { fontSize: 11, color: VITANA_COLORS.textSecondary },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionHeading: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text },
  waTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#25d36618' },
  waTagText: { fontSize: 12, fontWeight: '700', color: '#25d366' },

  templateCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9', gap: 10,
  },
  templateHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  templateName: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text },
  templateLang: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  categoryText: { fontSize: 10, fontWeight: '700' },

  templatePreview: {
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#25d366',
  },
  templateBody: { fontSize: 13, color: VITANA_COLORS.text, lineHeight: 19 },

  placeholderRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  placeholderHint: { fontSize: 11, color: VITANA_COLORS.textSecondary, flex: 1 },

  templateFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  approvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  approvedText: { fontSize: 11, fontWeight: '600', color: '#059669' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  sendBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: VITANA_COLORS.text },

  previewCard: { backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14, gap: 6, borderWidth: 1, borderColor: '#bbf7d0' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  previewLabel: { fontSize: 11, fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: 0.4 },
  previewHeaderText: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text },
  previewBody: { fontSize: 14, color: VITANA_COLORS.text, lineHeight: 20 },
  previewFooterText: { fontSize: 12, color: VITANA_COLORS.textSecondary, fontStyle: 'italic', marginTop: 4 },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 10 },
  fieldLabel: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginBottom: 5, fontFamily: 'monospace' },
  fieldInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 14,
    color: VITANA_COLORS.text, backgroundColor: '#fafafa',
  },
  phoneHint: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 4 },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#dbeafe',
  },
  infoText: { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 18 },

  sendFullBtn: {
    backgroundColor: '#25d366', borderRadius: 14, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  sendFullBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Empty state
  emptyState: { padding: 20, gap: 14, alignItems: 'center' },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#25d36615', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text },
  emptyBody: { fontSize: 13, color: VITANA_COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },

  stepsCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#f1f5f9', alignSelf: 'stretch', gap: 10,
  },
  stepsTitle: { fontSize: 13, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#25d366', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNumText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  stepText: { flex: 1, fontSize: 13, color: VITANA_COLORS.text, lineHeight: 19 },

  autoNoteCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#f5f3ff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e9d5ff', alignSelf: 'stretch',
  },
  autoNoteText: { flex: 1, fontSize: 12, color: '#6d28d9', lineHeight: 18 },
});
