import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { adminApi } from '@/api/endpoints/admin';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

// ─── Form field ───────────────────────────────────────────────────────────────

function Field({ label, value, onChangeText, placeholder, keyboardType, required, autoCapitalize }: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: any; required?: boolean; autoCapitalize?: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required ? <Text style={{ color: '#ef4444' }}> *</Text> : null}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={VITANA_COLORS.textSecondary}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'words'}
        returnKeyType="next"
      />
    </View>
  );
}

// ─── Inline date picker (no native dependency) ────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => currentYear - 5 - i); // 5 years ago down to 30 years ago
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function DatePickerModal({
  visible, value, onConfirm, onClose,
}: {
  visible: boolean;
  value: string;
  onConfirm: (date: string) => void;
  onClose: () => void;
}) {
  const parsed = value ? new Date(value) : new Date(currentYear - 10, 0, 1);
  const [day, setDay] = useState(isNaN(parsed.getDate()) ? 1 : parsed.getDate());
  const [month, setMonth] = useState(isNaN(parsed.getMonth()) ? 0 : parsed.getMonth());
  const [year, setYear] = useState(isNaN(parsed.getFullYear()) ? currentYear - 10 : parsed.getFullYear());
  const { primaryColor } = useSchoolTheme();

  function confirm() {
    const maxDay = new Date(year, month + 1, 0).getDate();
    const clampedDay = Math.min(day, maxDay);
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(clampedDay).padStart(2, '0');
    onConfirm(`${year}-${mm}-${dd}`);
    onClose();
  }

  function Column({ items, selected, onSelect, labelFn }: {
    items: number[]; selected: number; onSelect: (v: number) => void; labelFn?: (v: number) => string;
  }) {
    return (
      <View style={styles.pickerCol}>
        <FlatList
          data={items}
          keyExtractor={(item) => String(item)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 70 }}
          snapToInterval={44}
          decelerationRate="fast"
          initialScrollIndex={items.indexOf(selected)}
          getItemLayout={(_, index) => ({ length: 44, offset: 44 * index, index })}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.pickerItem, item === selected && { backgroundColor: `${primaryColor}18`, borderRadius: 8 }]}
              onPress={() => onSelect(item)}
            >
              <Text style={[styles.pickerItemText, item === selected && { color: primaryColor, fontWeight: '700' }]}>
                {labelFn ? labelFn(item) : String(item).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={onClose}><Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 15 }}>Cancel</Text></TouchableOpacity>
            <Text style={styles.pickerTitle}>Date of Birth</Text>
            <TouchableOpacity onPress={confirm}><Text style={{ color: primaryColor, fontWeight: '700', fontSize: 15 }}>Done</Text></TouchableOpacity>
          </View>
          <View style={styles.pickerLabels}>
            <Text style={styles.pickerLabel}>Day</Text>
            <Text style={styles.pickerLabel}>Month</Text>
            <Text style={styles.pickerLabel}>Year</Text>
          </View>
          <View style={styles.pickerBody}>
            <Column items={DAYS} selected={day} onSelect={setDay} />
            <Column items={Array.from({ length: 12 }, (_, i) => i)} selected={month} onSelect={setMonth} labelFn={(m) => MONTHS[m]} />
            <Column items={YEARS} selected={year} onSelect={setYear} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Picker modal (generic) ───────────────────────────────────────────────────

