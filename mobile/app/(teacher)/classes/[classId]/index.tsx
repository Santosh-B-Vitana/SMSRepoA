import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { eq } from 'drizzle-orm';
import { db } from '@/offline/db';
import { cachedStudentLists } from '@/offline/schema';
import { teacherApi } from '@/api/endpoints/teacher';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolStore } from '@/stores/schoolStore';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/common/EmptyState';
import { VITANA_COLORS } from '@/theme/tokens';
import type { MinimalStudent } from '@/api/endpoints/teacher';

export default function ClassDetail() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { primaryColor } = useSchoolTheme();
  const user = useAuthStore((s) => s.user);
  const academicYear = useSchoolStore((s) => s.academicYear);

  const [students, setStudents] = useState<MinimalStudent[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected || !state.isInternetReachable);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    void loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  async function loadStudents() {
    setIsLoadingStudents(true);
    try {
      const netState = await NetInfo.fetch();
      if (netState.isConnected && netState.isInternetReachable) {
        const fetched = await teacherApi.getClassStudents(classId!);
        setStudents(fetched);
        await db
          .insert(cachedStudentLists)
          .values({
            classId: classId!,
            students: JSON.stringify(fetched),
            cachedAt: Date.now(),
            academicYear: academicYear ?? '2025-2026',
            schoolId: user!.schoolId,
          })
          .onConflictDoUpdate({
            target: cachedStudentLists.classId,
            set: { students: JSON.stringify(fetched), cachedAt: Date.now() },
          });
      } else {
        const cached = await db
          .select()
          .from(cachedStudentLists)
          .where(eq(cachedStudentLists.classId, classId!))
          .limit(1);
        if (cached[0]) {
          setStudents(JSON.parse(cached[0].students) as MinimalStudent[]);
        }
      }
    } catch {
      // fall through to empty state
    } finally {
      setIsLoadingStudents(false);
    }
  }

  const { data: stats } = useQuery({
    queryKey: ['attendance-stats', classId],
    queryFn: () => teacherApi.getAttendanceStats(classId!),
    enabled: !!classId,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: 17,
            fontWeight: '600',
            color: VITANA_COLORS.text,
            marginLeft: 12,
          }}
          numberOfLines={1}
        >
          Class Detail
        </Text>
        <TouchableOpacity
          onPress={() =>
            router.push({ pathname: '/(teacher)/attendance/[classId]', params: { classId: classId! } })
          }
          style={{
            backgroundColor: primaryColor,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Mark Attendance</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoadingStudents} onRefresh={loadStudents} />}
      >
        <View style={{ padding: 16, paddingBottom: 32, gap: 12 }}>
          {/* Stats */}
          {stats && (
            <View
              style={{
                backgroundColor: primaryColor,
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                justifyContent: 'space-around',
              }}
            >
              {[
                { label: 'Present', value: stats.presentCount, color: '#fff' },
                { label: 'Absent', value: stats.absentCount, color: '#fca5a5' },
                { label: 'Late', value: stats.lateCount, color: '#fde68a' },
                { label: 'Total', value: stats.totalCount, color: 'rgba(255,255,255,0.7)' },
              ].map(({ label, value, color }) => (
                <View key={label} style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color }}>{value}</Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Offline banner */}
          {isOffline && (
            <View
              style={{
                backgroundColor: '#fffbeb',
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: '#fde68a',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Feather name="wifi-off" size={14} color="#d97706" />
              <Text style={{ fontSize: 12, color: '#92400e', flex: 1 }}>
                Offline — showing cached student list
              </Text>
            </View>
          )}

          {/* Students */}
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: VITANA_COLORS.border,
            }}
          >
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: VITANA_COLORS.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text }}>
                Students
              </Text>
              {students.length > 0 && (
                <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary }}>
                  {students.length} total
                </Text>
              )}
            </View>

            {isLoadingStudents ? (
              <View style={{ padding: 16, gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <SkeletonLoader width={40} height={40} borderRadius={20} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <SkeletonLoader height={14} width="60%" />
                      <SkeletonLoader height={11} width="30%" />
                    </View>
                  </View>
                ))}
              </View>
            ) : students.length === 0 ? (
              <EmptyState icon="users" title="No students" subtitle="No students found for this class." />
            ) : (
              students.map((student, idx) => (
                <View
                  key={student.id}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderBottomWidth: idx < students.length - 1 ? 1 : 0,
                    borderBottomColor: VITANA_COLORS.border,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#f1f5f9',
                      overflow: 'hidden',
                      marginRight: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {student.photoUrl ? (
                      <Image
                        source={{ uri: student.photoUrl }}
                        style={{ width: 40, height: 40 }}
                        contentFit="cover"
                      />
                    ) : (
                      <Text
                        style={{ fontSize: 16, fontWeight: '700', color: VITANA_COLORS.textSecondary }}
                      >
                        {student.firstName[0]}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text }}>
                      {student.firstName} {student.lastName}
                    </Text>
                    <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary }}>
                      Roll {student.rollNumber}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
