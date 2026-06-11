import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { studentApi } from '@/api/endpoints/student';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';

const OFFLINE_QUEUE_KEY = 'offline_assignment_queue';

interface QueuedSubmission {
  assignmentId: string;
  textContent: string;
  queuedAt: string;
}

async function queueOfflineSubmission(assignmentId: string, textContent: string): Promise<void> {
  const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  const queue: QueuedSubmission[] = existing ? (JSON.parse(existing) as QueuedSubmission[]) : [];
  const filtered = queue.filter((q) => q.assignmentId !== assignmentId);
  filtered.push({ assignmentId, textContent, queuedAt: new Date().toISOString() });
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
}

export default function SubmitAssignment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();
  const [textContent, setTextContent] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');

  const { data: assignment } = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => studentApi.getAssignmentDetail(id!),
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: () => studentApi.submitTextAssignment(id!, textContent),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['assignment', id] });
      void queryClient.invalidateQueries({ queryKey: ['student-assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      Alert.alert('Submitted!', 'Your assignment has been submitted successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to submit. Please try again.');
    },
  });

  async function handleSubmit() {
    if (!textContent.trim()) {
      Alert.alert('Empty', 'Please write your answer before submitting.');
      return;
    }

    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      await queueOfflineSubmission(id!, textContent);
      Alert.alert(
        'Saved Offline',
        'No internet connection. Your submission has been saved and will be sent when you reconnect.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
      return;
    }

    submitMutation.mutate();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="x" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text, marginLeft: 12 }}>
          Submit Assignment
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ padding: 16, gap: 14 }}>
          {/* Assignment title */}
          {assignment && (
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: VITANA_COLORS.border }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>{assignment.title}</Text>
              <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
                {assignment.subjectName} · Due {assignment.dueDate.split('T')[0]}
              </Text>
            </View>
          )}

          {/* Tab selector */}
          <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 4 }}>
            {(['text', 'file'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8,
                  backgroundColor: activeTab === tab ? '#fff' : 'transparent',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather
                    name={tab === 'text' ? 'edit-3' : 'paperclip'}
                    size={15}
                    color={activeTab === tab ? primaryColor : VITANA_COLORS.textSecondary}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: activeTab === tab ? '600' : '400',
                      color: activeTab === tab ? primaryColor : VITANA_COLORS.textSecondary,
                    }}
                  >
                    {tab === 'text' ? 'Write' : 'Upload File'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'text' ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text }}>
                Your Answer
              </Text>
              <TextInput
                value={textContent}
                onChangeText={setTextContent}
                multiline
                numberOfLines={12}
                placeholder="Write your answer here..."
                placeholderTextColor={VITANA_COLORS.textSecondary}
                maxLength={5000}
                textAlignVertical="top"
                style={{
                  backgroundColor: '#fff', borderRadius: 12, padding: 14,
                  fontSize: 14, color: VITANA_COLORS.text, lineHeight: 22,
                  borderWidth: 1, borderColor: VITANA_COLORS.border,
                  minHeight: 200,
                }}
              />
              <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, textAlign: 'right' }}>
                {textContent.length}/5000
              </Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: '#fff', borderRadius: 12, padding: 24,
                borderWidth: 1, borderColor: VITANA_COLORS.border,
                alignItems: 'center', borderStyle: 'dashed',
              }}
            >
              <Feather name="upload-cloud" size={40} color={VITANA_COLORS.textSecondary} />
              <Text style={{ fontSize: 15, color: VITANA_COLORS.text, fontWeight: '500', marginTop: 12 }}>
                File Upload
              </Text>
              <Text
                style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 18 }}
              >
                File upload requires an internet connection.{'\n'}
                Max file size: 10 MB
              </Text>
              <Text style={{ fontSize: 12, color: '#d97706', marginTop: 12 }}>
                File upload coming in a future update.{'\n'}Use text submission for now.
              </Text>
            </View>
          )}

          {activeTab === 'text' && (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitMutation.isPending || !textContent.trim()}
              style={{
                backgroundColor: textContent.trim() ? primaryColor : '#e2e8f0',
                borderRadius: 12, paddingVertical: 15,
                alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
              }}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Feather name="send" size={18} color={textContent.trim() ? '#fff' : VITANA_COLORS.textSecondary} />
              )}
              <Text
                style={{
                  color: textContent.trim() ? '#fff' : VITANA_COLORS.textSecondary,
                  fontWeight: '600', fontSize: 15,
                }}
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Assignment'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