function PickerModal({ visible, title, items, onSelect, onClose }: {
  visible: boolean; title: string; items: string[];
  onSelect: (v: string) => void; onClose: () => void;
}) {
  const { primaryColor } = useSchoolTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={onClose}><Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 15 }}>Cancel</Text></TouchableOpacity>
            <Text style={styles.pickerTitle}>{title}</Text>
            <View style={{ width: 60 }} />
          </View>
          <FlatList
            data={items}
            keyExtractor={(item, i) => `${item}-${i}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={styles.optionText}>{item}</Text>
                <Feather name="chevron-right" size={14} color={VITANA_COLORS.border} />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f1f5f9', marginLeft: 16 }} />}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Gender & Relation pickers ────────────────────────────────────────────────

const GENDERS = ['Male', 'Female', 'Other'] as const;
const RELATIONS = ['Father', 'Mother', 'Guardian', 'Uncle', 'Aunt', 'Grandparent', 'Other'] as const;

function Section({ title }: { title: string }) {
  return (
    <View style={styles.sectionDivider}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AddStudentScreen() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    firstName: '', lastName: '', admissionNumber: '', dateOfBirth: '',
    gender: '', classId: '', className: '', sectionId: '', sectionName: '',
    rollNumber: '', phone: '', email: '',
    guardianName: '', guardianRelation: 'Father', guardianPhone: '', guardianEmail: '',
  });

  // Modals
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showRelationPicker, setShowRelationPicker] = useState(false);

  const set = (key: keyof typeof form) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  // Load classes from API
  const { data: classesData } = useQuery({
    queryKey: ['admin-classes-list'],
    queryFn: adminApi.getClasses,
    staleTime: 10 * 60 * 1000,
  });
  const uniqueClasses = (() => {
    const seen = new Set<string>();
    return (classesData?.classes ?? []).filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  })();

  // Load sections when a class is selected
  const { data: sectionsData } = useQuery({
    queryKey: ['admin-sections', form.classId],
    queryFn: () => adminApi.getSections(form.classId),
    enabled: !!form.classId,
    staleTime: 5 * 60 * 1000,
  });
  const sections = sectionsData?.sections ?? [];

  const mutation = useMutation({
    mutationFn: () => {
      if (!form.firstName.trim()) throw new Error('First name is required');
      if (!form.admissionNumber.trim()) throw new Error('Admission number is required');
      const name = `${form.firstName} ${form.lastName}`.trim();
      return adminApi.createStudent({
        name,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        admissionNumber: form.admissionNumber.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        class: form.className || undefined,
        section: form.sectionName || undefined,
        rollNumber: form.rollNumber || undefined,
        primaryPhone: form.phone || undefined,
        email: form.email || undefined,
        guardianName: form.guardianName || undefined,
        guardianRelation: form.guardianRelation || undefined,
        guardianPhone: form.guardianPhone || undefined,
        guardianEmail: form.guardianEmail || undefined,
        academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['search-students'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      Alert.alert('Student Added', `${form.firstName} ${form.lastName} has been enrolled successfully.`, [
        { text: 'View Profile', onPress: () => router.replace({ pathname: '/(admin)/students/[id]', params: { id: data.id } }) },
        { text: 'Add Another', onPress: () => resetForm() },
      ]);
    },
    onError: (err: any) => Alert.alert('Error', err?.message ?? 'Failed to add student. Please check all fields.'),
  });

  function resetForm() {
    setForm({
      firstName: '', lastName: '', admissionNumber: '', dateOfBirth: '',
      gender: '', classId: '', className: '', sectionId: '', sectionName: '',
      rollNumber: '', phone: '', email: '',
      guardianName: '', guardianRelation: 'Father', guardianPhone: '', guardianEmail: '',
    });
  }

  function SelectButton({ label, value, placeholder, onPress }: {
    label: string; value: string; placeholder: string; onPress: () => void;
  }) {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={onPress} activeOpacity={0.7}>
          <Text style={value ? styles.selectBtnValue : styles.selectBtnPlaceholder}>{value || placeholder}</Text>
          <Feather name="chevron-down" size={16} color={VITANA_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  const dobDisplay = form.dateOfBirth
    ? new Date(form.dateOfBirth + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Add New Student" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <Section title="Basic Information" />
          <View style={styles.card}>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field label="First Name" value={form.firstName} onChangeText={set('firstName')} required placeholder="Rahul" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Last Name" value={form.lastName} onChangeText={set('lastName')} placeholder="Sharma" />
              </View>
            </View>
            <Field label="Admission Number" value={form.admissionNumber} onChangeText={set('admissionNumber')} required placeholder="ADM-2024-001" autoCapitalize="characters" />

            {/* Date of Birth — tap to open picker */}
            <SelectButton label="Date of Birth" value={dobDisplay} placeholder="Select date of birth" onPress={() => setShowDobPicker(true)} />

            {/* Gender */}
            <SelectButton label="Gender" value={form.gender} placeholder="Select gender" onPress={() => setShowGenderPicker(true)} />
          </View>

          <Section title="Class & Section" />
          <View style={styles.card}>
            {/* Class picker */}
            <SelectButton label="Class" value={form.className} placeholder="Select class" onPress={() => setShowClassPicker(true)} />
            {/* Section picker (only if class selected) */}
            {form.classId ? (
              <SelectButton label="Section" value={form.sectionName} placeholder="Select section" onPress={() => setShowSectionPicker(true)} />
            ) : (
              <View style={styles.field}>
                <Text style={styles.label}>Section</Text>
                <View style={[styles.selectBtn, { opacity: 0.5 }]}>
                  <Text style={styles.selectBtnPlaceholder}>Select a class first</Text>
                </View>
              </View>
            )}
            <Field label="Roll Number" value={form.rollNumber} onChangeText={set('rollNumber')} placeholder="42" keyboardType="numeric" autoCapitalize="none" />
          </View>

          <Section title="Contact" />
          <View style={styles.card}>
            <Field label="Phone Number" value={form.phone} onChangeText={set('phone')} placeholder="+91 98765 43210" keyboardType="phone-pad" autoCapitalize="none" />
            <Field label="Email" value={form.email} onChangeText={set('email')} placeholder="student@email.com" keyboardType="email-address" autoCapitalize="none" />
          </View>

          <Section title="Guardian / Parent" />
          <View style={styles.card}>
            <Field label="Guardian Name" value={form.guardianName} onChangeText={set('guardianName')} placeholder="Suresh Sharma" />
            <SelectButton label="Relation" value={form.guardianRelation} placeholder="Select relation" onPress={() => setShowRelationPicker(true)} />
            <Field label="Guardian Phone" value={form.guardianPhone} onChangeText={set('guardianPhone')} placeholder="+91 98765 43210" keyboardType="phone-pad" autoCapitalize="none" />
            <Field label="Guardian Email" value={form.guardianEmail} onChangeText={set('guardianEmail')} placeholder="parent@email.com" keyboardType="email-address" autoCapitalize="none" />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: primaryColor }, mutation.isPending && { opacity: 0.7 }]}
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <ActivityIndicator color="#fff" /> : (
              <>
                <Feather name="user-plus" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>Add Student</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date picker modal */}
      <DatePickerModal
        visible={showDobPicker}
        value={form.dateOfBirth}
        onConfirm={(d) => setForm((f) => ({ ...f, dateOfBirth: d }))}
        onClose={() => setShowDobPicker(false)}
      />

      {/* Gender picker */}
      <PickerModal
        visible={showGenderPicker}
        title="Select Gender"
        items={[...GENDERS]}
        onSelect={(v) => setForm((f) => ({ ...f, gender: v }))}
        onClose={() => setShowGenderPicker(false)}
      />

      {/* Class picker */}
      <Modal visible={showClassPicker} transparent animationType="slide" onRequestClose={() => setShowClassPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowClassPicker(false)}><Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 15 }}>Cancel</Text></TouchableOpacity>
              <Text style={styles.pickerTitle}>Select Class</Text>
              <View style={{ width: 60 }} />
            </View>
            <FlatList
              data={uniqueClasses}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    setForm((f) => ({ ...f, classId: item.id, className: item.name, sectionId: '', sectionName: '' }));
                    setShowClassPicker(false);
                  }}
                >
                  <View>
                    <Text style={styles.optionText}>{item.name}</Text>
                    {item.totalStudents != null && (
                      <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
                        {item.totalStudents} students · {item.academicYear}
                      </Text>
                    )}
                  </View>
                  <Feather name="chevron-right" size={14} color={VITANA_COLORS.border} />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f1f5f9', marginLeft: 16 }} />}
              ListEmptyComponent={<View style={{ padding: 32, alignItems: 'center' }}><Text style={{ color: VITANA_COLORS.textSecondary }}>No classes available</Text></View>}
            />
          </View>
        </View>
      </Modal>

      {/* Section picker */}
      <Modal visible={showSectionPicker} transparent animationType="slide" onRequestClose={() => setShowSectionPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowSectionPicker(false)}><Text style={{ color: VITANA_COLORS.textSecondary, fontSize: 15 }}>Cancel</Text></TouchableOpacity>
              <Text style={styles.pickerTitle}>Select Section</Text>
              <View style={{ width: 60 }} />
            </View>
            <FlatList
              data={sections}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    setForm((f) => ({ ...f, sectionId: item.id, sectionName: item.name }));
                    setShowSectionPicker(false);
                  }}
                >
                  <Text style={styles.optionText}>{form.className} – Section {item.name}</Text>
                  <Feather name="chevron-right" size={14} color={VITANA_COLORS.border} />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f1f5f9', marginLeft: 16 }} />}
            />
          </View>
        </View>
      </Modal>

      {/* Relation picker */}
      <PickerModal
        visible={showRelationPicker}
        title="Guardian Relation"
        items={[...RELATIONS]}
        onSelect={(v) => setForm((f) => ({ ...f, guardianRelation: v }))}
        onClose={() => setShowRelationPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { padding: 16, gap: 8 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 4, borderWidth: 1, borderColor: '#f1f5f9' },
  sectionDivider: { paddingTop: 8, paddingBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  row2: { flexDirection: 'row', gap: 10 },
  field: { paddingVertical: 6 },
  label: { fontSize: 12, fontWeight: '600', color: VITANA_COLORS.text, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: VITANA_COLORS.text, backgroundColor: '#fafafa',
  },
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fafafa',
  },
  selectBtnValue: { fontSize: 14, color: VITANA_COLORS.text, flex: 1 },
  selectBtnPlaceholder: { fontSize: 14, color: VITANA_COLORS.textSecondary, flex: 1 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: 14, gap: 8, marginTop: 8,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Picker modal
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: VITANA_COLORS.text },
  pickerLabels: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 8 },
  pickerLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: VITANA_COLORS.textSecondary, textTransform: 'uppercase' },
  pickerBody: { flexDirection: 'row', height: 200, paddingHorizontal: 12 },
  pickerCol: { flex: 1, overflow: 'hidden' },
  pickerItem: { height: 44, alignItems: 'center', justifyContent: 'center' },
  pickerItemText: { fontSize: 16, color: VITANA_COLORS.text },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
  },
  optionText: { fontSize: 15, color: VITANA_COLORS.text },
});
