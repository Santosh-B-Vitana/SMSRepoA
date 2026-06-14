import { useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator,
  TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

interface StudentProfile {
  id: string; admissionNumber: string; firstName: string; middleName?: string; lastName: string;
  name: string; gender: string; dateOfBirth: string; class: string; section: string;
  rollNumber: string; status: string; photoUrl: string | null;
  bloodGroup?: string; religion?: string; category?: string;
  email?: string; phone?: string; address?: string;
  guardians?: { name: string; relation: string; phone: string; email?: string }[];
  attendanceSummary?: { present: number; absent: number; late: number; total: number; percentage: number };
  feeStatus?: { totalDue: number; totalPaid: number; pending: number };
  academicYear?: string;
}

interface EditPayload {
  firstName: string; lastName: string; email: string; phone: string;
  address: string; bloodGroup: string; category: string;
  rollNumber: string; status: string;
}

const TABS = ['Profile', 'Attendance', 'Fees', 'Academic'] as const;
type Tab = typeof TABS[number];

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Feather name={icon as any} size={14} color={VITANA_COLORS.textSecondary} style={styles.infoIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function EditField({ label, value, onChangeText, placeholder, keyboardType, required }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; required?: boolean;
}) {
  return (
    <View style={styles.editField}>
      <Text style={styles.editLabel}>{label}{required && <Text style={{ color: '#ef4444' }}> *</Text>}</Text>
      <TextInput
        style={styles.editInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={VITANA_COLORS.textSecondary}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="words"
      />
    </View>
  );
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_ARR = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS_ARR = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - 5 - i);

function InlineDobPicker({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const { primaryColor } = useSchoolTheme();
  const [showPicker, setShowPicker] = useState(false);
  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const [day, setDay] = useState(parsed ? parsed.getDate() : 1);
  const [month, setMonth] = useState(parsed ? parsed.getMonth() : 0);
  const [year, setYear] = useState(parsed ? parsed.getFullYear() : new Date().getFullYear() - 10);

  function confirm() {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${year}-${mm}-${dd}`);
    setShowPicker(false);
  }

  const displayValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Tap to select';

  return (
    <>
      <View style={styles.editField}>
        <Text style={styles.editLabel}>Date of Birth</Text>
        <TouchableOpacity style={styles.editInput} onPress={() => setShowPicker(true)}>
          <Text style={{ fontSize: 14, color: value ? VITANA_COLORS.text : VITANA_COLORS.textSecondary, paddingVertical: 0 }}>{displayValue}</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={dobStyles.overlay}>
          <View style={dobStyles.sheet}>
            <View style={dobStyles.header}>
              <TouchableOpacity onPress={() => setShowPicker(false)}><Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 15 }}>Cancel</Text></TouchableOpacity>
              <Text style={dobStyles.title}>Date of Birth</Text>
              <TouchableOpacity onPress={confirm}><Text style={{ color: primaryColor, fontWeight: '700', fontSize: 15 }}>Done</Text></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', paddingHorizontal: 12 }}>
              {[
                { items: DAYS_ARR, selected: day, onSelect: setDay, label: 'Day', fmt: (v: number) => String(v).padStart(2, '0') },
                { items: Array.from({ length: 12 }, (_, i) => i), selected: month, onSelect: setMonth, label: 'Month', fmt: (v: number) => MONTHS[v] },
                { items: YEARS_ARR, selected: year, onSelect: setYear, label: 'Year', fmt: (v: number) => String(v) },
              ].map((col) => (
                <View key={col.label} style={{ flex: 1 }}>
                  <Text style={dobStyles.colLabel}>{col.label}</Text>
                  <FlatList
                    data={col.items}
                    keyExtractor={(item) => String(item)}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 60 }}
                    snapToInterval={40}
                    decelerationRate="fast"
                    getItemLayout={(_, index) => ({ length: 40, offset: 40 * index, index })}
                    initialScrollIndex={Math.max(0, col.items.indexOf(col.selected))}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[dobStyles.item, item === col.selected && { backgroundColor: `${primaryColor}15`, borderRadius: 8 }]}
                        onPress={() => col.onSelect(item as any)}
                      >
                        <Text style={[dobStyles.itemText, item === col.selected && { color: primaryColor, fontWeight: '700' }]}>
                          {col.fmt(item)}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const dobStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 16, fontWeight: '700', color: VITANA_COLORS.text },
  colLabel: { textAlign: 'center', fontSize: 11, fontWeight: '700', color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', marginTop: 8, marginBottom: 4 },
  item: { height: 40, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: 15, color: VITANA_COLORS.text },
});

export default function StudentProfileScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { primaryColor } = useSchoolTheme();
  const [tab, setTab] = useState<Tab>('Profile');
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<EditPayload>({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', bloodGroup: '', category: '', rollNumber: '', status: 'active',
  });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-student-profile', id],
    queryFn: () => apiClient.get(`/students/${id}`) as Promise<StudentProfile>,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: attendance } = useQuery({
    queryKey: ['admin-student-attendance', id],
    queryFn: () => apiClient.get(`/attendance/student/${id}`, { params: { pageSize: 30 } }) as Promise<any>,
    enabled: !!id && tab === 'Attendance',
    staleTime: 2 * 60 * 1000,
  });

  const { data: fees } = useQuery({
    queryKey: ['admin-student-fees', id],
    queryFn: () => apiClient.get(`/fees/student/${id}`) as Promise<any>,
    enabled: !!id && tab === 'Fees',
    staleTime: 2 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: EditPayload) => apiClient.put(`/students/${id}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-student-profile', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      void queryClient.invalidateQueries({ queryKey: ['search-students'] });
      setEditMode(false);
      Alert.alert('Saved', 'Student profile updated successfully.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message ?? 'Failed to update student'),
  });

  const fullName = data?.name ?? name ?? 'Student Profile';
  const initials = fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const attPct = data?.attendanceSummary?.percentage ?? 0;
  const attColor = attPct >= 75 ? '#059669' : attPct >= 60 ? VITANA_COLORS.warning : '#ef4444';

  function openEdit() {
    if (!data) return;
    setForm({
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      email: data.email ?? '',
      phone: data.phone ?? '',
      address: data.address ?? '',
      bloodGroup: data.bloodGroup ?? '',
      category: data.category ?? '',
      rollNumber: data.rollNumber ?? '',
      status: data.status ?? 'active',
    });
    setEditMode(true);
  }

  function saveEdit() {
    if (!form.firstName.trim()) {
      Alert.alert('Validation', 'First name is required.');
      return;
    }
    updateMutation.mutate(form);
  }

  const editBtn = !editMode ? (
    <TouchableOpacity onPress={openEdit} style={styles.headerEditBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Feather name="edit-2" size={17} color={VITANA_COLORS.text} />
    </TouchableOpacity>
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader
        title={editMode ? 'Edit Student' : fullName}
        rightSlot={editBtn}
      />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : editMode ? (
        /* ── Edit Form ── */
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Personal Details</Text>
              <EditField label="First Name" value={form.firstName} onChangeText={(v) => setForm(f => ({ ...f, firstName: v }))} required />
              <EditField label="Last Name" value={form.lastName} onChangeText={(v) => setForm(f => ({ ...f, lastName: v }))} />
              <InlineDobPicker value={data?.dateOfBirth?.split('T')[0] ?? ''} onChange={(d) => setForm(f => ({ ...f, dateOfBirth: d } as any))} />
              <EditField label="Email" value={form.email} onChangeText={(v) => setForm(f => ({ ...f, email: v }))} keyboardType="email-address" />
              <EditField label="Phone" value={form.phone} onChangeText={(v) => setForm(f => ({ ...f, phone: v }))} keyboardType="phone-pad" />
              <EditField label="Blood Group" value={form.bloodGroup} onChangeText={(v) => setForm(f => ({ ...f, bloodGroup: v }))} placeholder="e.g. A+" />
              <EditField label="Category" value={form.category} onChangeText={(v) => setForm(f => ({ ...f, category: v }))} placeholder="General / OBC / SC / ST" />
              <EditField label="Address" value={form.address} onChangeText={(v) => setForm(f => ({ ...f, address: v }))} />
            </View>

            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Academic Details</Text>
              <EditField label="Roll Number" value={form.rollNumber} onChangeText={(v) => setForm(f => ({ ...f, rollNumber: v }))} />
            </View>

            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Status</Text>
              <View style={styles.statusRow}>
                {(['active', 'inactive', 'transferred'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusChip, form.status === s && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                    onPress={() => setForm(f => ({ ...f, status: s }))}
                  >
                    <Text style={[styles.statusChipText, form.status === s && { color: '#fff' }]}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: primaryColor }, updateMutation.isPending && { opacity: 0.6 }]}
                onPress={saveEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditMode(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <>
          {/* Hero */}
          <View style={styles.heroCard}>
            {data?.photoUrl ? (
              <Image source={{ uri: data.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.initials}>{initials}</Text>
              </View>
            )}
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{fullName}</Text>
              <Text style={styles.heroMeta}>{data?.class} {data?.section} · Roll #{data?.rollNumber}</Text>
              <Text style={styles.heroAdm}>Adm# {data?.admissionNumber}</Text>
            </View>
            {data?.attendanceSummary && (
              <View style={styles.attCircle}>
                <Text style={[styles.attPct, { color: attColor }]}>{attPct.toFixed(0)}%</Text>
                <Text style={styles.attLbl}>Attendance</Text>
              </View>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabBar}>
            {TABS.map((t) => (
              <TouchableOpacity key={t} style={[styles.tab, tab === t && { borderBottomColor: primaryColor, borderBottomWidth: 2 }]} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, tab === t && { color: primaryColor, fontWeight: '700' }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            {/* Profile Tab */}
            {tab === 'Profile' && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Personal Details</Text>
                  <InfoRow icon="user" label="Gender" value={data?.gender} />
                  <InfoRow icon="calendar" label="Date of Birth" value={data?.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString('en-IN') : null} />
                  <InfoRow icon="droplet" label="Blood Group" value={data?.bloodGroup} />
                  <InfoRow icon="tag" label="Category" value={data?.category} />
                  <InfoRow icon="mail" label="Email" value={data?.email} />
                  <InfoRow icon="phone" label="Phone" value={data?.phone} />
                  <InfoRow icon="map-pin" label="Address" value={data?.address} />
                </View>

                {(data?.guardians?.length ?? 0) > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Guardians</Text>
                    {data!.guardians!.map((g, i) => (
                      <View key={i} style={styles.guardianCard}>
                        <View style={styles.guardianHeader}>
                          <Text style={styles.guardianName}>{g.name}</Text>
                          <Text style={styles.guardianRelation}>{g.relation}</Text>
                        </View>
                        <Text style={styles.guardianPhone}>{g.phone}</Text>
                        {g.email && <Text style={styles.guardianEmail}>{g.email}</Text>}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Attendance Tab */}
            {tab === 'Attendance' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Attendance Summary</Text>
                {data?.attendanceSummary ? (
                  <>
                    <View style={styles.attGrid}>
                      {[
                        { label: 'Present', value: data.attendanceSummary.present, color: '#059669' },
                        { label: 'Absent', value: data.attendanceSummary.absent, color: '#ef4444' },
                        { label: 'Late', value: data.attendanceSummary.late, color: VITANA_COLORS.warning },
                        { label: 'Total Days', value: data.attendanceSummary.total, color: VITANA_COLORS.textSecondary },
                      ].map((item) => (
                        <View key={item.label} style={styles.attBox}>
                          <Text style={[styles.attNum, { color: item.color }]}>{item.value}</Text>
                          <Text style={styles.attBoxLabel}>{item.label}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.attBarTrack}>
                      <View style={[styles.attBarFill, { width: `${attPct}%` as any, backgroundColor: attColor }]} />
                    </View>
                    <Text style={[styles.attPctLabel, { color: attColor }]}>
                      {attPct.toFixed(1)}% attendance rate
                    </Text>
                  </>
                ) : (
                  <Text style={{ color: VITANA_COLORS.textSecondary, textAlign: 'center', padding: 20 }}>
                    No attendance data available
                  </Text>
                )}
              </View>
            )}

            {/* Fees Tab */}
            {tab === 'Fees' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fee Status</Text>
                {data?.feeStatus ? (
                  <View style={styles.feeGrid}>
                    {[
                      { label: 'Total Due', value: `₹${data.feeStatus.totalDue?.toLocaleString('en-IN')}`, color: VITANA_COLORS.text },
                      { label: 'Paid', value: `₹${data.feeStatus.totalPaid?.toLocaleString('en-IN')}`, color: '#059669' },
                      { label: 'Pending', value: `₹${data.feeStatus.pending?.toLocaleString('en-IN')}`, color: data.feeStatus.pending > 0 ? '#ef4444' : '#059669' },
                    ].map((item) => (
                      <View key={item.label} style={styles.feeBox}>
                        <Text style={[styles.feeAmount, { color: item.color }]}>{item.value}</Text>
                        <Text style={styles.feeLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: VITANA_COLORS.textSecondary, textAlign: 'center', padding: 20 }}>
                    No fee records available
                  </Text>
                )}
              </View>
            )}

            {/* Academic Tab */}
            {tab === 'Academic' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Academic Information</Text>
                <InfoRow icon="book-open" label="Class" value={`${data?.class} ${data?.section}`} />
                <InfoRow icon="hash" label="Roll Number" value={data?.rollNumber} />
                <InfoRow icon="calendar" label="Academic Year" value={data?.academicYear} />
                <View style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, textAlign: 'center' }}>
                    Exam results are available in the CRM portal.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  headerEditBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: VITANA_COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: VITANA_COLORS.border,
  },
  heroCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, gap: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 20, fontWeight: '700', color: '#4f46e5' },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 16, fontWeight: '700', color: VITANA_COLORS.text },
  heroMeta: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  heroAdm: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  attCircle: { alignItems: 'center' },
  attPct: { fontSize: 20, fontWeight: '800' },
  attLbl: { fontSize: 10, color: VITANA_COLORS.textSecondary },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, color: VITANA_COLORS.textSecondary, fontWeight: '500' },
  section: { backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 14, fontFamily: 'Poppins' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  infoIcon: { marginTop: 2 },
  infoLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary },
  infoValue: { fontSize: 14, color: VITANA_COLORS.text, fontWeight: '500', marginTop: 1 },
  guardianCard: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 8 },
  guardianHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  guardianName: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  guardianRelation: { fontSize: 11, color: VITANA_COLORS.textSecondary, backgroundColor: '#e5e7eb', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  guardianPhone: { fontSize: 13, color: VITANA_COLORS.textSecondary },
  guardianEmail: { fontSize: 12, color: '#9ca3af' },
  attGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  attBox: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, alignItems: 'center', gap: 4 },
  attNum: { fontSize: 22, fontWeight: '800' },
  attBoxLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary, textAlign: 'center' },
  attBarTrack: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  attBarFill: { height: 8, borderRadius: 4 },
  attPctLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  feeGrid: { flexDirection: 'row', gap: 8 },
  feeBox: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, alignItems: 'center', gap: 4 },
  feeAmount: { fontSize: 16, fontWeight: '700' },
  feeLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary },
  // Edit form
  editSection: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  editField: { marginBottom: 14 },
  editLabel: { fontSize: 12, fontWeight: '600', color: VITANA_COLORS.text, marginBottom: 6 },
  editInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: VITANA_COLORS.text, backgroundColor: '#fafafa',
  },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  statusChipText: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.textSecondary },
  editActions: { gap: 10 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  cancelBtnText: { color: VITANA_COLORS.textSecondary, fontWeight: '600', fontSize: 15 },
});
