import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import NetInfo from '@react-native-community/netinfo';
import { eq } from 'drizzle-orm';
import { Feather } from '@expo/vector-icons';
import { db } from '@/offline/db';
import { cachedStudentLists, attendanceDrafts } from '@/offline/schema';
import { OfflineQueueProcessor } from '@/offline/queue';
import { teacherApi } from '@/api/endpoints/teacher';
import { ConnectionBanner } from '@/components/common/ConnectionBanner';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolStore } from '@/stores/schoolStore';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { generateUUID } from '@/lib/uuid';
import { queryClient } from '@/api/queryClient';
import { VITANA_COLORS } from '@/theme/tokens';
import type { MinimalStudent } from '@/api/endpoints/teacher';

type Status = 'Present' | 'Absent' | 'Late';

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  Present: { label: 'P', color: '#16a34a', bg: '#dcfce7' },
  Absent: { label: 'A', color: '#ef4444', bg: '#fee2e2' },
  Late: { label: 'L', color: '#d97706', bg: '#fef3c7' },
};

const STATUS_CYCLE: Record<Status, Status> = {
  Present: 'Absent',
  Absent: 'Late',
  Late: 'Present',
};

interface StudentRowProps {
  student: MinimalStudent;
  status: Status;
  onToggle: (id: string) => void;
}

