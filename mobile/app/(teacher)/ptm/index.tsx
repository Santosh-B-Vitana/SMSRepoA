import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
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

interface PtmSlot {
  id: string;
  slotDateTime: string;
  status: 'available' | 'booked' | 'completed' | 'cancelled';
  sessionTitle?: string;
  studentName?: string;
  notes?: string;
  teacherRemarks?: string;
}

const STATUS_CONFIG = {
  available: { color: '#94a3b8', label: 'Available', bg: '#f8fafc' },
  booked:    { color: '#2563eb', label: 'Booked',    bg: '#eff6ff' },
  completed: { color: '#16a34a', label: 'Done',      bg: '#dcfce7' },
  cancelled: { color: '#dc2626', label: 'Cancelled', bg: '#fef2f2' },
};

export default function TeacherPtmScreen() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();

  const { data: slots = [], isLoading, refetch, isFetching } = useQuery<PtmSlot[]>({
    queryKey: ['my-ptm-slots'],
    queryFn: () =>
      (apiClient.get('/ptm/my-slots') as Promise<any>)
        .then((r) => Array.isArray(r) ? r : r?.slots ?? []),
    staleTime: 60 * 1000,
  });

  const remarksMutation = useMutation({
    mutationFn: ({ slotId, remarks }: { slotId: string; remarks: string }) =>
      apiClient.put(`/ptm/slots/${slotId}/remarks`, { remarks }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['my-ptm-slots'] }),
    onError: () => Alert.alert('Error', 'Failed to save remarks.'),
  });

  function handleAddRemarks(slot: PtmSlot) {
    Alert.prompt(
      'Meeting Remarks',
      'Add your notes from the parent meeting:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (text) => {
            if (!text?.trim()) return;
            remarksMutation.mutate({ slotId: slot.id, remarks: text.trim() });
          },
        },
      ],
      'plain-text',
      slot.teacherRemarks ?? '',
    );
  }

  const upcoming = slots.filter((s) => s.status === 'booked');
  const past = slots.filter((s) => s.status === 'completed' || s.status === 'cancelled');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title="My PTM Slots" />

      <View style={styles.summaryBar}>
        <Text style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: '#2563eb' }]}>{upcoming.length}</Text>
          {' '}Upcoming
        </Text>
        <Text style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: '#16a34a' }]}>{past.length}</Text>
          {' '}Done
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={primaryColor} size="large" /></View>
      ) : slots.length === 0 ? (
        <EmptyState icon="calendar" title="No PTM slots" subtitle="You have no Parent-Teacher Meeting slots scheduled." />
      ) : (
        <FlatList
          data={slots}
          keyExtractor={(s) => s.id}
          refreshing={isFetching}
          onRefresh={refetch}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 10 }}
          renderItem={({ item }) => {
            const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.available;
            const dt = new Date(item.slotDateTime);
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.timeBadge, { backgroundColor: `${primaryColor}15` }]}>
                    <Text style={[styles.timeText, { color: primaryColor }]}>
                      {dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={[styles.dateText, { color: primaryColor }]}>
                      {dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    {item.sessionTitle && (
                      <Text style={styles.sessionTitle}>{item.sessionTitle}</Text>
                    )}
                    {item.studentName ? (
                      <Text style={styles.studentName}>{item.studentName}</Text>
                    ) : (
                      <Text style={styles.noStudent}>No parent booked yet</Text>
                    )}
                    {item.notes && (
                      <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
                {item.teacherRemarks && (
                  <View style={styles.remarksBox}>
                    <Feather name="edit-3" size={12} color={VITANA_COLORS.textSecondary} />
                    <Text style={styles.remarksText}>{item.teacherRemarks}</Text>
                  </View>
                )}
                {item.status === 'booked' && (
                  <TouchableOpacity
                    style={[styles.remarksBtn, { borderColor: primaryColor }]}
                    onPress={() => handleAddRemarks(item)}
                  >
                    <Text style={[styles.remarksBtnText, { color: primaryColor }]}>
                      {item.teacherRemarks ? 'Edit Remarks' : 'Add Meeting Remarks'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: VITANA_COLORS.background },
  summaryBar: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
  },
  summaryItem: { fontSize: 13, color: VITANA_COLORS.textSecondary },
  summaryCount: { fontSize: 16, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  timeBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', minWidth: 60 },
  timeText: { fontSize: 15, fontWeight: '700' },
  dateText: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  sessionTitle: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginBottom: 2 },
  studentName: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  noStudent: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },
  notes: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 3 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '600' },
  remarksBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#f8fafc', borderRadius: 8, padding: 10 },
  remarksText: { fontSize: 12, color: VITANA_COLORS.textSecondary, flex: 1, lineHeight: 18 },
  remarksBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  remarksBtnText: { fontSize: 13, fontWeight: '600' },
});
