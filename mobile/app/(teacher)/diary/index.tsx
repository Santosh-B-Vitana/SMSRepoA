import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { teacherApi } from '@/api/endpoints/teacher';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';

interface DiaryEntry {
  id: string;
  classId: string;
  className: string;
  date: string;
  topic: string;
  content: string;
  homework?: string | null;
  createdAt: string;
}

export default function DiaryScreen() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();
  const [addModal, setAddModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [form, setForm] = useState({ classId: '', topic: '', content: '', homework: '' });

  const { data: assignments = [] } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: teacherApi.getTeacherAssignments,
    staleTime: 10 * 60 * 1000,
  });

  const { data: entries = [], isLoading, refetch, isFetching } = useQuery<DiaryEntry[]>({
    queryKey: ['diary', selectedClass],
    queryFn: () =>
      (apiClient.get('/diary', { params: { classId: selectedClass ?? undefined, pageSize: 50 } }) as Promise<any>)
        .then((r) => r?.items ?? r?.entries ?? r ?? []),
    staleTime: 5 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiClient.post('/diary', { ...data, date: new Date().toISOString().split('T')[0] }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['diary'] });
      setAddModal(false);
      setForm({ classId: '', topic: '', content: '', homework: '' });
    },
    onError: () => Alert.alert('Error', 'Failed to add diary entry.'),
  });

  function handleSubmit() {
    if (!form.classId) { Alert.alert('Required', 'Please select a class.'); return; }
    if (!form.topic.trim()) { Alert.alert('Required', 'Topic is required.'); return; }
    if (!form.content.trim()) { Alert.alert('Required', 'Content is required.'); return; }
    addMutation.mutate(form);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Class Diary" />

      {/* Class filter */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            <TouchableOpacity
              onPress={() => setSelectedClass(null)}
              style={[styles.chip, !selectedClass && { backgroundColor: primaryColor, borderColor: primaryColor }]}
            >
              <Text style={[styles.chipText, !selectedClass && { color: '#fff' }]}>All</Text>
            </TouchableOpacity>
            {assignments.map((a) => (
              <TouchableOpacity
                key={a.classId}
                onPress={() => setSelectedClass(a.classId)}
                style={[styles.chip, selectedClass === a.classId && { backgroundColor: primaryColor, borderColor: primaryColor }]}
              >
                <Text style={[styles.chipText, selectedClass === a.classId && { color: '#fff' }]}>{a.className}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={primaryColor} size="large" /></View>
      ) : entries.length === 0 ? (
        <EmptyState icon="book-open" title="No diary entries" subtitle="Start logging your class diary." />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshing={isFetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.dateBox, { backgroundColor: `${primaryColor}15` }]}>
                  <Text style={[styles.dateDay, { color: primaryColor }]}>
                    {new Date(item.date).getDate()}
                  </Text>
                  <Text style={[styles.dateMon, { color: primaryColor }]}>
                    {new Date(item.date).toLocaleDateString('en-IN', { month: 'short' })}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryClass}>{item.className}</Text>
                  <Text style={styles.entryTopic}>{item.topic}</Text>
                </View>
              </View>
              <Text style={styles.entryContent}>{item.content}</Text>
              {item.homework && (
                <View style={styles.hwBox}>
                  <Feather name="clipboard" size={12} color="#d97706" />
                  <Text style={styles.hwText}>Homework: {item.homework}</Text>
                </View>
              )}
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: primaryColor }]}
        onPress={() => setAddModal(true)}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={22} color="#fff" />
      </TouchableOpacity>

      <Modal visible={addModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAddModal(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Diary Entry</Text>
            <TouchableOpacity onPress={() => setAddModal(false)}>
              <Feather name="x" size={22} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              {/* Class selector */}
              <Text style={styles.fieldLabel}>Class *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[styles.chipRow, { marginBottom: 4 }]}>
                  {assignments.map((a) => (
                    <TouchableOpacity
                      key={a.classId}
                      onPress={() => setForm((f) => ({ ...f, classId: a.classId }))}
                      style={[styles.chip, form.classId === a.classId && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                    >
                      <Text style={[styles.chipText, form.classId === a.classId && { color: '#fff' }]}>{a.className}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.fieldLabel}>Topic *</Text>
              <TextInput
                style={styles.input}
                value={form.topic}
                onChangeText={(t) => setForm((f) => ({ ...f, topic: t }))}
                placeholder="e.g. Chapter 3: Photosynthesis"
                placeholderTextColor={VITANA_COLORS.textSecondary}
              />

              <Text style={styles.fieldLabel}>Content *</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={form.content}
                onChangeText={(t) => setForm((f) => ({ ...f, content: t }))}
                placeholder="What was covered in class today..."
                placeholderTextColor={VITANA_COLORS.textSecondary}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />

              <Text style={styles.fieldLabel}>Homework (optional)</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={form.homework}
                onChangeText={(t) => setForm((f) => ({ ...f, homework: t }))}
                placeholder="Homework assigned for today..."
                placeholderTextColor={VITANA_COLORS.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: primaryColor }, addMutation.isPending && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={addMutation.isPending}
              >
                {addMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Entry</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: VITANA_COLORS.background },
  filterWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border },
  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: VITANA_COLORS.border, backgroundColor: '#fff' },
  chipText: { fontSize: 13, fontWeight: '500', color: VITANA_COLORS.textSecondary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: VITANA_COLORS.border },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  dateBox: { width: 44, borderRadius: 10, alignItems: 'center', paddingVertical: 6 },
  dateDay: { fontSize: 18, fontWeight: '700' },
  dateMon: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  entryClass: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginBottom: 2 },
  entryTopic: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  entryContent: { fontSize: 13, color: VITANA_COLORS.textSecondary, lineHeight: 20, marginBottom: 8 },
  hwBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#fef9c3', borderRadius: 8, padding: 10 },
  hwText: { fontSize: 12, color: '#92400e', flex: 1 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6 },
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border },
  modalTitle: { fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text },
  modalContent: { padding: 20, gap: 12, paddingBottom: 40 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.textSecondary },
  input: { borderWidth: 1, borderColor: VITANA_COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: VITANA_COLORS.text, backgroundColor: '#fafafa' },
  multiline: { height: 100 },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