function StudentRow({ student, status, onToggle }: StudentRowProps) {
  const config = STATUS_CONFIG[status];
  return (
    <TouchableOpacity
      onPress={() => onToggle(student.id)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: VITANA_COLORS.border,
        backgroundColor: '#fff',
        minHeight: 68,
      }}
      activeOpacity={0.7}
      accessibilityLabel={`${student.firstName} ${student.lastName}, ${status}. Tap to change.`}
      accessibilityRole="button"
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: '#f1f5f9',
          overflow: 'hidden',
          marginRight: 12,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {student.photoUrl ? (
          <Image source={{ uri: student.photoUrl }} style={{ width: 44, height: 44 }} contentFit="cover" />
        ) : (
          <Text style={{ fontSize: 18, fontWeight: '700', color: VITANA_COLORS.textSecondary }}>
            {student.firstName[0]}
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text }}>
          {student.firstName} {student.lastName}
        </Text>
        <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
          Roll {student.rollNumber}
        </Text>
      </View>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          backgroundColor: config.bg,
          borderColor: config.color,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '700', color: config.color }}>{config.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AttendanceMarking() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { primaryColor } = useSchoolTheme();
  const user = useAuthStore((s) => s.user);
  const academicYear = useSchoolStore((s) => s.academicYear);

  const today = new Date().toISOString().split('T')[0]!;
  const draftId = `${classId}-${today}`;
  const idempotencyKeyRef = useRef(generateUUID());

  const [records, setRecords] = useState<Record<string, Status>>({});
  const [students, setStudents] = useState<MinimalStudent[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(!!state.isConnected && !!state.isInternetReachable);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    void loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  async function loadStudents() {
    if (!classId || !user) return;
    setIsLoadingStudents(true);
    try {
      const netState = await NetInfo.fetch();
      if (netState.isConnected && netState.isInternetReachable) {
        const fetched = await teacherApi.getClassStudents(classId);
        setStudents(fetched);
        await db
          .insert(cachedStudentLists)
          .values({
            classId,
            students: JSON.stringify(fetched),
            cachedAt: Date.now(),
            academicYear: academicYear ?? '2025-2026',
            schoolId: user.schoolId,
          })
          .onConflictDoUpdate({
            target: cachedStudentLists.classId,
            set: { students: JSON.stringify(fetched), cachedAt: Date.now() },
          });
      } else {
        const cached = await db
          .select()
          .from(cachedStudentLists)
          .where(eq(cachedStudentLists.classId, classId))
          .limit(1);
        if (cached[0]) {
          setStudents(JSON.parse(cached[0].students) as MinimalStudent[]);
        }
      }
    } catch (err) {
      console.error('[Attendance] Load students error:', err);
    } finally {
      setIsLoadingStudents(false);
    }

    // Load existing draft
    const existingDraft = await db
      .select()
      .from(attendanceDrafts)
      .where(eq(attendanceDrafts.id, draftId))
      .limit(1);
    if (existingDraft[0] && !existingDraft[0].isSubmitted) {
      const draftRecords = JSON.parse(existingDraft[0].records) as {
        studentId: string;
        status: Status;
      }[];
      const recordMap: Record<string, Status> = {};
      draftRecords.forEach((r) => {
        recordMap[r.studentId] = r.status;
      });
      setRecords(recordMap);
      idempotencyKeyRef.current = existingDraft[0].idempotencyKey;
    }
  }

  // Default all to Present when students first load (no draft)
  useEffect(() => {
    if (students.length > 0 && Object.keys(records).length === 0) {
      const allPresent: Record<string, Status> = {};
      students.forEach((s) => {
        allPresent[s.id] = 'Present';
      });
      setRecords(allPresent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  // Debounced auto-save to SQLite
  useEffect(() => {
    if (Object.keys(records).length === 0 || !user || !classId) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveDraft();
    }, 500);
    return () => clearTimeout(saveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records]);

  async function saveDraft() {
    if (!user || !classId) return;
    const recordsArray = Object.entries(records).map(([studentId, status]) => ({
      studentId,
      status,
    }));
    await db
      .insert(attendanceDrafts)
      .values({
        id: draftId,
        classId,
        date: today,
        academicYear: academicYear ?? '2025-2026',
        records: JSON.stringify(recordsArray),
        idempotencyKey: idempotencyKeyRef.current,
        isSubmitted: false,
        lastModified: Date.now(),
        markedBy: user.id,
        schoolId: user.schoolId,
      })
      .onConflictDoUpdate({
        target: attendanceDrafts.id,
        set: { records: JSON.stringify(recordsArray), lastModified: Date.now() },
      });
  }

  const toggleStatus = useCallback((studentId: string) => {
    setRecords((prev) => {
      const current = prev[studentId] ?? 'Present';
      return { ...prev, [studentId]: STATUS_CYCLE[current] };
    });
  }, []);

  function markAllPresent() {
    const allPresent: Record<string, Status> = {};
    students.forEach((s) => {
      allPresent[s.id] = 'Present';
    });
    setRecords(allPresent);
  }

  async function submitAttendance() {
    if (!user || !classId) return;
    setIsSubmitting(true);
    const recordsArray = Object.entries(records).map(([studentId, status]) => ({
      studentId,
      status,
    }));
    const payload = { classId, date: today, academicYear, records: recordsArray };

    try {
      if (isConnected) {
        await teacherApi.submitBulkAttendance(payload, idempotencyKeyRef.current);
        await db
          .update(attendanceDrafts)
          .set({ isSubmitted: true })
          .where(eq(attendanceDrafts.id, draftId));
        void queryClient.invalidateQueries({ queryKey: ['attendance', classId] });
        void queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] });
        router.back();
      } else {
        await OfflineQueueProcessor.enqueue({
          method: 'POST',
          endpoint: '/attendance/students/bulk',
          body: payload,
          extraHeaders: { 'X-Idempotency-Key': idempotencyKeyRef.current },
          operationType: 'attendance',
          userId: user.id,
          schoolId: user.schoolId,
        });
        Alert.alert(
          'Saved Offline',
          'Attendance saved and will be submitted automatically when you reconnect.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      }
    } catch (error: unknown) {
      Alert.alert('Error', (error as Error)?.message ?? 'Failed to submit attendance.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredStudents = search.trim()
    ? students.filter(
        (s) =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
          s.rollNumber.includes(search),
      )
    : students;

  const presentCount = Object.values(records).filter((s) => s === 'Present').length;
  const absentCount = Object.values(records).filter((s) => s === 'Absent').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }} edges={['top', 'left', 'right']}>
      <ConnectionBanner />

      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 10,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: VITANA_COLORS.border,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: VITANA_COLORS.text }}>
              Mark Attendance
            </Text>
            <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>{today}</Text>
          </View>
          <TouchableOpacity
            onPress={markAllPresent}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: primaryColor,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: primaryColor }}>All Present</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a' }} />
            <Text style={{ fontSize: 13, color: VITANA_COLORS.text }}>{presentCount} present</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' }} />
            <Text style={{ fontSize: 13, color: VITANA_COLORS.text }}>{absentCount} absent</Text>
          </View>
          <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary }}>
            {students.length} total
          </Text>
        </View>

        {/* Search */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#f5f7fa',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: VITANA_COLORS.border,
            paddingHorizontal: 10,
            paddingVertical: 8,
            gap: 8,
          }}
        >
          <Feather name="search" size={15} color={VITANA_COLORS.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or roll number..."
            placeholderTextColor={VITANA_COLORS.textSecondary}
            style={{ flex: 1, fontSize: 14, color: VITANA_COLORS.text }}
          />
        </View>
      </View>

      {/* Student List */}
      {isLoadingStudents ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <ActivityIndicator color={primaryColor} />
          <Text style={{ fontSize: 14, color: VITANA_COLORS.textSecondary }}>Loading students...</Text>
        </View>
      ) : filteredStudents.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, color: VITANA_COLORS.textSecondary }}>
            {students.length === 0
              ? 'No students found. Connect to load student list.'
              : 'No matching students'}
          </Text>
        </View>
      ) : (
        <FlashList
          data={filteredStudents}
          estimatedItemSize={68}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StudentRow
              student={item}
              status={records[item.id] ?? 'Present'}
              onToggle={toggleStatus}
            />
          )}
        />
      )}

      {/* Submit Footer */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity
          onPress={() => void submitAttendance()}
          disabled={isSubmitting || students.length === 0}
          style={{
            backgroundColor: students.length === 0 ? VITANA_COLORS.border : primaryColor,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: isSubmitting ? 0.75 : 1,
          }}
          accessibilityLabel={isConnected ? 'Submit attendance' : 'Save attendance offline'}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
              {isConnected ? 'Submit Attendance' : 'Save Offline'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
