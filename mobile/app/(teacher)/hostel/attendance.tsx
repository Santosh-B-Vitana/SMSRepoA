import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
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

type AttendanceStatus = 'present' | 'absent' | 'leave';

interface HostelStudent {
  id: string;
  studentName: string;
  roomNumber: string;
  blockName: string;
  admissionNumber?: string | null;
  attendanceStatus?: AttendanceStatus | null;
}

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  present: { label: 'P', color: '#15803d', bg: '#dcfce7' },
  absent: { label: 'A', color: '#dc2626', bg: '#fef2f2' },
  leave: { label: 'L', color: '#d97706', bg: '#fef9c3' },
};

export default function HostelAttendanceScreen() {
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [submitting, setSubmitting] = useState(false);

  const { data: students = [], isLoading, refetch, isFetching } = useQuery<HostelStudent[]>({
    queryKey: ['hostel-students-attendance', today],
    queryFn: () =>
      (apiClient.get('/hostel/students', { params: { date: today, pageSize: 200 } }) as Promise<any>)
        .then((r) => {
          const list = r?.items ?? r?.students ?? r ?? [];
          const initial: Record<string, AttendanceStatus> = {};
          list.forEach((s: HostelStudent) => {
            if (s.attendanceStatus) initial[s.id] = s.attendanceStatus;
          });
          setAttendance((prev) => ({ ...initial, ...prev }));
          return list;
        }),
    staleTime: 60 * 1000,
  });

  function toggle(studentId: string, status: AttendanceStatus) {
    setAttendance((prev) => ({ ...prev, [studentId]: prev[studentId] === status ? 'absent' : status }));
  }

  async function handleSubmit() {
    const records = students.map((s) => ({
      studentId: s.id,
      status: attendance[s.id] ?? 'absent',
      date: today,
    }));
    setSubmitting(true);
    try {
      await apiClient.post('/hostel/attendance/bulk', { date: today, records });
      void queryClient.invalidateQueries({ queryKey: ['hostel-students-attendance'] });
      Alert.alert('Saved', 'Hostel attendance recorded successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save attendance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const presentCount = Object.values(attendance).filter((s) => s === 'present').length;
  const absentCount = students.length - presentCount;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader
        title="Hostel Attendance"
        rightSlot={
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: primaryColor }]}
            onPress={handleSubmit}
            disabled={submitting || students.length === 0}
          >
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        }
      />

      {/* Summary */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>Total: {students.length}</Text>
        <Text style={[styles.summaryText, { color: '#15803d' }]}>Present: {presentCount}</Text>
        <Text style={[styles.summaryText, { color: '#dc2626' }]}>Absent: {absentCount}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={primaryColor} size="large" /></View>
      ) : students.length === 0 ? (
        <EmptyState icon="users" title="No hostel students" subtitle="No students are currently checked in to the hostel." />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(s) => s.id}
          refreshing={isFetching}
          onRefresh={refetch}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item, index }) => {
            const status = attendance[item.id] ?? null;
            return (
              <View style={[styles.row, index < students.length - 1 && styles.rowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{item.studentName}</Text>
                  <Text style={styles.studentMeta}>
                    Room {item.roomNumber} · {item.blockName}
                  </Text>
                </View>
                <View style={styles.statusBtns}>
                  {(['present', 'absent', 'leave'] as AttendanceStatus[]).map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const selected = status === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => toggle(item.id, s)}
                        style={[
                          styles.statusBtn,
                          { borderColor: selected ? cfg.color : VITANA_COLORS.border },
                          selected && { backgroundColor: cfg.bg },
                        ]}
                      >
                        <Text style={[styles.statusBtnText, { color: selected ? cfg.color : VITANA_COLORS.textSecondary }]}>
                          {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  summaryBar: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
  },
  summaryText: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.textSecondary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  studentName: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  studentMeta: { fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 1 },
  statusBtns: { flexDirection: 'row', gap: 6 },
  statusBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBtnText: { fontSize: 12, fontWeight: '700' },
});
