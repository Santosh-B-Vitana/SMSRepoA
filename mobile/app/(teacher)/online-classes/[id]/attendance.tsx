import { ScrollView, View, Text, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { onlineClassesApi } from '@/api/endpoints/online-classes';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import type { OnlineClassAttendanceStatus } from '@/shared-types/api/online-classes';

const STATUS_CONFIG: Record<OnlineClassAttendanceStatus, { label: string; color: string; bg: string }> = {
  Present: { label: 'Present', color: '#16a34a', bg: '#dcfce7' },
  PartiallyPresent: { label: 'Partial', color: '#d97706', bg: '#fef3c7' },
  Absent: { label: 'Absent', color: '#dc2626', bg: '#fee2e2' },
  JoinedAndLeftImmediately: { label: 'Left early', color: '#7c3aed', bg: '#ede9fe' },
};

export default function TeacherAttendance() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['online-class-attendance', id],
    queryFn: () => onlineClassesApi.getAttendance(id),
    enabled: !!id,
  });

  const overrideMutation = useMutation({
    mutationFn: ({ studentId, status }: { studentId: string; status: OnlineClassAttendanceStatus }) =>
      onlineClassesApi.overrideAttendance(id, studentId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['online-class-attendance', id] }),
    onError: () => Alert.alert('Error', 'Could not update attendance.'),
  });

  const handleOverride = (studentId: string, currentStatus: OnlineClassAttendanceStatus) => {
    const options: OnlineClassAttendanceStatus[] = ['Present', 'PartiallyPresent', 'Absent'];
    Alert.alert(
      'Override Attendance',
      'Select new attendance status',
      options
        .filter((s) => s !== currentStatus)
        .map((status) => ({
          text: STATUS_CONFIG[status].label,
          onPress: () => overrideMutation.mutate({ studentId, status }),
        }))
        .concat([{ text: 'Cancel', onPress: () => {} }]),
      { cancelable: true }
    );
  };

  const records = data ?? [];
  const presentCount = records.filter((r) => r.attendanceStatus === 'Present').length;
  const absentCount = records.filter((r) => r.attendanceStatus === 'Absent').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: primaryColor,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Attendance</Text>
      </View>

      {isLoading ? (
        <SkeletonLoader count={6} height={60} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {/* Summary */}
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 16,
              marginBottom: 14,
              flexDirection: 'row',
              gap: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#16a34a' }}>{presentCount}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Present</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#f3f4f6' }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#dc2626' }}>{absentCount}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Absent</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#f3f4f6' }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#374151' }}>{records.length}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Total</Text>
            </View>
          </View>

          {/* Students list */}
          {records.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#9ca3af', marginTop: 40 }}>
              No attendance data yet. Students must join the class first.
            </Text>
          ) : (
            records.map((r) => {
              const cfg = STATUS_CONFIG[r.attendanceStatus] ?? STATUS_CONFIG.Absent;
              return (
                <View
                  key={r.studentId}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 3,
                    elevation: 1,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a2e' }}>{r.studentName}</Text>
                    {r.rollNumber && (
                      <Text style={{ fontSize: 12, color: '#9ca3af' }}>Roll: {r.rollNumber}</Text>
                    )}
                    {r.totalDurationMinutes > 0 && (
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {r.totalDurationMinutes} min · {r.joinCount} join{r.joinCount !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: cfg.bg }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: cfg.color }}>{cfg.label}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleOverride(r.studentId, r.attendanceStatus)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Feather name="edit-2" size={12} color="#6b7280" />
                      <Text style={{ fontSize: 11, color: '#6b7280' }}>Override</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
