import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { onlineClassesApi } from '@/api/endpoints/online-classes';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LockedModuleCard } from '@/components/common/LockedModuleCard';
import type { OnlineClassDto } from '@/shared-types/api/online-classes';

function ParentClassCard({ item }: { item: OnlineClassDto }) {
  const start = new Date(item.scheduledStart);
  const isLive = item.status === 'Live';

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: isLive ? '#16a34a' : '#1a6fd8',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#1a1a2e', flex: 1, marginRight: 8 }} numberOfLines={1}>
          {item.title}
        </Text>
        {isLive && (
          <View style={{ backgroundColor: '#dcfce7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a' }}>● Live</Text>
          </View>
        )}
      </View>

      {item.subjectName && (
        <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{item.subjectName}</Text>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="user" size={12} color="#6b7280" />
          <Text style={{ fontSize: 12, color: '#6b7280' }}>{item.hostName}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="clock" size={12} color="#6b7280" />
          <Text style={{ fontSize: 12, color: '#6b7280' }}>
            {start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </Text>
        </View>
      </View>

      {/* Attendance badge if class ended */}
      {item.status === 'Ended' && item.attendeeCount > 0 && (
        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="user-check" size={12} color="#16a34a" />
          <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: '600' }}>
            {item.attendeeCount} students attended
          </Text>
        </View>
      )}
    </View>
  );
}

export default function ParentOnlineClasses() {
  const { primaryColor } = useSchoolTheme();
  const hasParentView = useFeatureFlag('mobile.online_classes.parent_view', false);

  const upcomingQuery = useQuery({
    queryKey: ['parent-online-classes'],
    queryFn: () => onlineClassesApi.getUpcoming(1, 20),
    enabled: hasParentView,
    staleTime: 5 * 60 * 1000,
  });

  const todayQuery = useQuery({
    queryKey: ['parent-online-classes-today'],
    queryFn: onlineClassesApi.getToday,
    enabled: hasParentView,
    staleTime: 2 * 60 * 1000,
  });

  const isRefreshing = upcomingQuery.isRefetching || todayQuery.isRefetching;
  const onRefresh = () => { upcomingQuery.refetch(); todayQuery.refetch(); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
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
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Online Classes</Text>
      </View>

      {!hasParentView ? (
        <LockedModuleCard message="Online class visibility for parents is not enabled for your school. Contact the school admin to enable this feature." />
      ) : upcomingQuery.isLoading ? (
        <SkeletonLoader count={4} height={80} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        >
          {(todayQuery.data ?? []).length > 0 && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Today
              </Text>
              {(todayQuery.data ?? []).map((cls) => (
                <ParentClassCard key={cls.id} item={cls} />
              ))}
            </>
          )}

          <Text style={{ fontSize: 13, fontWeight: '700', color: '#6b7280', marginTop: 8, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Upcoming
          </Text>
          {(upcomingQuery.data?.items ?? []).length === 0 ? (
            <EmptyState icon="video-off" message="No upcoming online classes scheduled." />
          ) : (
            (upcomingQuery.data?.items ?? []).map((cls) => (
              <ParentClassCard key={cls.id} item={cls} />
            ))
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
