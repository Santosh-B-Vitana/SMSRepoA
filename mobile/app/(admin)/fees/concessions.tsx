import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, Modal, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';
import { formatINR } from '@vitana/shared-utils';

interface ConcessionType {
  id: string;
  name: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
}

interface NewConcessionPayload {
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
}

function ConcessionCard({ item, onToggle }: { item: ConcessionType; onToggle: (id: string, active: boolean) => void }) {
  const { primaryColor } = useSchoolTheme();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.name}</Text>
          {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
        </View>
        <View style={styles.discountBadge}>
          <Text style={[styles.discountValue, { color: primaryColor }]}>
            {item.discountType === 'percentage' ? `${item.discountValue}%` : formatINR(item.discountValue)}
          </Text>
          <Text style={styles.discountType}>{item.discountType === 'percentage' ? 'OFF' : 'FLAT'}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#dcfce7' : '#fee2e2' }]}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: item.isActive ? '#166534' : '#991b1b' }}>
            {item.isActive ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.toggleBtn, { borderColor: item.isActive ? '#dc2626' : '#059669' }]}
          onPress={() => onToggle(item.id, !item.isActive)}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: item.isActive ? '#dc2626' : '#059669' }}>
            {item.isActive ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FeeConcessionsScreen() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewConcessionPayload>({
    name: '', description: '', discountType: 'percentage', discountValue: '',
  });

  const { data, isLoading, refetch, isRefetching } = useQuery<ConcessionType[]>({
    queryKey: ['admin-concession-types'],
    queryFn: () =>
      (apiClient.get('/feeconcession') as Promise<any>).then((r: any) => r?.items ?? r?.data ?? r ?? []),
    staleTime: 5 * 60 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiClient.put(`/feeconcession/${id}`, { isActive: active }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-concession-types'] }),
    onError: (err: any) => Alert.alert('Error', err?.message ?? 'Failed to update concession'),
  });

  const createMutation = useMutation({
    mutationFn: (payload: NewConcessionPayload) =>
      apiClient.post('/feeconcession', {
        ...payload,
        discountValue: parseFloat(payload.discountValue) || 0,
        isActive: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-concession-types'] });
      setShowModal(false);
      setForm({ name: '', description: '', discountType: 'percentage', discountValue: '' });
    },
    onError: (err: any) => Alert.alert('Error', err?.message ?? 'Failed to create concession type'),
  });

  const concessions: ConcessionType[] = Array.isArray(data) ? data : [];

  function handleCreate() {
    if (!form.name.trim()) { Alert.alert('Validation', 'Name is required.'); return; }
    if (!form.discountValue || isNaN(parseFloat(form.discountValue))) {
      Alert.alert('Validation', 'Enter a valid discount value.');
      return;
    }
    createMutation.mutate(form);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader
        title="Fee Concessions"
        rightSlot={
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={styles.addBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="plus" size={18} color={primaryColor} />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={concessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConcessionCard item={item} onToggle={(id, active) => toggleMutation.mutate({ id, active })} />
        )}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={primaryColor} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={primaryColor} /></View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
              <Feather name="tag" size={32} color={VITANA_COLORS.border} />
              <Text style={{ color: VITANA_COLORS.textSecondary }}>No concession types configured</Text>
              <TouchableOpacity
                style={[styles.emptyCreateBtn, { backgroundColor: primaryColor }]}
                onPress={() => setShowModal(true)}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Create First Concession</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* Create Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Concession Type</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Feather name="x" size={20} color={VITANA_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
              <View>
                <Text style={styles.fieldLabel}>Name <Text style={{ color: '#ef4444' }}>*</Text></Text>
                <TextInput
                  style={styles.fieldInput}
                  value={form.name}
                  onChangeText={(v) => setForm(f => ({ ...f, name: v }))}
                  placeholder="e.g. Staff Child Discount, Merit Scholarship"
                  placeholderTextColor={VITANA_COLORS.textSecondary}
                />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
                  value={form.description}
                  onChangeText={(v) => setForm(f => ({ ...f, description: v }))}
                  placeholder="Optional description"
                  placeholderTextColor={VITANA_COLORS.textSecondary}
                  multiline
                />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Discount Type</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {(['percentage', 'fixed'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typePill, form.discountType === t && { backgroundColor: `${primaryColor}18`, borderColor: primaryColor }]}
                      onPress={() => setForm(f => ({ ...f, discountType: t }))}
                    >
                      <Text style={[styles.typePillText, form.discountType === t && { color: primaryColor, fontWeight: '700' }]}>
                        {t === 'percentage' ? 'Percentage (%)' : 'Fixed Amount (₹)'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.fieldLabel}>
                  {form.discountType === 'percentage' ? 'Discount %' : 'Discount Amount (₹)'} <Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.fieldInput}
                  value={form.discountValue}
                  onChangeText={(v) => setForm(f => ({ ...f, discountValue: v }))}
                  keyboardType="numeric"
                  placeholder={form.discountType === 'percentage' ? 'e.g. 25' : 'e.g. 2000'}
                  placeholderTextColor={VITANA_COLORS.textSecondary}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: primaryColor }, createMutation.isPending && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitText}>Create Concession Type</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  addBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: VITANA_COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: VITANA_COLORS.border,
  },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  cardName: { fontSize: 15, fontWeight: '700', color: VITANA_COLORS.text },
  cardDesc: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 4 },
  discountBadge: { alignItems: 'flex-end' },
  discountValue: { fontSize: 20, fontWeight: '800', fontFamily: 'Poppins' },
  discountType: { fontSize: 10, color: VITANA_COLORS.textSecondary },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderTopWidth: 1, borderTopColor: '#f9fafb',
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  emptyCreateBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: VITANA_COLORS.text },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: VITANA_COLORS.text, marginBottom: 6 },
  fieldInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 14,
    color: VITANA_COLORS.text, backgroundColor: '#fafafa',
  },
  typePill: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  typePillText: { fontSize: 13, fontWeight: '500', color: VITANA_COLORS.textSecondary },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
