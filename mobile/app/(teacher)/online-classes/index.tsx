import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { onlineClassesApi } from '@/api/endpoints/online-classes';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import type { OnlineClassDto } from '@/shared-types/api/online-classes';
import { formatDateIST } from '@/shared-utils';

function ClassStatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    Scheduled: { bg: '#e3f2fd', text: '#1565c0', label: 'Scheduled' },
    Live: { bg: '#e8f5e9', text: '#2e7d32', label: '● Live' },
    Ended: { bg: '#f3f4f6', text: '#6b7280', label: 'Ended' },
    Cancelled: { bg: '#fef2f2', text: '#b91c1c', label: 'Cancelled' },
  };
  const c = colors[status] ?? colors.Scheduled;
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: c.bg }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.text }}>{c.label}</Text>
    </View>
  );
}

function ClassCard({ item, onPress }: { item: OnlineClassDto; onPress: () => void }) {
  const start = new Date(item.scheduledStart);
  const timeStr = start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1a1a2e' }} numberOfLines={1}>
            {item.title}
          </Text>
          {item.subjectName && (
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{item.subjectName}</Text>
          )}
          {item.className && (
            <Text style={{ fontSize: 12, color: '#6b7280' }}>
              {item.className}
              {item.sectionName ? ` — ${item.sectionName}` : ''}
            </Text>
          )}
        </View>
        <ClassStatusBadge status={item.status} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="calendar" size={13} color="#6b7280" />
          <Text style={{ fontSize: 12, color: '#6b7280' }}>{dateStr}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="clock" size={13} color="#6b7280" />
          <Text style={{ fontSize: 12, color: '#6b7280' }}>{timeStr}</Text>
        </View>
        {item.recordingCount > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="video" size={13} color="#6b7280" />
            <Text style={{ fontSize: 12, color: '#6b7280' }}>{item.recordingCount} rec</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function TeacherOnlineClassesIndex() {
  const { primaryColor } = useSchoolTheme();
  const hasInstant = useFeatureFlag('mobile.online_classes.instant_class', true);
  const queryClient = useQueryClient();

  const todayQuery = useQuery({
    queryKey: ['online-classes', 'today'],
    queryFn: onlineClassesApi.getToday,
    staleTime: 2 * 60 * 1000,
  });

  const upcomingQuery = useQuery({
    queryKey: ['online-classes', 'upcoming'],
    queryFn: () => onlineClassesApi.getUpcoming(1, 20),
    staleTime: 2 * 60 * 1000,
  });

  const instantMutation = useMutation({
    mutationFn: () => onlineClassesApi.startInstant(),
    onSuccess: (cls) => {
      queryClient.invalidateQueries({ queryKey: ['online-classes'] });
      router.push(`/(teacher)/online-classes/${cls.id}`);
    },
  });

  const isLoading = todayQuery.isLoading || upcomingQuery.isLoading;
  const isRefreshing = todayQuery.isRefetching || upcomingQuery.isRefetching;

  const onRefresh = () => {
    todayQuery.refetch();
    upcomingQuery.refetch();
  };

  const todayClasses = todayQuery.data ?? [];
  const upcomingItems = upcomingQuery.data?.items ?? [];

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Online Classes</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(teacher)/online-classes/schedule')}
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>+ Schedule</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <SkeletonLoader count={4} height={80} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        >
          {/* Today's Classes */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Today
          </Text>
          {todayClasses.length === 0 ? (
            <Text style={{ fontSize: 14, color: '#9ca3af', marginBottom: 16 }}>No classes scheduled for today.</Text>
          ) : (
            todayClasses.map((cls) => (
              <ClassCard
                key={cls.id}
                item={cls}
                onPress={() => router.push(`/(teacher)/online-classes/${cls.id}`)}
              />
            ))
          )}

          {/* Upcoming */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#6b7280', marginTop: 8, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Upcoming
          </Text>
          {upcomingItems.length === 0 ? (
            <EmptyState icon="video" message="No upcoming classes. Schedule one to get started." />
          ) : (
            upcomingItems.map((cls) => (
              <ClassCard
                key={cls.id}
                item={cls}
                onPress={() => router.push(`/(teacher)/online-classes/${cls.id}`)}
              />
            ))
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Start Instant Class FAB */}
      {hasInstant && (
        <TouchableOpacity
          onPress={() => instantMutation.mutate()}
          disabled={instantMutation.isPending}
          style={{
            position: 'absolute',
            bottom: 28,
            right: 20,
            backgroundColor: primaryColor,
            borderRadius: 28,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 8,
            gap: 8,
          }}
        >
          {instantMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Feather name="zap" size={18} color="#fff" />
          )}
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Start Instant Class</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
