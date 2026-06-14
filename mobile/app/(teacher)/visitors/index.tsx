import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Visitor {
  id: string;
  visitorName: string;
  phoneNumber?: string | null;
  purpose: string;
  personToMeet?: string | null;
  checkInTime: string;
  checkOutTime?: string | null;
  status: 'checked_in' | 'checked_out' | 'pre_registered';
  passNumber?: string | null;
  idProofType?: string | null;
  idProofNumber?: string | null;
  studentName?: string | null;
}

interface CheckInPayload {
  visitorName: string;
  phoneNumber: string;
  purpose: string;
  personToMeet: string;
  idProofType: string;
  idProofNumber: string;
}

const PURPOSES = ['Meeting', 'Parent Visit', 'Delivery', 'Interview', 'Official Work', 'Other'];
const ID_TYPES = ['Aadhaar', 'PAN', 'Passport', 'Voter ID', 'Driving License', 'Other'];

// ─── Visitor Card ─────────────────────────────────────────────────────────────

function VisitorCard({
  visitor,
  primaryColor,
  onCheckOut,
  checkingOut,
}: {
  visitor: Visitor;
  primaryColor: string;
  onCheckOut: (id: string) => void;
  checkingOut: boolean;
}) {
  const isInside = visitor.status === 'checked_in';
  const checkIn = new Date(visitor.checkInTime);
  const now = new Date();
  const minutesInside = isInside ? Math.floor((now.getTime() - checkIn.getTime()) / 60000) : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: `${primaryColor}20` }]}>
          <Feather name="user" size={20} color={primaryColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.visitorName}>{visitor.visitorName}</Text>
          {visitor.phoneNumber && (
            <Text style={styles.visitorMeta}>{visitor.phoneNumber}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isInside ? '#dcfce7' : '#f1f5f9' }]}>
          <View style={[styles.statusDot, { backgroundColor: isInside ? '#16a34a' : '#94a3b8' }]} />
          <Text style={[styles.statusText, { color: isInside ? '#15803d' : '#64748b' }]}>
            {isInside ? 'Inside' : 'Left'}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Feather name="briefcase" size={13} color={VITANA_COLORS.textSecondary} />
          <Text style={styles.infoText}>{visitor.purpose}</Text>
        </View>
        {visitor.personToMeet && (
          <View style={styles.infoRow}>
            <Feather name="user-check" size={13} color={VITANA_COLORS.textSecondary} />
            <Text style={styles.infoText}>Meeting: {visitor.personToMeet}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Feather name="clock" size={13} color={VITANA_COLORS.textSecondary} />
          <Text style={styles.infoText}>
            In: {checkIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            {minutesInside !== null && ` · ${minutesInside}m ago`}
          </Text>
        </View>
        {visitor.passNumber && (
          <View style={styles.infoRow}>
            <Feather name="hash" size={13} color={VITANA_COLORS.textSecondary} />
            <Text style={styles.infoText}>Pass #{visitor.passNumber}</Text>
          </View>
        )}
      </View>

      {isInside && (
        <TouchableOpacity
          style={[styles.checkOutBtn, { borderColor: primaryColor }]}
          onPress={() => onCheckOut(visitor.id)}
          disabled={checkingOut}
        >
          {checkingOut ? (
            <ActivityIndicator size="small" color={primaryColor} />
          ) : (
            <>
              <Feather name="log-out" size={14} color={primaryColor} />
              <Text style={[styles.checkOutText, { color: primaryColor }]}>Check Out</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function VisitorManagementScreen() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'today' | 'inside'>('inside');
  const [checkInModal, setCheckInModal] = useState(false);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);

  const [form, setForm] = useState<CheckInPayload>({
    visitorName: '',
    phoneNumber: '',
    purpose: PURPOSES[0],
    personToMeet: '',
    idProofType: ID_TYPES[0],
    idProofNumber: '',
  });

  const visitorQuery = useQuery<Visitor[]>({
    queryKey: ['visitors', activeTab],
    queryFn: () =>
      (apiClient.get('/visitor', {
        params: activeTab === 'inside'
          ? { status: 'checked_in', pageSize: 50 }
          : { date: new Date().toISOString().split('T')[0], pageSize: 100 },
      }) as Promise<any>).then((r) => r?.items ?? r?.visitors ?? r ?? []),
    staleTime: 30 * 1000,
    refetchInterval: activeTab === 'inside' ? 30 * 1000 : undefined,
  });

  const checkInMutation = useMutation({
    mutationFn: (data: CheckInPayload) => apiClient.post('/visitor/check-in', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['visitors'] });
      setCheckInModal(false);
      setForm({ visitorName: '', phoneNumber: '', purpose: PURPOSES[0], personToMeet: '', idProofType: ID_TYPES[0], idProofNumber: '' });
    },
    onError: () => Alert.alert('Error', 'Failed to record check-in. Please try again.'),
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => apiClient.put(`/visitor/${id}/check-out`, {}),
    onSuccess: () => {
      setCheckingOutId(null);
      void queryClient.invalidateQueries({ queryKey: ['visitors'] });
    },
    onError: () => {
      setCheckingOutId(null);
      Alert.alert('Error', 'Failed to record check-out.');
    },
  });

  function handleCheckOut(id: string) {
    Alert.alert('Check Out', 'Mark this visitor as checked out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check Out',
        onPress: () => {
          setCheckingOutId(id);
          checkOutMutation.mutate(id);
        },
      },
    ]);
  }

  function handleCheckIn() {
    if (!form.visitorName.trim()) {
      Alert.alert('Required', 'Visitor name is required.');
      return;
    }
    if (!form.personToMeet.trim()) {
      Alert.alert('Required', 'Person to meet is required.');
      return;
    }
    checkInMutation.mutate(form);
  }

  const visitors = visitorQuery.data ?? [];
  const insideCount = visitors.filter((v) => v.status === 'checked_in').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="Visitor Management" />

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#16a34a' }]} />
          <Text style={styles.statLabel}>Currently Inside</Text>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>{insideCount}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['inside', 'today'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && { borderBottomColor: primaryColor, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, activeTab === tab && { color: primaryColor, fontWeight: '600' }]}>
              {tab === 'inside' ? 'Currently Inside' : "Today's Visitors"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {visitorQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={primaryColor} size="large" />
        </View>
      ) : visitors.length === 0 ? (
        <EmptyState icon="users" title="No visitors" subtitle={activeTab === 'inside' ? 'No one is currently inside.' : 'No visitors recorded today.'} />
      ) : (
        <FlatList
          data={visitors}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshing={visitorQuery.isFetching}
          onRefresh={() => visitorQuery.refetch()}
          renderItem={({ item }) => (
            <VisitorCard
              visitor={item}
              primaryColor={primaryColor}
              onCheckOut={handleCheckOut}
              checkingOut={checkingOutId === item.id && checkOutMutation.isPending}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: primaryColor }]}
        onPress={() => setCheckInModal(true)}
        activeOpacity={0.85}
      >
        <Feather name="user-plus" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Check-in Modal */}
      <Modal visible={checkInModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCheckInModal(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Visitor Check-In</Text>
            <TouchableOpacity onPress={() => setCheckInModal(false)}>
              <Feather name="x" size={22} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Field label="Visitor Name *">
                <TextInput
                  style={styles.input}
                  value={form.visitorName}
                  onChangeText={(t) => setForm((f) => ({ ...f, visitorName: t }))}
                  placeholder="Full name"
                  placeholderTextColor={VITANA_COLORS.textSecondary}
                />
              </Field>

              <Field label="Phone Number">
                <TextInput
                  style={styles.input}
                  value={form.phoneNumber}
                  onChangeText={(t) => setForm((f) => ({ ...f, phoneNumber: t }))}
                  placeholder="Mobile number"
                  placeholderTextColor={VITANA_COLORS.textSecondary}
                  keyboardType="phone-pad"
                />
              </Field>

              <Field label="Purpose">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {PURPOSES.map((p) => (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setForm((f) => ({ ...f, purpose: p }))}
                        style={[styles.chip, form.purpose === p && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                      >
                        <Text style={[styles.chipText, form.purpose === p && { color: '#fff' }]}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </Field>

              <Field label="Person to Meet *">
                <TextInput
                  style={styles.input}
                  value={form.personToMeet}
                  onChangeText={(t) => setForm((f) => ({ ...f, personToMeet: t }))}
                  placeholder="Name of staff / teacher"
                  placeholderTextColor={VITANA_COLORS.textSecondary}
                />
              </Field>

              <Field label="ID Proof Type">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {ID_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setForm((f) => ({ ...f, idProofType: t }))}
                        style={[styles.chip, form.idProofType === t && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                      >
                        <Text style={[styles.chipText, form.idProofType === t && { color: '#fff' }]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </Field>

              <Field label="ID Number">
                <TextInput
                  style={styles.input}
                  value={form.idProofNumber}
                  onChangeText={(t) => setForm((f) => ({ ...f, idProofNumber: t }))}
                  placeholder="ID document number"
                  placeholderTextColor={VITANA_COLORS.textSecondary}
                />
              </Field>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: primaryColor }, checkInMutation.isPending && { opacity: 0.6 }]}
                onPress={handleCheckIn}
                disabled={checkInMutation.isPending}
              >
                {checkInMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="log-in" size={16} color="#fff" />
                    <Text style={styles.submitBtnText}>Record Check-In</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: VITANA_COLORS.background },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f0fdf4',
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statLabel: { fontSize: 13, color: VITANA_COLORS.textSecondary },
  statValue: { fontSize: 15, fontWeight: '700', marginLeft: 4 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
    backgroundColor: '#fff',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, color: VITANA_COLORS.textSecondary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  visitorName: { fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text },
  visitorMeta: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardBody: { gap: 5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: VITANA_COLORS.textSecondary, flex: 1 },
  checkOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  checkOutText: { fontSize: 13, fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text },
  modalContent: { padding: 20, paddingBottom: 40, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: VITANA_COLORS.text,
    backgroundColor: '#fafafa',
  },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    backgroundColor: '#fff',
  },
  chipText: { fontSize: 12, fontWeight: '500', color: VITANA_COLORS.textSecondary },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
