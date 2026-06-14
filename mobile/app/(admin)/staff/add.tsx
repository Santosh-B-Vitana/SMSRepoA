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

interface CreateStaffPayload {
  firstName: string; lastName: string; email: string; phone: string;
  designation: string; department: string; employeeId: string;
  qualification: string; joiningDate: string; gender: string;
}

const DESIGNATIONS = [
  'Teacher', 'Class Teacher', 'Subject Teacher', 'Head of Department',
  'Principal', 'Vice Principal', 'Librarian', 'Receptionist',
  'HR Manager', 'Accountant', 'Transport Manager', 'Hostel Warden', 'Other',
];

const GENDERS = ['Male', 'Female', 'Other'] as const;

function Field({ label, value, onChangeText, placeholder, keyboardType, required, autoCapitalize }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; required?: boolean; autoCapitalize?: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required && <Text style={{ color: '#ef4444' }}> *</Text>}
      </Text>
      <TextInput
        style={styles.fieldInput}
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

export default function AddStaffScreen() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<CreateStaffPayload>({
    firstName: '', lastName: '', email: '', phone: '',
    designation: '', department: '', employeeId: '',
    qualification: '', joiningDate: new Date().toISOString().split('T')[0],
    gender: '',
  });

  const set = (key: keyof CreateStaffPayload) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const createMutation = useMutation({
    mutationFn: (payload: CreateStaffPayload) => apiClient.post('/staff', {
      ...payload,
      name: `${payload.firstName} ${payload.lastName}`.trim(),
      status: 'active',
    }),
    onSuccess: (res: any) => {
      void queryClient.invalidateQueries({ queryKey: ['search-staff'] });
      Alert.alert(
        'Staff Added',
        `${form.firstName} ${form.lastName} has been added successfully.`,
        [
          { text: 'Add Another', onPress: () => setForm({
              firstName: '', lastName: '', email: '', phone: '',
              designation: '', department: '', employeeId: '',
              qualification: '', joiningDate: new Date().toISOString().split('T')[0], gender: '',
            }),
          },
          { text: 'View Profile', onPress: () => {
              router.back();
              if (res?.id) router.push({ pathname: '/(admin)/staff/[id]', params: { id: res.id } });
            },
          },
        ]
      );
    },
    onError: (err: any) => Alert.alert('Error', err?.message ?? 'Failed to create staff member'),
  });

  function handleSubmit() {
    if (!form.firstName.trim()) { Alert.alert('Validation', 'First name is required.'); return; }
    if (!form.email.trim()) { Alert.alert('Validation', 'Email address is required.'); return; }
    if (!form.designation.trim()) { Alert.alert('Validation', 'Please select a designation.'); return; }
    createMutation.mutate(form);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Add Staff Member" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Personal Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <Field label="First Name" value={form.firstName} onChangeText={set('firstName')} required />
            <Field label="Last Name" value={form.lastName} onChangeText={set('lastName')} />
            <Field label="Email" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" required />
            <Field label="Phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />

            {/* Gender Picker */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.pillRow}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.pill, form.gender === g && { backgroundColor: `${primaryColor}18`, borderColor: primaryColor }]}
                    onPress={() => setForm((f) => ({ ...f, gender: g }))}
                  >
                    <Text style={[styles.pillText, form.gender === g && { color: primaryColor, fontWeight: '700' }]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Employment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Employment Details</Text>
            <Field label="Employee ID" value={form.employeeId} onChangeText={set('employeeId')} placeholder="e.g. EMP0042" />
            <Field label="Department" value={form.department} onChangeText={set('department')} placeholder="e.g. Science, Administration" />
            <Field label="Qualification" value={form.qualification} onChangeText={set('qualification')} placeholder="e.g. B.Ed, M.Sc" />
            <Field
              label="Joining Date"
              value={form.joiningDate}
              onChangeText={set('joiningDate')}
              placeholder="YYYY-MM-DD"
              keyboardType="numeric"
              autoCapitalize="none"
            />

            {/* Designation picker */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Designation <Text style={{ color: '#ef4444' }}>*</Text></Text>
              <View style={styles.pillRow}>
                {DESIGNATIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.pill, form.designation === d && { backgroundColor: `${primaryColor}18`, borderColor: primaryColor }]}
                    onPress={() => setForm((f) => ({ ...f, designation: d }))}
                  >
                    <Text style={[styles.pillText, form.designation === d && { color: primaryColor, fontWeight: '700' }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: primaryColor }, createMutation.isPending && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Feather name="user-plus" size={18} color="#fff" />
                  <Text style={styles.submitText}>Add Staff Member</Text>
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
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  pillText: { fontSize: 13, fontWeight: '500', color: VITANA_COLORS.textSecondary },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, paddingVertical: 15,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
