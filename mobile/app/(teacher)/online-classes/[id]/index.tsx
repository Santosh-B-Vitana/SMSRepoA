import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { onlineClassesApi } from '@/api/endpoints/online-classes';
import { useSchoolTheme } from '@/theme/useSchoolTheme';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
      <Feather name={icon as any} size={16} color="#6b7280" />
      <Text style={{ fontSize: 13, color: '#6b7280', width: 90 }}>{label}</Text>
      <Text style={{ fontSize: 13, color: '#1a1a2e', flex: 1, fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

export default function TeacherClassDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { primaryColor } = useSchoolTheme();
  const queryClient = useQueryClient();

  const { data: cls, isLoading } = useQuery({
    queryKey: ['online-class', id],
    queryFn: () => onlineClassesApi.getById(id),
    enabled: !!id,
  });

  const { data: recordings } = useQuery({
    queryKey: ['online-class-recordings', id],
    queryFn: () => onlineClassesApi.getRecordings(id),
    enabled: !!id,
  });

  const joinMutation = useMutation({
    mutationFn: () => onlineClassesApi.join(id),
    onSuccess: (data) => {
      // Navigate to the meeting room screen
      router.push({
        pathname: '/(teacher)/online-classes/meeting',
        params: { token: data.token, wsUrl: data.wsUrl, roomName: data.roomName, classId: id, isHost: '1' },
      });
    },
    onError: () => Alert.alert('Error', 'Could not join class. Please try again.'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => onlineClassesApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-classes'] });
      queryClient.invalidateQueries({ queryKey: ['online-class', id] });
      Alert.alert('Cancelled', 'The class has been cancelled and students notified.');
    },
    onError: () => Alert.alert('Error', 'Could not cancel class.'),
  });

  const endMutation = useMutation({
    mutationFn: () => onlineClassesApi.end(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-class', id] });
      Alert.alert('Class Ended', 'The class has been marked as ended.');
    },
  });

  if (isLoading) return <SkeletonLoader count={5} height={60} />;
  if (!cls) return null;

  const scheduledStart = new Date(cls.scheduledStart);
  const scheduledEnd = new Date(cls.scheduledEnd);
  const isLive = cls.status === 'Live';
  const isScheduled = cls.status === 'Scheduled';
  const canJoin = isLive || isScheduled;

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
          backgroundColor: isLive ? '#16a34a' : primaryColor,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 }} numberOfLines={1}>
          {cls.title}
        </Text>
        {isLive && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>● LIVE</Text>}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Main card */}
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
          {cls.description && (
            <Text style={{ fontSize: 14, color: '#4b5563', marginBottom: 14, lineHeight: 20 }}>{cls.description}</Text>
          )}

          <DetailRow icon="calendar" label="Date" value={scheduledStart.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })} />
          <DetailRow icon="clock" label="Time" value={`${scheduledStart.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} — ${scheduledEnd.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`} />
          {cls.subjectName && <DetailRow icon="book" label="Subject" value={cls.subjectName} />}
          {cls.className && <DetailRow icon="users" label="Class" value={`${cls.className}${cls.sectionName ? ` — ${cls.sectionName}` : ''}`} />}
          <DetailRow icon="video" label="Provider" value={cls.provider} />
          <DetailRow icon="bar-chart-2" label="Attendees" value={`${cls.attendeeCount} joined`} />
        </View>

        {/* Action buttons */}
        {canJoin && (
          <TouchableOpacity
            onPress={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
            style={{
              backgroundColor: isLive ? '#16a34a' : primaryColor,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
              marginBottom: 10,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {joinMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name={isLive ? 'radio' : 'play-circle'} size={20} color="#fff" />
            )}
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
              {isLive ? 'Rejoin Class' : 'Start Class'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Attendance button */}
        <TouchableOpacity
          onPress={() => router.push(`/(teacher)/online-classes/${id}/attendance`)}
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            marginBottom: 10,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: '#e5e7eb',
          }}
        >
          <Feather name="user-check" size={18} color={primaryColor} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: primaryColor }}>View Attendance</Text>
        </TouchableOpacity>

        {/* Recordings */}
        {(recordings ?? []).length > 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 10 }}>Recordings ({recordings?.length})</Text>
            {recordings?.map((rec) => (
              <TouchableOpacity
                key={rec.id}
                onPress={() => rec.playbackUrl && Linking.openURL(rec.playbackUrl)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}
              >
                <Feather name="film" size={18} color={primaryColor} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, color: '#374151' }}>
                    {Math.floor(rec.durationSeconds / 60)} min recording
                  </Text>
                  <Text style={{ fontSize: 11, color: '#9ca3af' }}>{rec.fileSizeMb.toFixed(1)} MB · {new Date(rec.createdAt).toLocaleDateString('en-IN')}</Text>
                </View>
                {rec.isTeacherRestricted && <Feather name="lock" size={14} color="#f59e0b" />}
                <Feather name="external-link" size={14} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Danger zone */}
        {isScheduled && (
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Cancel Class?', 'Students will be notified that the class has been cancelled.', [
                { text: 'Keep', style: 'cancel' },
                { text: 'Cancel Class', style: 'destructive', onPress: () => cancelMutation.mutate() },
              ])
            }
            style={{
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#fca5a5',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#ef4444' }}>Cancel Class</Text>
          </TouchableOpacity>
        )}

        {isLive && (
          <TouchableOpacity
            onPress={() =>
              Alert.alert('End Class?', 'This will mark the class as ended for all participants.', [
                { text: 'Keep Going', style: 'cancel' },
                { text: 'End Class', style: 'destructive', onPress: () => endMutation.mutate() },
              ])
            }
            style={{
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#fca5a5',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#ef4444' }}>End Class</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
