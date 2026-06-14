import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { LiveKitMeetingRoom } from '@/components/meeting/LiveKitMeetingRoom';

export default function StudentMeetingScreen() {
  const { token, wsUrl, classId } = useLocalSearchParams<{
    token: string;
    wsUrl: string;
    roomName: string;
    classId: string;
  }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const handleLeave = () => {
    queryClient.invalidateQueries({ queryKey: ['student-online-class', classId] });
    router.back();
  };

  return (
    <LiveKitMeetingRoom
      wsUrl={wsUrl}
      token={token}
      roomName=""
      displayName={user ? `${user.firstName} ${user.lastName}`.trim() : 'Student'}
      isHost={false}
      onLeave={handleLeave}
    />
  );
}
