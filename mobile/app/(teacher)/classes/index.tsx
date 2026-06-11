import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi } from '@/api/endpoints/teacher';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/common/EmptyState';
import { VITANA_COLORS } from '@/theme/tokens';

export default function ClassesList() {
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: teacherApi.getTeacherAssignments,
    staleTime: 30 * 60 * 1000,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: VITANA_COLORS.border,
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: '600', color: VITANA_COLORS.text }}>
          My Classes
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={{ padding: 16, paddingBottom: 32, gap: 10 }}>
          {isLoading ? (
            <View style={{ gap: 10 }}>
              <SkeletonLoader height={88} borderRadius={12} />
              <SkeletonLoader height={88} borderRadius={12} />
              <SkeletonLoader height={88} borderRadius={12} />
            </View>
          ) : !data || data.length === 0 ? (
            <EmptyState
              icon="users"
              title="No classes assigned"
              subtitle="Contact your administrator if this is incorrect."
            />
          ) : (
            data.map((assignment) => (
              <TouchableOpacity
                key={assignment.classId}
                onPress={() =>
                  router.push({
                    pathname: '/(teacher)/classes/[classId]',
                    params: { classId: assignment.classId },
                  })
                }
                activeOpacity={0.7}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: VITANA_COLORS.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                {/* Class avatar */}
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    backgroundColor: `${primaryColor}18`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                    flexShrink: 0,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: primaryColor }}>
                    {assignment.className.slice(0, 2).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: VITANA_COLORS.text }}>
                    {assignment.className}
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: VITANA_COLORS.textSecondary, marginTop: 3 }}
                    numberOfLines={1}
                  >
                    {assignment.subjects.join(' · ')}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/(teacher)/attendance/[classId]',
                        params: { classId: assignment.classId },
                      })
                    }
                    style={{
                      backgroundColor: primaryColor,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Attend.</Text>
                  </TouchableOpacity>
                  <Feather name="chevron-right" size={16} color={VITANA_COLORS.border} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
