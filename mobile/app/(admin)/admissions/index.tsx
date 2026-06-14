import { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput,
  ActivityIndicator, RefreshControl, Modal, ScrollView,
  KeyboardAvoidingView, Platform, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { adminApi, type AdmissionApplication, type AdmissionStatus } from '@/api/endpoints/admin';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

// ─── Status colours ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<AdmissionStatus, { bg: string; text: string }> = {
  Inquiry:     { bg: '#f3f4f6', text: '#6b7280' },
  Applied:     { bg: '#eff6ff', text: '#2563eb' },
  Shortlisted: { bg: '#fef3c7', text: '#d97706' },
  Interview:   { bg: '#fef3c7', text: '#b45309' },
  Approved:    { bg: '#dcfce7', text: '#166534' },
  Enrolled:    { bg: '#dcfce7', text: '#14532d' },
  Rejected:    { bg: '#fee2e2', text: '#991b1b' },
  Withdrawn:   { bg: '#f3f4f6', text: '#374151' },
};

const STATUS_FILTERS: (AdmissionStatus | 'All')[] = ['All', 'Inquiry', 'Applied', 'Shortlisted', 'Interview', 'Approved', 'Enrolled', 'Rejected'];

// ─── Admission card ───────────────────────────────────────────────────────────

function AdmissionCard({
  item, onUpdateStatus,
}: {
  item: AdmissionApplication;
  onUpdateStatus: (item: AdmissionApplication) => void;
}) {
  const sc = STATUS_COLORS[item.status] ?? { bg: '#f3f4f6', text: '#374151' };
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.studentName}</Text>
          <Text style={styles.cardSub}>#{item.applicationNumber}</Text>
          {item.gradeApplied && <Text style={styles.cardMeta}>Grade: {item.gradeApplied}</Text>}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>{item.status}</Text>
        </View>
      </View>
      {item.parentName && (
        <View style={styles.cardRow}>
          <Feather name="user" size={13} color={VITANA_COLORS.textSecondary} />
          <Text style={styles.cardRowText}>{item.parentName}</Text>
          {item.parentPhone && <Text style={styles.cardRowText}>· {item.parentPhone}</Text>}
        </View>
      )}
      {item.remarks && (
        <Text style={styles.cardRemarks} numberOfLines={2}>"{item.remarks}"</Text>
      )}
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>Applied: {(() => {
          const raw = item.submittedAt ?? item.applicationDate;
          if (!raw) return 'Unknown';
          const d = new Date(raw);
          return isNaN(d.getTime()) ? 'Unknown' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        })()}</Text>
        {item.status !== 'Enrolled' && item.status !== 'Rejected' && item.status !== 'Withdrawn' && (
          <TouchableOpacity
            style={styles.updateBtn}
            onPress={() => onUpdateStatus(item)}
          >
            <Feather name="edit-2" size={12} color="#2563eb" />
            <Text style={styles.updateBtnText}>Update Status</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Add Admission modal ─────────────────────────────────────────────────────

function Field({ label, value, onChangeText, placeholder, keyboardType, required }: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: any; required?: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={{ color: '#ef4444' }}> *</Text> : null}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={VITANA_COLORS.textSecondary}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
        returnKeyType="next"
      />
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AdmissionsScreen() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<AdmissionStatus | 'All'>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState<AdmissionApplication | null>(null);
  const [newRemark, setNewRemark] = useState('');

  const [addForm, setAddForm] = useState({
    studentName: '', dateOfBirth: '', gender: '', gradeApplied: '',
    parentName: '', parentPhone: '', parentEmail: '', remarks: '',
  });
  const setAdd = (key: keyof typeof addForm) => (val: string) =>
    setAddForm((f) => ({ ...f, [key]: val }));

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admissions', filterStatus],
    queryFn: () => adminApi.getAdmissions(1, filterStatus === 'All' ? undefined : filterStatus),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!addForm.studentName.trim()) throw new Error('Student name is required');
      return adminApi.createAdmission({
        studentName: addForm.studentName,
        dateOfBirth: addForm.dateOfBirth || undefined,
        gender: addForm.gender || undefined,
        gradeApplied: addForm.gradeApplied || undefined,
        parentName: addForm.parentName || undefined,
        parentPhone: addForm.parentPhone || undefined,
        parentEmail: addForm.parentEmail || undefined,
        remarks: addForm.remarks || undefined,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admissions'] });
      setShowAddModal(false);
      setAddForm({ studentName: '', dateOfBirth: '', gender: '', gradeApplied: '', parentName: '', parentPhone: '', parentEmail: '', remarks: '' });
    },
    onError: (err: any) => Alert.alert('Error', err?.message ?? 'Failed to create admission inquiry'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdmissionStatus }) =>
      adminApi.updateAdmissionStatus(id, status, newRemark || undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admissions'] });
      setShowStatusModal(null);
      setNewRemark('');
    },
    onError: (err: any) => Alert.alert('Error', err?.message ?? 'Failed to update status'),
  });

  const items = data?.items ?? [];

  const NEXT_STATUSES: Record<AdmissionStatus, AdmissionStatus[]> = {
    Inquiry:     ['Applied', 'Rejected', 'Withdrawn'],
    Applied:     ['Shortlisted', 'Rejected', 'Withdrawn'],
    Shortlisted: ['Interview', 'Rejected', 'Withdrawn'],
    Interview:   ['Approved', 'Rejected', 'Withdrawn'],
    Approved:    ['Enrolled', 'Rejected'],
    Enrolled:    [],
    Rejected:    [],
    Withdrawn:   [],
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Admissions" />

      {/* Filter row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
        {STATUS_FILTERS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, filterStatus === s && { backgroundColor: primaryColor, borderColor: primaryColor }]}
            onPress={() => setFilterStatus(s)}
          >
            <Text style={[styles.filterText, filterStatus === s && { color: '#fff' }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add button */}
      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: primaryColor }]}
        onPress={() => setShowAddModal(true)}
      >
        <Feather name="plus" size={16} color="#fff" />
        <Text style={styles.addBtnText}>New Inquiry</Text>
      </TouchableOpacity>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AdmissionCard item={item} onUpdateStatus={setShowStatusModal} />
        )}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={primaryColor} /></View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center', gap: 8 }}>
              <Feather name="clipboard" size={32} color={VITANA_COLORS.border} />
              <Text style={{ color: VITANA_COLORS.textSecondary }}>No admissions found</Text>
            </View>
          )
        }
      />

      {/* Add admission modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Admission Inquiry</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Feather name="x" size={20} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 4 }} keyboardShouldPersistTaps="handled">
              <Field label="Student Name" value={addForm.studentName} onChangeText={setAdd('studentName')} required placeholder="e.g. Aryan Mehta" />
              <Field label="Date of Birth" value={addForm.dateOfBirth} onChangeText={setAdd('dateOfBirth')} placeholder="YYYY-MM-DD" />
              <Field label="Grade Applying For" value={addForm.gradeApplied} onChangeText={setAdd('gradeApplied')} placeholder="e.g. Class 5" />
              <Field label="Parent Name" value={addForm.parentName} onChangeText={setAdd('parentName')} placeholder="e.g. Suresh Mehta" />
              <Field label="Parent Phone" value={addForm.parentPhone} onChangeText={setAdd('parentPhone')} placeholder="+91 98765 43210" keyboardType="phone-pad" />
              <Field label="Parent Email" value={addForm.parentEmail} onChangeText={setAdd('parentEmail')} placeholder="parent@email.com" keyboardType="email-address" />
              <Field label="Remarks" value={addForm.remarks} onChangeText={setAdd('remarks')} placeholder="Any notes..." />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: primaryColor }, createMutation.isPending && { opacity: 0.6 }]}
                onPress={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Inquiry</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Update status modal */}
      <Modal visible={!!showStatusModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowStatusModal(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Status</Text>
            <TouchableOpacity onPress={() => setShowStatusModal(null)}>
              <Feather name="x" size={20} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          {showStatusModal && (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.statusSubtitle}>
                {showStatusModal.studentName} · Current: {showStatusModal.status}
              </Text>
              <Text style={styles.statusPrompt}>Move to:</Text>
              {(NEXT_STATUSES[showStatusModal.status] ?? []).map((s) => {
                const sc = STATUS_COLORS[s];
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusOption, { borderColor: sc.text + '40', backgroundColor: sc.bg }]}
                    onPress={() => {
                      if (!updateStatusMutation.isPending) {
                        updateStatusMutation.mutate({ id: showStatusModal.id, status: s });
                      }
                    }}
                    disabled={updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending ? (
                      <ActivityIndicator size="small" color={sc.text} />
                    ) : (
                      <Text style={[styles.statusOptionText, { color: sc.text }]}>{s}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
              <View style={{ marginTop: 16 }}>
                <Text style={styles.fieldLabel}>Remark (optional)</Text>
                <TextInput
                  style={[styles.fieldInput, { height: 80, textAlignVertical: 'top', paddingTop: 8 }]}
                  value={newRemark}
                  onChangeText={setNewRemark}
                  placeholder="Add a note..."
                  placeholderTextColor={VITANA_COLORS.textSecondary}
                  multiline
                />
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  filterScroll: { flexGrow: 0 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  filterText: { fontSize: 12, fontWeight: '500', color: VITANA_COLORS.textSecondary },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-end', marginHorizontal: 12, marginBottom: 4,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9', gap: 6,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardName: { fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text },
  cardSub: { fontSize: 11, color: '#9ca3af' },
  cardMeta: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardRowText: { fontSize: 13, color: VITANA_COLORS.textSecondary },
  cardRemarks: { fontSize: 12, color: VITANA_COLORS.textSecondary, fontStyle: 'italic' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardDate: { fontSize: 11, color: '#9ca3af' },
  updateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  updateBtnText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },

  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: VITANA_COLORS.text, marginBottom: 6 },
  fieldInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: VITANA_COLORS.text,
    backgroundColor: '#fafafa',
  },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  statusSubtitle: { fontSize: 13, color: VITANA_COLORS.textSecondary, marginBottom: 16 },
  statusPrompt: { fontSize: 15, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 10 },
  statusOption: {
    padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginBottom: 8,
  },
  statusOptionText: { fontSize: 15, fontWeight: '700' },
});
