import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi } from '@/api/endpoints/teacher';
import { useAuthStore } from '@/stores/authStore';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { VITANA_COLORS } from '@/theme/tokens';

export default function TeacherDashboard() {
  const user = useAuthStore((s) => s.user);
  const { primaryColor, schoolName } = useSchoolTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: teacherApi.getDashboard,
    staleTime: 5 * 60 * 1000,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: primaryColor,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
          {schoolName ?? 'School'}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(teacher)/leaves/index')}
          style={{ padding: 4 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="calendar" size={20} color="#fff" />
            {(data?.pendingLeaveCount ?? 0) > 0 && (
              <View
                style={{
                  backgroundColor: '#ef4444',
                  borderRadius: 8,
                  width: 16,
                  height: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                  {data!.pendingLeaveCount > 9 ? '9+' : String(data!.pendingLeaveCount)}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={{ padding: 16, gap: 12, paddingBottom: 32 }}>
          {/* Greeting */}
          <View>
            <Text style={{ fontSize: 13, color: VITANA_COLORS.textSecondary }}>{greeting},</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: VITANA_COLORS.text }}>
              {user?.fullName?.split(' ')[0] ?? 'Teacher'}
            </Text>
          </View>

          {/* Today's Classes */}
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
                Today's Classes
              </Text>
              <TouchableOpacity onPress={() => router.push('/(teacher)/timetable/index')}>
                <Text style={{ fontSize: 13, color: primaryColor }}>View all</Text>
              </TouchableOpacity>
            </View>
            {isLoading ? (
              <View style={{ padding: 16, gap: 10 }}>
                <SkeletonLoader height={52} borderRadius={8} />
                <SkeletonLoader height={52} borderRadius={8} />
              </View>
            ) : !data?.todaySchedule || data.todaySchedule.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: VITANA_COLORS.textSecondary }}>
                  No classes scheduled for today
                </Text>
              </View>
            ) : (
              data.todaySchedule.slice(0, 4).map((period, idx) => (
                <TouchableOpacity
                  key={period.id}
                  onPress={() =>
                    router.push({
                      pathname: '/(teacher)/attendance/[classId]',
                      params: { classId: period.classId },
                    })
                  }
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderBottomWidth: idx < Math.min(data.todaySchedule.length, 4) - 1 ? 1 : 0,
                    borderBottomColor: VITANA_COLORS.border,
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: `${primaryColor}18`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: primaryColor }}>
                      {period.startTime}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text }}>
                      {period.subjectName}
                    </Text>
                    <Text style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 2 }}>
                      {period.className}
                      {period.room ? ` · Room ${period.room}` : ''}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={VITANA_COLORS.border} />
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Class Status */}
          {(data?.classesStatus?.length ?? 0) > 0 && (
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
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: VITANA_COLORS.text }}>
                  Attendance Status
                </Text>
              </View>
              {data!.classesStatus.map((cls, idx) => (
                <TouchableOpacity
                  key={cls.classId}
                  onPress={() =>
                    router.push({
                      pathname: '/(teacher)/attendance/[classId]',
                      params: { classId: cls.classId },
                    })
                  }
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottomWidth: idx < data!.classesStatus.length - 1 ? 1 : 0,
                    borderBottomColor: VITANA_COLORS.border,
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: VITANA_COLORS.text }}>
                    {cls.className}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: cls.attendanceMarked ? '#16a34a' : '#f59e0b',
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        color: cls.attendanceMarked ? '#16a34a' : '#d97706',
                        fontWeight: '500',
                      }}
                    >
                      {cls.attendanceMarked ? 'Marked' : 'Pending'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => router.push('/(teacher)/classes/index')}
              style={{
                flex: 1,
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: VITANA_COLORS.border,
                gap: 8,
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: `${primaryColor}18`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="users" size={20} color={primaryColor} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '500', color: VITANA_COLORS.text }}>
                Classes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(teacher)/leaves/index')}
              style={{
                flex: 1,
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: VITANA_COLORS.border,
                gap: 8,
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: '#fef3c7',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="clipboard" size={20} color="#d97706" />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '500', color: VITANA_COLORS.text }}>
                Leaves
                {(data?.pendingLeaveCount ?? 0) > 0
                  ? ` (${data!.pendingLeaveCount})`
                  : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
