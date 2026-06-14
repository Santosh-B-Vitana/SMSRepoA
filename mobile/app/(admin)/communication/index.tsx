import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

type Channel = 'sms' | 'whatsapp';
type Audience = 'All' | 'Parents' | 'Staff' | 'Students';

interface BlastPayload {
  channel: Channel;
  audience: Audience;
  message: string;
  subject?: string;
}

const CHANNELS = [
  { value: 'sms' as Channel,      label: 'SMS',       icon: 'message-square', color: '#059669' },
  { value: 'whatsapp' as Channel, label: 'WhatsApp',  icon: 'message-circle', color: '#25d366' },
];

const AUDIENCES = [
  { value: 'All' as Audience,      label: 'All Users',  icon: 'users' },
  { value: 'Parents' as Audience,  label: 'Parents',    icon: 'user' },
  { value: 'Staff' as Audience,    label: 'Staff',      icon: 'briefcase' },
  { value: 'Students' as Audience, label: 'Students',   icon: 'book-open' },
];

export default function CommunicationBlastScreen() {
  const { primaryColor } = useSchoolTheme();
  const [channel, setChannel] = useState<Channel>('sms');
  const [audience, setAudience] = useState<Audience>('All');
  const [message, setMessage] = useState('');

  const smsLimit = 160;
  const whatsappLimit = 1024;
  const limit = channel === 'sms' ? smsLimit : whatsappLimit;

  const blastMutation = useMutation({
    mutationFn: (payload: BlastPayload) =>
      apiClient.post('/communication/blast', {
        channel: payload.channel,
        targetAudience: payload.audience,
        message: payload.message,
      }),
    onSuccess: () => {
      Alert.alert(
        'Message Sent',
        `${channel.toUpperCase()} blast sent to all ${audience.toLowerCase()} successfully.`,
        [{ text: 'OK', onPress: () => setMessage('') }]
      );
    },
    onError: (err: any) => Alert.alert('Error', err?.message ?? 'Failed to send message'),
  });

  function handleSend() {
    if (!message.trim()) { Alert.alert('Validation', 'Message cannot be empty.'); return; }
    if (message.length > limit) { Alert.alert('Validation', `Message exceeds ${limit} character limit for ${channel.toUpperCase()}.`); return; }

    const channelLabel = channel === 'sms' ? 'SMS' : 'WhatsApp';
    const audienceLabel = AUDIENCES.find(a => a.value === audience)?.label ?? audience;

    Alert.alert(
      `Send ${channelLabel} Blast`,
      `Send this ${channelLabel} to all ${audienceLabel.toLowerCase()}? This will contact their registered mobile numbers.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => blastMutation.mutate({ channel, audience, message }) },
      ]
    );
  }

  const charColor = message.length > limit ? '#dc2626' : message.length > limit * 0.8 ? '#d97706' : VITANA_COLORS.textSecondary;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Send Message Blast" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">

          {/* Channel */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Channel</Text>
            <View style={styles.channelRow}>
              {CHANNELS.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[
                    styles.channelCard,
                    channel === c.value && { borderColor: c.color, backgroundColor: `${c.color}08` },
                  ]}
                  onPress={() => setChannel(c.value)}
                >
                  <View style={[styles.channelIcon, { backgroundColor: `${c.color}18` }]}>
                    <Feather name={c.icon as any} size={22} color={c.color} />
                  </View>
                  <Text style={[styles.channelLabel, channel === c.value && { color: c.color, fontWeight: '700' }]}>
                    {c.label}
                  </Text>
                  {channel === c.value && (
                    <Feather name="check-circle" size={16} color={c.color} style={{ position: 'absolute', top: 8, right: 8 }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {channel === 'sms' && (
              <View style={styles.channelNote}>
                <Feather name="info" size={12} color="#64748b" />
                <Text style={styles.channelNoteText}>SMS will be sent to all registered mobile numbers. Standard charges apply.</Text>
              </View>
            )}
            {channel === 'whatsapp' && (
              <View style={[styles.channelNote, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                <Feather name="info" size={12} color="#059669" />
                <Text style={[styles.channelNoteText, { color: '#166534' }]}>WhatsApp requires opt-in. Only opted-in users will receive messages.</Text>
              </View>
            )}
          </View>

          {/* Audience */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recipients</Text>
            <View style={styles.audienceGrid}>
              {AUDIENCES.map((a) => (
                <TouchableOpacity
                  key={a.value}
                  style={[
                    styles.audienceCard,
                    audience === a.value && { borderColor: primaryColor, backgroundColor: `${primaryColor}08` },
                  ]}
                  onPress={() => setAudience(a.value)}
                >
                  <Feather name={a.icon as any} size={18} color={audience === a.value ? primaryColor : VITANA_COLORS.textSecondary} />
                  <Text style={[styles.audienceLabel, audience === a.value && { color: primaryColor, fontWeight: '700' }]}>
                    {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Message */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.sectionTitle}>Message</Text>
              <Text style={[styles.charCount, { color: charColor }]}>{message.length}/{limit}</Text>
            </View>
            <TextInput
              style={[styles.messageInput, message.length > limit && { borderColor: '#dc2626' }]}
              value={message}
              onChangeText={setMessage}
              placeholder={
                channel === 'sms'
                  ? 'Type your SMS message here (160 chars)...'
                  : 'Type your WhatsApp message here...'
              }
              placeholderTextColor={VITANA_COLORS.textSecondary}
              multiline
              maxLength={channel === 'whatsapp' ? 1024 : undefined}
              textAlignVertical="top"
            />
            {channel === 'sms' && message.length > smsLimit && (
              <Text style={styles.limitWarning}>Message exceeds 1 SMS. It will be split into {Math.ceil(message.length / smsLimit)} parts.</Text>
            )}
          </View>

          {/* Preview */}
          {message.trim().length > 0 && (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Preview</Text>
              <View style={[styles.previewBubble, channel === 'whatsapp' && { backgroundColor: '#dcf8c6' }]}>
                <Text style={styles.previewText}>{message}</Text>
                <Text style={styles.previewTime}>Just now</Text>
              </View>
            </View>
          )}

          {/* Send */}
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: channel === 'whatsapp' ? '#25d366' : primaryColor },
              blastMutation.isPending && { opacity: 0.6 },
            ]}
            onPress={handleSend}
            disabled={blastMutation.isPending}
          >
            {blastMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name={channel === 'whatsapp' ? 'message-circle' : 'send'} size={18} color="#fff" />
                <Text style={styles.sendText}>
                  Send {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} to {AUDIENCES.find(a => a.value === audience)?.label}
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
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 12, fontFamily: 'Poppins' },
  channelRow: { flexDirection: 'row', gap: 12 },
  channelCard: {
    flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#fff', padding: 16, alignItems: 'center', gap: 8,
  },
  channelIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  channelLabel: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  channelNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, padding: 10, marginTop: 12,
  },
  channelNoteText: { flex: 1, fontSize: 12, color: '#64748b', lineHeight: 17 },
  audienceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  audienceCard: {
    width: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#fff', padding: 12,
  },
  audienceLabel: { fontSize: 13, fontWeight: '500', color: VITANA_COLORS.textSecondary },
  messageInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    color: VITANA_COLORS.text, backgroundColor: '#fafafa',
    minHeight: 140, textAlignVertical: 'top',
  },
  charCount: { fontSize: 12, fontWeight: '600' },
  limitWarning: { fontSize: 12, color: '#d97706', marginTop: 6 },
  preview: { marginBottom: 14 },
  previewLabel: { fontSize: 11, fontWeight: '600', color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  previewBubble: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', maxWidth: '80%' },
  previewText: { fontSize: 14, color: VITANA_COLORS.text, lineHeight: 20 },
  previewTime: { fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: 'right' },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, paddingVertical: 15,
  },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
