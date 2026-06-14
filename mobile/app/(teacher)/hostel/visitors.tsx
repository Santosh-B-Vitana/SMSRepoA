import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';

interface HostelVisitor {
  id: string;
  visitorName: string;
  relationship?: string | null;
  studentName: string;
  roomNumber: string;
  checkInTime: string;
  checkOutTime?: string | null;
  phoneNumber?: string | null;
  purpose?: string | null;
}

const RELATIONSHIPS = ['Parent', 'Guardian', 'Sibling', 'Relative', 'Family Friend', 'Other'];

export default function HostelVisitorsScreen() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ visitorName: '', relationship: 'Parent', studentName: '', phoneNumber: '' });
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);

  const { data: visitors = [], isLoading, refetch, isFetching } = useQuery<HostelVisitor[]>({
    queryKey: ['hostel-visitors', today],
    queryFn: () =>
      (apiClient.get('/hostel/visitors', { params: { date: today, pageSize: 100 } }) as Promise<any>)
        .then((r) => r?.items ?? r?.visitors ?? r ?? []),
    staleTime: 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.post('/hostel/visitors', { ...data, checkInTime: new Date().toISOString() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hostel-visitors'] });
      setAddModal(false);
      setForm({ visitorName: '', relationship: 'Parent', studentName: '', phoneNumber: '' });
    },
    onError: () => Alert.alert('Error', 'Failed to record visitor.'),
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => apiClient.put(`/hostel/visitors/${id}/check-out`, {}),
    onSuccess: () => {
      setCheckingOutId(null);
      void queryClient.invalidateQueries({ queryKey: ['hostel-visitors'] });
    },
    onError: () => { setCheckingOutId(null); Alert.alert('Error', 'Failed to check out visitor.'); },
  });

  const inside = visitors.filter((v) => !v.checkOutTime).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Hostel Visitors" />

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>{inside}</Text>
          <Text style={styles.statLabel}>Currently Inside</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: VITANA_COLORS.textSecondary }]}>{visitors.length}</Text>
          <Text style={styles.statLabel}>Total Today</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={primaryColor} size="large" /></View>
      ) : visitors.length === 0 ? (
        <EmptyState icon="users" title="No visitors today" subtitle="No hostel visitors recorded today." />
      ) : (
        <FlatList
          data={visitors}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshing={isFetching}
          onRefresh={refetch}
          renderItem={({ item }) => {
            const isInside = !item.checkOutTime;
            const checkIn = new Date(item.checkInTime);
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, { backgroundColor: `${primaryColor}20` }]}>
                    <Feather name="user" size={18} color={primaryColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.visitorName}>{item.visitorName}</Text>
                    <Text style={styles.visitorMeta}>
                      {item.relationship ?? ''} of {item.studentName} · Room {item.roomNumber}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: isInside ? '#dcfce7' : '#f1f5f9' }]}>
                    <Text style={[styles.statusText, { color: isInside ? '#15803d' : '#64748b' }]}>
                      {isInside ? 'Inside' : 'Left'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.timeText}>
                  In: {checkIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  {!isInside && item.checkOutTime
                    ? ` · Out: ${new Date(item.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                </Text>
                {isInside && (
                  <TouchableOpacity
                    style={[styles.checkOutBtn, { borderColor: primaryColor }]}
                    onPress={() => {
                      setCheckingOutId(item.id);
                      checkOutMutation.mutate(item.id);
                    }}
                    disabled={checkingOutId === item.id && checkOutMutation.isPending}
                  >
                    {checkingOutId === item.id && checkOutMutation.isPending ? (
                      <ActivityIndicator size="small" color={primaryColor} />
                    ) : (
                      <Text style={[styles.checkOutText, { color: primaryColor }]}>Check Out</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: primaryColor }]}
        onPress={() => setAddModal(true)}
        activeOpacity={0.85}
      >
        <Feather name="user-plus" size={22} color="#fff" />
      </TouchableOpacity>

      <Modal visible={addModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAddModal(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Record Visitor</Text>
            <TouchableOpacity onPress={() => setAddModal(false)}>
              <Feather name="x" size={22} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {[
                { label: 'Visitor Name *', field: 'visitorName', placeholder: 'Full name' },
                { label: 'Student Name *', field: 'studentName', placeholder: 'Student being visited' },
                { label: 'Phone Number', field: 'phoneNumber', placeholder: 'Mobile number' },
              ].map(({ label, field, placeholder }) => (
                <View key={field} style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    value={form[field as keyof typeof form]}
                    onChangeText={(t) => setForm((f) => ({ ...f, [field]: t }))}
                    placeholder={placeholder}
                    placeholderTextColor={VITANA_COLORS.textSecondary}
                    keyboardType={field === 'phoneNumber' ? 'phone-pad' : 'default'}
                  />
                </View>
              ))}

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Relationship</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {RELATIONSHIPS.map((r) => (
                      <TouchableOpacity
                        key={r}
                        onPress={() => setForm((f) => ({ ...f, relationship: r }))}
                        style={[styles.chip, form.relationship === r && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                      >
                        <Text style={[styles.chipText, form.relationship === r && { color: '#fff' }]}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: primaryColor }, addMutation.isPending && { opacity: 0.6 }]}
                onPress={() => {
                  if (!form.visitorName.trim()) { Alert.alert('Required', 'Visitor name is required.'); return; }
                  if (!form.studentName.trim()) { Alert.alert('Required', 'Student name is required.'); return; }
                  addMutation.mutate(form);
                }}
                disabled={addMutation.isPending}
              >
                {addMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
                  <Text style={styles.submitBtnText}>Record Check-In</Text>
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
  statsBar: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: VITANA_COLORS.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  visitorName: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  visitorMeta: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  timeText: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginBottom: 8 },
  checkOutBtn: { borderWidth: 1.5, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  checkOutText: { fontSize: 13, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6 },
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: VITANA_COLORS.border },
  modalTitle: { fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text },
  modalContent: { padding: 20, gap: 16, paddingBottom: 40 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.textSecondary },
  input: { borderWidth: 1, borderColor: VITANA_COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: VITANA_COLORS.text, backgroundColor: '#fafafa' },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: VITANA_COLORS.border, backgroundColor: '#fff' },
  chipText: { fontSize: 12, fontWeight: '500', color: VITANA_COLORS.textSecondary },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
