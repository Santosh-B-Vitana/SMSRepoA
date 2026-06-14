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

interface CreateClassPayload {
  name: string;
  code: string;
  board: string;
  capacity: string;
  numberOfSections: string;
  academicYear: string;
}

const BOARDS = ['CBSE', 'ICSE', 'State', 'IB', 'Cambridge', 'Other'];

function Field({ label, value, onChangeText, placeholder, keyboardType, required }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; required?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}{required && <Text style={{ color: '#ef4444' }}> *</Text>}
      </Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={VITANA_COLORS.textSecondary}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="words"
        returnKeyType="next"
      />
    </View>
  );
}

const currentYear = new Date().getFullYear();
const defaultAcademicYear = `${currentYear}-${currentYear + 1}`;

export default function CreateClassScreen() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateClassPayload>({
    name: '', code: '', board: 'CBSE',
    capacity: '40', numberOfSections: '1',
    academicYear: defaultAcademicYear,
  });

  const set = (key: keyof CreateClassPayload) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const createMutation = useMutation({
    mutationFn: (payload: CreateClassPayload) =>
      apiClient.post('/academics/classes', {
        name: payload.name,
        code: payload.code || undefined,
        board: payload.board || undefined,
        capacity: parseInt(payload.capacity) || 40,
        numberOfSections: parseInt(payload.numberOfSections) || 1,
        academicYear: payload.academicYear,
        status: 'active',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-classes-list'] });
      Alert.alert('Class Created', `${form.name} has been created successfully.`, [
        { text: 'Create Another', onPress: () => setForm({ name: '', code: '', board: 'CBSE', capacity: '40', numberOfSections: '1', academicYear: defaultAcademicYear }) },
        { text: 'Go Back', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => Alert.alert('Error', err?.message ?? 'Failed to create class'),
  });

  function handleSubmit() {
    if (!form.name.trim()) { Alert.alert('Validation', 'Class name is required.'); return; }
    createMutation.mutate(form);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Create Class" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Class Details</Text>
            <Field label="Class Name" value={form.name} onChangeText={set('name')} placeholder="e.g. Class 1, Grade 10" required />
            <Field label="Class Code" value={form.code} onChangeText={set('code')} placeholder="e.g. CL1, G10 (optional)" />
            <Field label="Academic Year" value={form.academicYear} onChangeText={set('academicYear')} placeholder={defaultAcademicYear} keyboardType="numeric" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Board / Curriculum</Text>
            <View style={styles.pillRow}>
              {BOARDS.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.pill, form.board === b && { backgroundColor: `${primaryColor}18`, borderColor: primaryColor }]}
                  onPress={() => setForm(f => ({ ...f, board: b }))}
                >
                  <Text style={[styles.pillText, form.board === b && { color: primaryColor, fontWeight: '700' }]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Capacity & Sections</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label="Capacity" value={form.capacity} onChangeText={set('capacity')} placeholder="40" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Sections" value={form.numberOfSections} onChangeText={set('numberOfSections')} placeholder="1" keyboardType="numeric" />
              </View>
            </View>
            <Text style={styles.hint}>
              Sections will be auto-created as A, B, C... based on the count.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: primaryColor }, createMutation.isPending && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="plus-circle" size={18} color="#fff" />
                <Text style={styles.submitText}>Create Class</Text>
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
  sectionTitle: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 14, fontFamily: 'Poppins' },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: VITANA_COLORS.text, marginBottom: 6 },
  fieldInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 14,
    color: VITANA_COLORS.text, backgroundColor: '#fafafa',
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  pillText: { fontSize: 13, fontWeight: '500', color: VITANA_COLORS.textSecondary },
  hint: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, paddingVertical: 15,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
