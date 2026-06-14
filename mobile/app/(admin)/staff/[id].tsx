import { useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator,
  TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

interface StaffProfile {
  id: string; employeeId: string; firstName: string; lastName: string;
  gender: string; dateOfBirth: string; designation: string; department: string;
  email: string; phone: string; qualification: string; experience: number;
  joiningDate: string; status: string; profilePhoto: string | null;
  // Backend stores subjects/classes as raw JSON strings — parse before use
  subjects?: string | { id: string; name: string; code: string }[];
  classes?: string | { id: string; name: string; section: string }[];
  address?: string;
  // Backend splits emergency contact into 3 separate fields
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
}

/** Safely parse subjects/classes — backend stores them as JSON strings */
function parseJsonField<T>(raw: string | T[] | null | undefined): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw) ?? []; } catch { return []; }
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string | null | undefined }) {
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

interface EditStaffPayload {
  email: string; phone: string; address: string;
  designation: string; department: string;
  qualification: string; experience: string; status: string;
}

function EditField({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.editLabel}>{label}</Text>
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

export default function StaffProfileScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { primaryColor } = useSchoolTheme();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<EditStaffPayload>({
    email: '', phone: '', address: '', designation: '',
    department: '', qualification: '', experience: '', status: 'active',
  });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-staff-profile', id],
    queryFn: () => apiClient.get(`/staff/${id}`) as Promise<StaffProfile>,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: EditStaffPayload) => apiClient.put(`/staff/${id}`, {
      ...payload,
      experience: parseInt(payload.experience) || 0,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-staff-profile', id] });
      void queryClient.invalidateQueries({ queryKey: ['search-staff'] });
      setEditMode(false);
      Alert.alert('Saved', 'Staff profile updated successfully.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message ?? 'Failed to update staff'),
  });

  const fullName = data ? `${data.firstName} ${data.lastName}`.trim() : (name ?? 'Staff Profile');
  const initials = fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  // Safely parse JSON-string fields from backend
  const subjects = parseJsonField<{ id: string; name: string; code: string }>(data?.subjects);
  const classes  = parseJsonField<{ id: string; name: string; section: string }>(data?.classes);

  function openEdit() {
    if (!data) return;
    setForm({
      email: data.email ?? '',
      phone: data.phone ?? '',
      address: data.address ?? '',
      designation: data.designation ?? '',
      department: data.department ?? '',
      qualification: data.qualification ?? '',
      experience: data.experience != null ? String(data.experience) : '',
      status: data.status ?? 'active',
    });
    setEditMode(true);
  }

  const editBtn = !editMode ? (
    <TouchableOpacity onPress={openEdit} style={styles.headerEditBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Feather name="edit-2" size={17} color={VITANA_COLORS.text} />
    </TouchableOpacity>
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title={editMode ? 'Edit Staff' : fullName} rightSlot={editBtn} />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : editMode ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Contact</Text>
              <EditField label="Email" value={form.email} onChangeText={(v) => setForm(f => ({ ...f, email: v }))} keyboardType="email-address" />
              <EditField label="Phone" value={form.phone} onChangeText={(v) => setForm(f => ({ ...f, phone: v }))} keyboardType="phone-pad" />
              <EditField label="Address" value={form.address} onChangeText={(v) => setForm(f => ({ ...f, address: v }))} />
            </View>
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Role & Qualifications</Text>
              <EditField label="Designation" value={form.designation} onChangeText={(v) => setForm(f => ({ ...f, designation: v }))} placeholder="e.g. Teacher, Principal" />
              <EditField label="Department" value={form.department} onChangeText={(v) => setForm(f => ({ ...f, department: v }))} />
              <EditField label="Qualification" value={form.qualification} onChangeText={(v) => setForm(f => ({ ...f, qualification: v }))} placeholder="e.g. B.Ed, M.Sc" />
              <EditField label="Years of Experience" value={form.experience} onChangeText={(v) => setForm(f => ({ ...f, experience: v }))} keyboardType="numeric" />
            </View>
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Status</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['active', 'inactive'] as const).map((s) => (
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
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: primaryColor }, updateMutation.isPending && { opacity: 0.6 }]}
              onPress={() => updateMutation.mutate(form)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditMode(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar + Name */}
          <View style={styles.heroCard}>
            {data?.profilePhoto ? (
              <Image source={{ uri: data.profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${primaryColor}20` }]}>
                <Text style={[styles.initials, { color: primaryColor }]}>{initials}</Text>
              </View>
            )}
            <Text style={styles.heroName}>{fullName}</Text>
            <Text style={styles.heroRole}>{data?.designation} · {data?.department}</Text>
            <Text style={styles.heroId}>ID: {data?.employeeId}</Text>
            <View style={[styles.statusBadge, { backgroundColor: data?.status === 'active' ? '#dcfce7' : '#fee2e2' }]}>
              <Text style={[styles.statusText, { color: data?.status === 'active' ? '#166534' : '#991b1b' }]}>
                {data?.status?.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Contact & Personal */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <InfoRow icon="mail" label="Email" value={data?.email} />
            <InfoRow icon="phone" label="Phone" value={data?.phone} />
            <InfoRow icon="user" label="Gender" value={data?.gender} />
            <InfoRow icon="calendar" label="Date of Birth" value={data?.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString('en-IN') : null} />
            <InfoRow icon="award" label="Qualification" value={data?.qualification} />
            <InfoRow icon="briefcase" label="Experience" value={data?.experience !== undefined ? `${data.experience} years` : null} />
            <InfoRow icon="clock" label="Joining Date" value={data?.joiningDate ? new Date(data.joiningDate).toLocaleDateString('en-IN') : null} />
            <InfoRow icon="map-pin" label="Address" value={data?.address} />
          </View>

          {/* Subjects (parsed from JSON string) */}
          {subjects.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Subjects Taught</Text>
              <View style={styles.tagRow}>
                {subjects.map((s, i) => (
                  <View key={s.id ?? i} style={[styles.tag, { backgroundColor: `${primaryColor}15` }]}>
                    <Text style={[styles.tagText, { color: primaryColor }]}>{s.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Classes (parsed from JSON string) */}
          {classes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assigned Classes</Text>
              {classes.map((cls, i) => (
                <View key={cls.id ?? i} style={styles.classRow}>
                  <Feather name="users" size={14} color={VITANA_COLORS.textSecondary} />
                  <Text style={styles.classText}>
                    {cls.name}{cls.section ? ` · ${cls.section}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Emergency Contact (3 separate backend fields) */}
          {data?.emergencyContactName && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
              <InfoRow icon="user" label="Name" value={data.emergencyContactName} />
              <InfoRow icon="phone" label="Phone" value={data.emergencyContactPhone} />
              <InfoRow icon="heart" label="Relationship" value={data.emergencyContactRelationship} />
            </View>
          )}

          {/* Manage class / subject assignments — available for any teaching staff */}
          {(['Teacher', 'Principal', 'Vice Principal', 'Head of Department', 'Class Teacher', 'Subject Teacher'].includes(data?.designation ?? '')) && (
            <TouchableOpacity
              style={[styles.manageBtn, { borderColor: primaryColor }]}
              activeOpacity={0.75}
              onPress={() =>
                router.push({
                  pathname: '/(admin)/staff/assign-classes',
                  params: { id, name: fullName },
                })
              }
            >
              <Feather name="book-open" size={16} color={primaryColor} />
              <Text style={[styles.manageBtnText, { color: primaryColor }]}>Manage Classes &amp; Subjects</Text>
              <Feather name="chevron-right" size={16} color={primaryColor} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { paddingBottom: 32 },
  heroCard: {
    backgroundColor: '#fff', alignItems: 'center', padding: 24,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 6,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 8 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  initials: { fontSize: 28, fontWeight: '700' },
  heroName: { fontSize: 20, fontWeight: '700', color: VITANA_COLORS.text, fontFamily: 'Poppins' },
  heroRole: { fontSize: 14, color: VITANA_COLORS.textSecondary },
  heroId: { fontSize: 12, color: '#9ca3af' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  section: {
    backgroundColor: '#fff', marginTop: 12, marginHorizontal: 12,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#f1f5f9',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: VITANA_COLORS.text, marginBottom: 12, fontFamily: 'Poppins' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  infoIcon: { marginTop: 2 },
  infoLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginBottom: 2 },
  infoValue: { fontSize: 14, color: VITANA_COLORS.text, fontWeight: '500' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  tagText: { fontSize: 13, fontWeight: '500' },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  classText: { fontSize: 14, color: VITANA_COLORS.text },
  manageBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 12, marginTop: 4, padding: 14, borderRadius: 14,
    borderWidth: 1.5, backgroundColor: '#fff',
  },
  manageBtnText: { fontSize: 14, fontWeight: '600' },
  headerEditBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: VITANA_COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: VITANA_COLORS.border,
  },
  editSection: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  editLabel: { fontSize: 12, fontWeight: '600', color: VITANA_COLORS.text, marginBottom: 6 },
  editInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: VITANA_COLORS.text, backgroundColor: '#fafafa',
  },
  statusChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  statusChipText: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.textSecondary },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  cancelBtnText: { color: VITANA_COLORS.textSecondary, fontWeight: '600', fontSize: 15 },
});
