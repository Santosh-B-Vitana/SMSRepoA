import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, FlatList,
  ActivityIndicator, RefreshControl, Alert, StyleSheet, Switch,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import {
  adminApi,
  ClassItem, SectionItem, ClassSubjectItem, TeacherAssignmentItem,
} from '@/api/endpoints/admin';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

// ─── Step state for multi-step assignment flow ───────────────────────────────

type Step = 'class' | 'section' | 'subject' | 'confirm';

interface Draft {
  class: ClassItem | null;
  section: SectionItem | null;
  subject: ClassSubjectItem | null;
  isClassTeacher: boolean;
}

const EMPTY_DRAFT: Draft = { class: null, section: null, subject: null, isClassTeacher: false };

// ─── Assignment card ─────────────────────────────────────────────────────────

function AssignmentCard({
  item, primaryColor, onRemove, removing,
}: {
  item: TeacherAssignmentItem;
  primaryColor: string;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <View style={styles.assignCard}>
      <View style={styles.assignCardIcon}>
        <Feather name="book" size={16} color={primaryColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.assignCardClass}>
          {item.className}{item.sectionName ? ` – ${item.sectionName}` : ''}
        </Text>
        {item.subjectName ? (
          <Text style={styles.assignCardSubject}>{item.subjectName}</Text>
        ) : (
          <Text style={[styles.assignCardSubject, { fontStyle: 'italic' }]}>No subject assigned</Text>
        )}
        {item.isClassTeacher && (
          <View style={styles.classTeacherBadge}>
            <Text style={styles.classTeacherText}>Class Teacher</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        onPress={onRemove}
        disabled={removing}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.removeBtn}
      >
        {removing ? (
          <ActivityIndicator size="small" color="#ef4444" />
        ) : (
          <Feather name="trash-2" size={16} color="#ef4444" />
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Picker row used inside modal lists ──────────────────────────────────────

function PickerRow({
  label, subtitle, selected, onPress,
}: {
  label: string; subtitle?: string; selected: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.pickerRow} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={styles.pickerLabel}>{label}</Text>
        {subtitle ? <Text style={styles.pickerSub}>{subtitle}</Text> : null}
      </View>
      {selected && <Feather name="check" size={16} color="#2563eb" />}
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AssignClassesScreen() {
  const { id: staffId, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();

  // Hooks must be called unconditionally before any early return.
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<Step>('class');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // ── Data queries ────────────────────────────────────────────────────────────

  const { data: assignmentsData, isLoading: assignmentsLoading, refetch, isRefetching } = useQuery({
    queryKey: ['staff-assignments', staffId],
    queryFn: () => adminApi.getTeacherAssignmentsForStaff(staffId!),
    enabled: !!staffId,
    staleTime: 60 * 1000,
  });

  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: adminApi.getClasses,
    enabled: !!staffId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: sectionsData, isLoading: sectionsLoading } = useQuery({
    queryKey: ['admin-sections', draft.class?.id],
    queryFn: () => adminApi.getSections(draft.class!.id),
    enabled: !!staffId && !!draft.class && step === 'section',
    staleTime: 5 * 60 * 1000,
  });

  const { data: subjectsData, isLoading: subjectsLoading } = useQuery({
    queryKey: ['admin-class-subjects', draft.class?.id],
    queryFn: () => adminApi.getClassSubjects(draft.class!.id),
    enabled: !!staffId && !!draft.class && step === 'subject',
    staleTime: 5 * 60 * 1000,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────

  const assignMutation = useMutation({
    mutationFn: adminApi.assignTeacher,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['staff-assignments', staffId] });
      void queryClient.invalidateQueries({ queryKey: ['admin-staff-profile', staffId] });
      closeModal();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message ?? 'Failed to assign teacher');
    },
  });

  const removeMutation = useMutation({
    mutationFn: adminApi.removeTeacherAssignment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['staff-assignments', staffId] });
      void queryClient.invalidateQueries({ queryKey: ['admin-staff-profile', staffId] });
      setRemovingId(null);
    },
    onError: (err: any) => {
      setRemovingId(null);
      Alert.alert('Error', err?.message ?? 'Failed to remove assignment');
    },
  });

  // ── Modal helpers ───────────────────────────────────────────────────────────

  function openModal() {
    setDraft(EMPTY_DRAFT);
    setStep('class');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setDraft(EMPTY_DRAFT);
    setStep('class');
  }

  function handleClassSelect(cls: ClassItem) {
    setDraft({ ...EMPTY_DRAFT, class: cls });
    setStep('section');
  }

  function handleSectionSelect(section: SectionItem | 'skip') {
    setDraft((d) => ({ ...d, section: section === 'skip' ? null : section }));
    setStep('subject');
  }

  function handleSubjectSelect(subject: ClassSubjectItem | 'skip') {
    setDraft((d) => ({ ...d, subject: subject === 'skip' ? null : subject }));
    setStep('confirm');
  }

  function handleSubmit() {
    if (!draft.class) return;
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;
    assignMutation.mutate({
      staffId,
      classId: draft.class.id,
      sectionId: draft.section?.id ?? null,
      subjectId: draft.subject?.subjectId ?? null,
      isClassTeacher: draft.isClassTeacher,
      academicYear,
    });
  }

  function confirmRemove(item: TeacherAssignmentItem) {
    const classLabel = item.className || '—';
    const detail = [
      item.sectionName ? `Section ${item.sectionName}` : null,
      item.subjectName ?? null,
    ].filter(Boolean).join(', ');
    Alert.alert(
      'Remove Assignment',
      `Remove ${classLabel}${detail ? ` (${detail})` : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setRemovingId(item.id);
            removeMutation.mutate(item.id);
          },
        },
      ],
    );
  }

  const assignments = assignmentsData?.assignments ?? [];

  // ── Guard: this screen requires a staffId param ──────────────────────────
  // Navigated from the staff profile; not reachable from the tab bar.

  if (!staffId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <SubScreenHeader title="Assign Classes" />
        <View style={[styles.emptyWrap, { flex: 1 }]}>
          <Feather name="alert-circle" size={36} color={VITANA_COLORS.border} />
          <Text style={styles.emptyTitle}>No teacher selected</Text>
          <Text style={styles.emptyHint}>Open a staff profile and tap "Assign Classes" to use this screen.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Modal step renderers ────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {
      case 'class':
        return (
          <>
            <Text style={styles.stepTitle}>Select Class</Text>
            {classesLoading ? (
              <ActivityIndicator style={{ padding: 32 }} color={primaryColor} />
            ) : (
              <FlatList
                data={classesData?.classes ?? []}
                keyExtractor={(c) => c.id}
                renderItem={({ item }) => (
                  <PickerRow
                    label={item.name || item.displayName || (item.standard ? `Class ${item.standard}` : 'Unknown Class')}
                    subtitle={[item.section ? `Section ${item.section}` : null, item.academicYear].filter(Boolean).join(' · ')}
                    selected={draft.class?.id === item.id}
                    onPress={() => handleClassSelect(item)}
                  />
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No classes found</Text>
                }
                ItemSeparatorComponent={() => <View style={styles.divider} />}
              />
            )}
          </>
        );

      case 'section':
        return (
          <>
            <Text style={styles.stepTitle}>
              Select Section{' '}
              <Text style={styles.stepSub}>
                for {draft.class?.name || draft.class?.displayName || draft.class?.standard}
              </Text>
            </Text>
            {sectionsLoading ? (
              <ActivityIndicator style={{ padding: 32 }} color={primaryColor} />
            ) : (
              <FlatList
                data={sectionsData?.sections ?? []}
                keyExtractor={(s) => s.id}
                ListHeaderComponent={
                  <PickerRow
                    label="No specific section"
                    subtitle="Assign to the full class"
                    selected={!draft.section}
                    onPress={() => handleSectionSelect('skip')}
                  />
                }
                renderItem={({ item }) => (
                  <PickerRow
                    label={item.name}
                    selected={draft.section?.id === item.id}
                    onPress={() => handleSectionSelect(item)}
                  />
                )}
                ItemSeparatorComponent={() => <View style={styles.divider} />}
              />
            )}
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('class')}>
              <Feather name="arrow-left" size={14} color={VITANA_COLORS.textSecondary} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          </>
        );

      case 'subject':
        return (
          <>
            <Text style={styles.stepTitle}>
              Select Subject <Text style={styles.stepSub}>optional</Text>
            </Text>
            {subjectsLoading ? (
              <ActivityIndicator style={{ padding: 32 }} color={primaryColor} />
            ) : (
              <FlatList
                data={subjectsData ?? []}
                keyExtractor={(s) => s.id}
                ListHeaderComponent={
                  <PickerRow
                    label="No specific subject"
                    subtitle="Assign as general class assignment"
                    selected={!draft.subject}
                    onPress={() => handleSubjectSelect('skip')}
                  />
                }
                renderItem={({ item }) => (
                  <PickerRow
                    label={item.subjectName}
                    subtitle={item.subjectCode}
                    selected={draft.subject?.subjectId === item.subjectId}
                    onPress={() => handleSubjectSelect(item)}
                  />
                )}
                ListEmptyComponent={
                  <PickerRow
                    label="No subjects found for this class"
                    selected={false}
                    onPress={() => handleSubjectSelect('skip')}
                  />
                }
                ItemSeparatorComponent={() => <View style={styles.divider} />}
              />
            )}
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('section')}>
              <Feather name="arrow-left" size={14} color={VITANA_COLORS.textSecondary} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          </>
        );

      case 'confirm':
        return (
          <>
            <Text style={styles.stepTitle}>Confirm Assignment</Text>
            <View style={styles.confirmCard}>
              <ConfirmRow label="Class" value={draft.class?.name || draft.class?.displayName || draft.class?.standard || '—'} />
              <ConfirmRow label="Section" value={draft.section?.name ?? 'None (all sections)'} />
              <ConfirmRow label="Subject" value={draft.subject?.subjectName ?? 'None (general)'} />
            </View>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Set as Class Teacher</Text>
                <Text style={styles.switchSub}>Makes this teacher the homeroom teacher for the class</Text>
              </View>
              <Switch
                value={draft.isClassTeacher}
                onValueChange={(val) => setDraft((d) => ({ ...d, isClassTeacher: val }))}
                trackColor={{ false: '#e5e7eb', true: `${primaryColor}55` }}
                thumbColor={draft.isClassTeacher ? primaryColor : '#9ca3af'}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: primaryColor }, assignMutation.isPending && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Assign Teacher</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('subject')}>
              <Feather name="arrow-left" size={14} color={VITANA_COLORS.textSecondary} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          </>
        );
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title={`Assign Classes – ${name ?? 'Teacher'}`} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Section header + Add button */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Current Assignments</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: primaryColor }]}
            onPress={openModal}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {assignmentsLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator color={primaryColor} />
          </View>
        ) : assignments.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather name="inbox" size={36} color={VITANA_COLORS.border} />
            <Text style={styles.emptyTitle}>No assignments yet</Text>
            <Text style={styles.emptyHint}>Tap Add to assign a class or subject</Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {assignments.map((item) => (
              <AssignmentCard
                key={item.id}
                item={item}
                primaryColor={primaryColor}
                removing={removingId === item.id}
                onRemove={() => confirmRemove(item)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Multi-step modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Assignment</Text>
            <TouchableOpacity onPress={closeModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Progress indicator */}
          <View style={styles.progressRow}>
            {(['class', 'section', 'subject', 'confirm'] as Step[]).map((s, i) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  step === s && { backgroundColor: primaryColor },
                  (['class', 'section', 'subject', 'confirm'] as Step[]).indexOf(step) > i && { backgroundColor: `${primaryColor}55` },
                ]}
              />
            ))}
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderStep()}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.confirmRow}>
      <Text style={styles.confirmLabel}>{label}</Text>
      <Text style={styles.confirmValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { padding: 16, paddingBottom: 40 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: VITANA_COLORS.text },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: VITANA_COLORS.textSecondary },
  emptyHint: { fontSize: 13, color: '#9ca3af' },

  listWrap: { gap: 10 },

  assignCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 14, gap: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  assignCardIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
  },
  assignCardClass: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  assignCardSubject: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  classTeacherBadge: {
    alignSelf: 'flex-start', marginTop: 5,
    backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  classTeacherText: { fontSize: 10, fontWeight: '600', color: '#166534' },
  removeBtn: { padding: 6 },

  // Modal
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text },
  progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingVertical: 12 },
  progressDot: { height: 4, flex: 1, borderRadius: 2, backgroundColor: '#e5e7eb' },
  modalContent: { padding: 20, paddingBottom: 40 },

  stepTitle: { fontSize: 16, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 16 },
  stepSub: { fontSize: 13, fontWeight: '400', color: VITANA_COLORS.textSecondary },

  pickerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 4,
  },
  pickerLabel: { fontSize: 15, color: VITANA_COLORS.text, fontWeight: '500' },
  pickerSub: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f3f4f6' },

  emptyText: { padding: 24, textAlign: 'center', color: VITANA_COLORS.textSecondary, fontSize: 14 },

  confirmCard: {
    backgroundColor: '#f9fafb', borderRadius: 12,
    padding: 16, gap: 12, marginBottom: 20,
  },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmLabel: { fontSize: 13, color: VITANA_COLORS.textSecondary },
  confirmValue: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text, flexShrink: 1, textAlign: 'right' },

  switchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, gap: 12, marginBottom: 24,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  switchSub: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },

  submitBtn: {
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 12,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, justifyContent: 'center',
  },
  backBtnText: { fontSize: 13, color: VITANA_COLORS.textSecondary },
});
