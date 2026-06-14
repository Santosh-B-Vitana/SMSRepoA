import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { teacherApi } from '@/api/endpoints/teacher';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { VITANA_COLORS } from '@/theme/tokens';

export default function ClassesList() {
  const { primaryColor } = useSchoolTheme();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: teacherApi.getTeacherAssignments,
    staleTime: 30 * 60 * 1000,
  });

  // Reuse cached dashboard data to know which classes are scheduled today
  const { data: dashboard } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: teacherApi.getDashboard,
    staleTime: 5 * 60 * 1000,
  });

  // Set of classIds that have at least one period today
  const todayClassIds = useMemo(() => {
    const ids = new Set<string>();
    for (const slot of dashboard?.todaySchedule ?? []) {
      if (slot.classId) ids.add(String(slot.classId));
    }
    return ids;
  }, [dashboard]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Classes</Text>
        {todayClassIds.size > 0 && (
          <View style={[styles.todayPill, { backgroundColor: `${primaryColor}15` }]}>
            <Feather name="calendar" size={12} color={primaryColor} />
            <Text style={[styles.todayPillText, { color: primaryColor }]}>
              {todayClassIds.size} today
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={styles.list}>
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
            data.map((assignment, idx) => {
              const hasClassToday = todayClassIds.has(assignment.classId);
              return (
                <TouchableOpacity
                  key={`${assignment.classId}-${idx}`}
                  onPress={() =>
                    router.push({
                      pathname: '/(teacher)/classes/[classId]',
                      params: { classId: assignment.classId },
                    })
                  }
                  activeOpacity={0.7}
                  style={[
                    styles.card,
                    hasClassToday && { borderColor: `${primaryColor}44`, borderWidth: 1.5 },
                  ]}
                >
                  {/* Class avatar */}
                  <View style={[styles.avatar, { backgroundColor: `${primaryColor}18` }]}>
                    <Text style={[styles.avatarText, { color: primaryColor }]}>
                      {assignment.className.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.info}>
                    <View style={styles.nameRow}>
                      <Text style={styles.className} numberOfLines={1}>
                        {assignment.className}
                      </Text>
                      {hasClassToday && (
                        <View style={[styles.todayBadge, { backgroundColor: `${primaryColor}15` }]}>
                          <Text style={[styles.todayBadgeText, { color: primaryColor }]}>Today</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.subjects} numberOfLines={1}>
                      {(assignment.subjects ?? []).join(' · ')}
                    </Text>
                  </View>

                  <View style={styles.actions}>
                    {hasClassToday ? (
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: '/(teacher)/attendance/[classId]',
                            params: { classId: assignment.classId },
                          })
                        }
                        style={[styles.attendBtn, { backgroundColor: primaryColor }]}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityLabel={`Mark attendance for ${assignment.className}`}
                      >
                        <Feather name="check-square" size={13} color="#fff" />
                        <Text style={styles.attendBtnText}>Attend</Text>
                      </TouchableOpacity>
                    ) : null}
                    <Feather name="chevron-right" size={16} color={VITANA_COLORS.border} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: VITANA_COLORS.text,
    fontFamily: 'Inter',
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  todayPillText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  className: {
    fontSize: 15,
    fontWeight: '600',
    color: VITANA_COLORS.text,
    fontFamily: 'Inter',
  },
  todayBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  subjects: {
    fontSize: 12,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  attendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  attendBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});
