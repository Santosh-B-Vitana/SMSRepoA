import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { onlineClassesApi } from '@/api/endpoints/online-classes';
import { useAuthStore } from '@/stores/authStore';
import { LiveKitMeetingRoom } from '@/components/meeting/LiveKitMeetingRoom';

export default function TeacherMeetingScreen() {
  const { token, wsUrl, classId } = useLocalSearchParams<{
    token: string;
    wsUrl: string;
    roomName: string;
    classId: string;
    isHost: string;
  }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const endMutation = useMutation({
    mutationFn: () => onlineClassesApi.end(classId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['online-classes'] });
      queryClient.invalidateQueries({ queryKey: ['online-class', classId] });
      router.back();
    },
  });

  return (
    <LiveKitMeetingRoom
      wsUrl={wsUrl}
      token={token}
      roomName=""
      displayName={user ? `${user.firstName} ${user.lastName}`.trim() : 'Teacher'}
      isHost
      onLeave={() => endMutation.mutate()}
    />
  );
}
