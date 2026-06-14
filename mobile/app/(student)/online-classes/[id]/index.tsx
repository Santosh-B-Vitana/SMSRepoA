import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { onlineClassesApi } from '@/api/endpoints/online-classes';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';

export default function StudentClassDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { primaryColor } = useSchoolTheme();
  const hasRecordings = useFeatureFlag('mobile.online_classes.recordings', true);

  const { data: cls, isLoading } = useQuery({
    queryKey: ['student-online-class', id],
    queryFn: () => onlineClassesApi.getById(id),
    enabled: !!id,
  });

  const { data: recordings } = useQuery({
    queryKey: ['student-online-class-recordings', id],
    queryFn: () => onlineClassesApi.getRecordings(id),
    enabled: !!id && hasRecordings,
  });

  const joinMutation = useMutation({
    mutationFn: () => onlineClassesApi.join(id),
    onSuccess: (data) => {
      router.push({
        pathname: '/(student)/online-classes/meeting',
        params: { token: data.token, wsUrl: data.wsUrl, roomName: data.roomName, classId: id, isHost: '0' },
      });
    },
    onError: () => Alert.alert('Error', 'Could not join the class. Please try again.'),
  });

  if (isLoading) return <SkeletonLoader count={4} height={70} />;
  if (!cls) return null;

  const scheduledStart = new Date(cls.scheduledStart);
  const scheduledEnd = new Date(cls.scheduledEnd);
  const isLive = cls.status === 'Live';
  const isScheduled = cls.status === 'Scheduled';
  const isEnded = cls.status === 'Ended';
  const canJoin = isLive;

  const diffMs = scheduledStart.getTime() - Date.now();
  const diffMins = Math.floor(diffMs / 60000);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: isLive ? '#16a34a' : primaryColor,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 }} numberOfLines={1}>
          {cls.title}
        </Text>
        {isLive && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>● LIVE</Text>}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Info card */}
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
          {cls.description && (
            <Text style={{ fontSize: 14, color: '#4b5563', marginBottom: 12, lineHeight: 20 }}>{cls.description}</Text>
          )}

          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="user" size={15} color="#6b7280" />
              <Text style={{ fontSize: 13, color: '#374151' }}>{cls.hostName}</Text>
            </View>
            {cls.subjectName && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="book" size={15} color="#6b7280" />
                <Text style={{ fontSize: 13, color: '#374151' }}>{cls.subjectName}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="calendar" size={15} color="#6b7280" />
              <Text style={{ fontSize: 13, color: '#374151' }}>
                {scheduledStart.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'long' })}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="clock" size={15} color="#6b7280" />
              <Text style={{ fontSize: 13, color: '#374151' }}>
                {scheduledStart.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                {' — '}
                {scheduledEnd.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        </View>

        {/* Countdown for scheduled classes */}
        {isScheduled && diffMins > 0 && (
          <View style={{ backgroundColor: '#ede9fe', borderRadius: 12, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Feather name="clock" size={18} color="#7c3aed" />
            <Text style={{ fontSize: 14, color: '#7c3aed', fontWeight: '600' }}>
              Class starts in {diffMins >= 60 ? `${Math.floor(diffMins / 60)}h ${diffMins % 60}m` : `${diffMins} minutes`}
            </Text>
          </View>
        )}

        {/* Join button */}
        {canJoin && (
          <TouchableOpacity
            onPress={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
            style={{
              backgroundColor: '#16a34a',
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
              marginBottom: 12,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {joinMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="video" size={20} color="#fff" />
            )}
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Join Class Now</Text>
          </TouchableOpacity>
        )}

        {/* Class ended state */}
        {isEnded && (
          <View style={{ backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, marginBottom: 14, alignItems: 'center' }}>
            <Feather name="check-circle" size={24} color="#9ca3af" />
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, fontWeight: '600' }}>Class has ended</Text>
          </View>
        )}

        {/* Recordings */}
        {hasRecordings && (recordings ?? []).length > 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 10 }}>
              Class Recordings ({recordings?.length})
            </Text>
            {recordings?.map((rec) => (
              <TouchableOpacity
                key={rec.id}
                onPress={() => rec.playbackUrl && Linking.openURL(rec.playbackUrl)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="play" size={18} color="#7c3aed" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
                    {Math.floor(rec.durationSeconds / 60)} min class recording
                  </Text>
                  <Text style={{ fontSize: 11, color: '#9ca3af' }}>
                    {new Date(rec.createdAt).toLocaleDateString('en-IN')} · {rec.fileSizeMb.toFixed(1)} MB
                  </Text>
                </View>
                {rec.downloadUrl ? (
                  <Feather name="external-link" size={16} color={primaryColor} />
                ) : (
                  <Feather name="lock" size={16} color="#9ca3af" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
