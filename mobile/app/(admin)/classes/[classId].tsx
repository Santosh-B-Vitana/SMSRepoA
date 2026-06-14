import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, Image, StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { adminApi } from '@/api/endpoints/admin';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { VITANA_COLORS } from '@/theme/tokens';
import { SubScreenHeader } from '@/components/ui/SubScreenHeader';

type Tab = 'students' | 'attendance' | 'subjects';

interface Student {
  id: string; admissionNumber: string; name: string;
  class: string; section: string; rollNumber: string;
  status: string; photoUrl: string | null;
  gender?: string; attendancePercentage?: number;
}

interface AttendanceStats {
  totalStudents: number; presentToday: number; absentToday: number;
  lateToday: number; attendanceRate: number;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.statBox, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StudentRow({ item }: { item: Student }) {
  const { primaryColor } = useSchoolTheme();
  const initials = item.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';
  const attPct = item.attendancePercentage ?? 100;
  const attColor = attPct >= 75 ? '#059669' : VITANA_COLORS.warning;

  return (
    <TouchableOpacity
      style={styles.studentRow}
      onPress={() => router.push({ pathname: '/(admin)/students/[id]', params: { id: item.id, name: item.name } })}
      activeOpacity={0.7}
    >
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: `${primaryColor}20` }]}>
          <Text style={[styles.initials, { color: primaryColor }]}>{initials}</Text>
        </View>
      )}
      <View style={styles.rowInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentMeta}>
          Roll #{item.rollNumber || '—'}
          {item.admissionNumber ? ` · Adm# ${item.admissionNumber}` : ''}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {item.attendancePercentage !== undefined && (
          <Text style={[styles.attPct, { color: attColor }]}>{attPct.toFixed(0)}%</Text>
        )}
        <View style={[styles.statusDot, { backgroundColor: item.status === 'active' ? '#059669' : '#ef4444' }]} />
        <Feather name="chevron-right" size={14} color={VITANA_COLORS.border} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function ClassDetailScreen() {
  const { classId, className, section, classTeacher } = useLocalSearchParams<{
    classId: string; className: string; section?: string; classTeacher?: string;
  }>();
  const { primaryColor } = useSchoolTheme();
  const [tab, setTab] = useState<Tab>('students');

  const title = section ? `${className} – ${section}` : (className ?? 'Class Detail');

  // ── Students in this class ───────────────────────────────────────────────
  const {
    data: studentsData, isLoading: studentsLoading,
    fetchNextPage, hasNextPage, isFetchingNextPage, refetch: refetchStudents, isRefetching: studentsRefetching,
  } = useInfiniteQuery({
    queryKey: ['class-students', classId],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get('/students', {
        params: { classId, page: pageParam, pageSize: 30 },
      }) as Promise<{ students: Student[]; totalCount: number }>,
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.students?.length === 30 ? pages.length + 1 : undefined,
    enabled: !!classId && tab === 'students',
    staleTime: 2 * 60 * 1000,
  });

  const students = studentsData?.pages.flatMap((p) => p.students ?? []) ?? [];
  const totalStudents = studentsData?.pages[0]?.totalCount ?? students.length;

  // ── Attendance stats for this class ─────────────────────────────────────
  const { data: attStats, isLoading: attLoading, refetch: refetchAtt } = useQuery<AttendanceStats>({
    queryKey: ['class-attendance', classId],
    queryFn: () =>
      (apiClient.get('/attendance/stats', { params: { classId } }) as Promise<any>)
        .then((r: any) => r?.stats ?? r ?? {}),
    enabled: !!classId && tab === 'attendance',
    staleTime: 3 * 60 * 1000,
  });

  // ── Subjects for this class ──────────────────────────────────────────────
  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['class-subjects', classId],
    queryFn: () => adminApi.getClassSubjects(classId),
    enabled: !!classId && tab === 'subjects',
    staleTime: 5 * 60 * 1000,
  });

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'students',   label: 'Students',   icon: 'users' },
    { id: 'attendance', label: 'Attendance', icon: 'user-check' },
    { id: 'subjects',   label: 'Subjects',   icon: 'book-open' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubScreenHeader title={title} />

      {/* Class info strip */}
      <View style={styles.infoStrip}>
        {classTeacher ? (
          <View style={styles.infoChip}>
            <Feather name="user" size={12} color={primaryColor} />
            <Text style={[styles.infoChipText, { color: primaryColor }]}>{classTeacher}</Text>
          </View>
        ) : null}
        <View style={styles.infoChip}>
          <Feather name="users" size={12} color="#059669" />
          <Text style={[styles.infoChipText, { color: '#059669' }]}>{totalStudents} students</Text>
        </View>
        {section ? (
          <View style={styles.infoChip}>
            <Feather name="layers" size={12} color="#7c3aed" />
            <Text style={[styles.infoChipText, { color: '#7c3aed' }]}>Section {section}</Text>
          </View>
        ) : null}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, tab === t.id && { borderBottomColor: primaryColor, borderBottomWidth: 2 }]}
            onPress={() => setTab(t.id)}
          >
            <Feather name={t.icon as any} size={14} color={tab === t.id ? primaryColor : VITANA_COLORS.textSecondary} />
            <Text style={[styles.tabLabel, tab === t.id && { color: primaryColor, fontWeight: '700' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Students Tab ── */}
      {tab === 'students' && (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <StudentRow item={item} />}
          refreshControl={
            <RefreshControl refreshing={studentsRefetching} onRefresh={refetchStudents} tintColor={primaryColor} />
          }
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); }}
          onEndReachedThreshold={0.4}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f1f5f9', marginLeft: 74 }} />}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} color={primaryColor} /> : null}
          ListHeaderComponent={
            students.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>{totalStudents} student{totalStudents !== 1 ? 's' : ''} enrolled</Text>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/(admin)/students/add' })}
                  style={[styles.addStudentBtn, { backgroundColor: `${primaryColor}15`, borderColor: primaryColor }]}
                >
                  <Feather name="user-plus" size={13} color={primaryColor} />
                  <Text style={[styles.addStudentText, { color: primaryColor }]}>Add Student</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListEmptyComponent={
            studentsLoading ? (
              <View style={{ padding: 48, alignItems: 'center' }}>
                <ActivityIndicator color={primaryColor} size="large" />
              </View>
            ) : (
              <View style={{ padding: 48, alignItems: 'center', gap: 12 }}>
                <Feather name="users" size={40} color={VITANA_COLORS.border} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: VITANA_COLORS.text }}>No students enrolled</Text>
                <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, textAlign: 'center' }}>
                  No students have been assigned to this class yet.
                </Text>
                <TouchableOpacity
                  style={[styles.emptyAddBtn, { backgroundColor: primaryColor }]}
                  onPress={() => router.push({ pathname: '/(admin)/students/add' })}
                >
                  <Feather name="user-plus" size={15} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Add Student</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}

      {/* ── Attendance Tab ── */}
      {tab === 'attendance' && (
        <View style={{ flex: 1 }}>
          {attLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={primaryColor} size="large" />
            </View>
          ) : !attStats || attStats.totalStudents === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
              <Feather name="calendar" size={40} color={VITANA_COLORS.border} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>No attendance data</Text>
              <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary, textAlign: 'center' }}>
                Attendance will appear here once teachers mark it for this class.
              </Text>
            </View>
          ) : (
            <View style={{ padding: 16, gap: 12 }}>
              {/* Overall rate */}
              <View style={styles.attCard}>
                <Text style={styles.attCardTitle}>Today's Attendance</Text>
                <Text style={[styles.attRate, {
                  color: (attStats.attendanceRate ?? 0) >= 75 ? '#059669' : '#dc2626'
                }]}>
                  {(attStats.attendanceRate ?? 0).toFixed(1)}%
                </Text>
                <View style={styles.attBarTrack}>
                  <View style={[styles.attBarFill, {
                    width: `${Math.min(attStats.attendanceRate ?? 0, 100)}%` as any,
                    backgroundColor: (attStats.attendanceRate ?? 0) >= 75 ? '#059669' : '#dc2626',
                  }]} />
                </View>
              </View>

              {/* Stat boxes */}
              <View style={styles.statRow}>
                <StatBox label="Total" value={attStats.totalStudents ?? 0} color={VITANA_COLORS.textSecondary} />
                <StatBox label="Present" value={attStats.presentToday ?? 0} color="#059669" />
                <StatBox label="Absent" value={attStats.absentToday ?? 0} color="#dc2626" />
                <StatBox label="Late" value={attStats.lateToday ?? 0} color="#d97706" />
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── Subjects Tab ── */}
      {tab === 'subjects' && (
        <View style={{ flex: 1 }}>
          {subjectsLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={primaryColor} size="large" />
            </View>
          ) : !subjects || subjects.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 }}>
              <Feather name="book-open" size={40} color={VITANA_COLORS.border} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>No subjects configured</Text>
            </View>
          ) : (
            <FlatList
              data={subjects}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <View style={styles.subjectCard}>
                  <View style={[styles.subjectIcon, { backgroundColor: `${primaryColor}15` }]}>
                    <Feather name="book" size={18} color={primaryColor} />
                  </View>
                  <View style={styles.subjectInfo}>
                    <Text style={styles.subjectName}>{item.subjectName}</Text>
                    <Text style={styles.subjectCode}>{item.subjectCode}</Text>
                  </View>
                  {item.teacherName ? (
                    <View style={styles.teacherChip}>
                      <Feather name="user" size={11} color="#7c3aed" />
                      <Text style={styles.teacherName} numberOfLines={1}>{item.teacherName}</Text>
                    </View>
                  ) : (
                    <View style={[styles.teacherChip, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                      <Feather name="alert-circle" size={11} color="#d97706" />
                      <Text style={[styles.teacherName, { color: '#d97706' }]}>Unassigned</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/(admin)/staff/assign-classes', params: {} })}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="chevron-right" size={14} color={VITANA_COLORS.border} />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },

  infoStrip: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  infoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb',
  },
  infoChipText: { fontSize: 12, fontWeight: '600' },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 12, fontWeight: '500', color: VITANA_COLORS.textSecondary },

  listHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  listHeaderText: { fontSize: 13, color: VITANA_COLORS.textSecondary, fontWeight: '500' },
  addStudentBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  addStudentText: { fontSize: 12, fontWeight: '700' },

  studentRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarPlaceholder: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 15, fontWeight: '700' },
  rowInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  studentMeta: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  attPct: { fontSize: 12, fontWeight: '700' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },

  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
  },

  attCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', gap: 8,
  },
  attCardTitle: { fontSize: 13, fontWeight: '600', color: VITANA_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  attRate: { fontSize: 44, fontWeight: '800', fontFamily: 'Poppins' },
  attBarTrack: { width: '100%', height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  attBarFill: { height: 8, borderRadius: 4 },

  statRow: { flexDirection: 'row', gap: 8 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    padding: 12, alignItems: 'center', borderTopWidth: 3,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  statValue: { fontSize: 22, fontWeight: '800', fontFamily: 'Poppins' },
  statLabel: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 2 },

  subjectCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  subjectIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  subjectInfo: { flex: 1 },
  subjectName: { fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text },
  subjectCode: { fontSize: 11, color: VITANA_COLORS.textSecondary, marginTop: 2 },
  teacherChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#e9d5ff',
    maxWidth: 110,
  },
  teacherName: { fontSize: 11, fontWeight: '600', color: '#7c3aed', flexShrink: 1 },
});
