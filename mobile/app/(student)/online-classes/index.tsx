import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { onlineClassesApi } from '@/api/endpoints/online-classes';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import type { OnlineClassDto } from '@/shared-types/api/online-classes';

function CountdownBadge({ startIso }: { startIso: string }) {
  const start = new Date(startIso);
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();

  if (diffMs < 0) return null;

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) {
    return (
      <View style={{ backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#d97706' }}>In {diffMins}m</Text>
      </View>
    );
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return (
      <View style={{ backgroundColor: '#ede9fe', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#7c3aed' }}>In {diffHours}h</Text>
      </View>
    );
  }
  return null;
}

function StudentClassCard({ item }: { item: OnlineClassDto }) {
  const start = new Date(item.scheduledStart);
  const isLive = item.status === 'Live';

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(student)/online-classes/${item.id}`)}
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#1a1a2e', flex: 1, marginRight: 8 }} numberOfLines={1}>
          {item.title}
        </Text>
        {isLive ? (
          <View style={{ backgroundColor: '#dcfce7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a' }}>● LIVE</Text>
          </View>
        ) : (
          <CountdownBadge startIso={item.scheduledStart} />
        )}
      </View>

      {item.subjectName && (
        <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{item.subjectName}</Text>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
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
        {item.recordingCount > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="video" size={12} color="#6b7280" />
            <Text style={{ fontSize: 12, color: '#6b7280' }}>{item.recordingCount} rec</Text>
          </View>
        )}
      </View>

      {isLive && (
        <TouchableOpacity
          onPress={() => router.push(`/(student)/online-classes/${item.id}`)}
          style={{
            marginTop: 10,
            backgroundColor: '#16a34a',
            borderRadius: 8,
            paddingVertical: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Join Now</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function StudentOnlineClassesIndex() {
  const { primaryColor } = useSchoolTheme();

  const todayQuery = useQuery({
    queryKey: ['student-online-classes-today'],
    queryFn: onlineClassesApi.getToday,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000, // re-check every minute for live status
  });

  const upcomingQuery = useQuery({
    queryKey: ['student-online-classes-upcoming'],
    queryFn: () => onlineClassesApi.getUpcoming(1, 20),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = todayQuery.isLoading || upcomingQuery.isLoading;
  const isRefreshing = todayQuery.isRefetching || upcomingQuery.isRefetching;
  const onRefresh = () => { todayQuery.refetch(); upcomingQuery.refetch(); };

  const todayClasses = todayQuery.data ?? [];
  const upcomingItems = upcomingQuery.data?.items ?? [];
  const liveClasses = todayClasses.filter((c) => c.status === 'Live');

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
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Online Classes</Text>
      </View>

      {/* Live class banner */}
      {liveClasses.length > 0 && (
        <TouchableOpacity
          onPress={() => router.push(`/(student)/online-classes/${liveClasses[0].id}`)}
          style={{
            backgroundColor: '#16a34a',
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Feather name="radio" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 }}>
            {liveClasses[0].title} is live now!
          </Text>
          <Feather name="chevron-right" size={18} color="#fff" />
        </TouchableOpacity>
      )}

      {isLoading ? (
        <SkeletonLoader count={4} height={80} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        >
          {todayClasses.length > 0 && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Today
              </Text>
              {todayClasses.map((cls) => (
                <StudentClassCard key={cls.id} item={cls} />
              ))}
            </>
          )}

          <Text style={{ fontSize: 13, fontWeight: '700', color: '#6b7280', marginTop: 8, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Upcoming
          </Text>
          {upcomingItems.length === 0 ? (
            <EmptyState icon="video-off" message="No upcoming classes scheduled." />
          ) : (
            upcomingItems.map((cls) => (
              <StudentClassCard key={cls.id} item={cls} />
            ))
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
