/**
 * LiveKitMeetingRoom — in-app virtual classroom screen.
 * Renders a fully custom teacher or student meeting UI without redirecting
 * to any external app. Uses @livekit/react-native hooks.
 *
 * Teacher view: camera + mic + participant list + end button.
 * Student view: teacher video + mute mic + leave button.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import {
  LiveKitRoom,
  useParticipants,
  useLocalParticipant,
  VideoView,
  useVideoTracks,
  isTrackReference,
} from '@livekit/react-native';
import { Feather } from '@expo/vector-icons';

interface MeetingRoomProps {
  wsUrl: string;
  token: string;
  roomName: string;
  displayName: string;
  isHost: boolean;
  onLeave: () => void;
}

function ParticipantVideoTile({
  participant,
  isSelf,
}: {
  participant: any;
  isSelf: boolean;
}) {
  const tracks = useVideoTracks(participant);
  const videoTrack = tracks.find(isTrackReference);

  return (
    <View
      style={{
        width: isSelf ? 100 : '100%',
        aspectRatio: isSelf ? 9 / 16 : 16 / 9,
        backgroundColor: '#1a1a2e',
        borderRadius: isSelf ? 10 : 0,
        overflow: 'hidden',
        position: isSelf ? 'absolute' : 'relative',
        bottom: isSelf ? 90 : undefined,
        right: isSelf ? 12 : undefined,
        borderWidth: isSelf ? 2 : 0,
        borderColor: '#fff',
        zIndex: isSelf ? 10 : 1,
      }}
    >
      {videoTrack ? (
        <VideoView
          style={{ flex: 1 }}
          trackRef={videoTrack}
          objectFit="cover"
          mirror={isSelf}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
              {participant.name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={{ color: '#9ca3af', fontSize: 12 }}>{participant.name ?? 'Participant'}</Text>
        </View>
      )}
    </View>
  );
}

function MeetingControls({
  isMicEnabled,
  isCameraEnabled,
  isHost,
  onToggleMic,
  onToggleCamera,
  onLeave,
}: {
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isHost: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
      }}
    >
      {/* Mic toggle */}
      <TouchableOpacity
        onPress={onToggleMic}
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: isMicEnabled ? 'rgba(255,255,255,0.15)' : '#ef4444',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name={isMicEnabled ? 'mic' : 'mic-off'} size={22} color="#fff" />
      </TouchableOpacity>

      {/* Camera toggle (host only) */}
      {isHost && (
        <TouchableOpacity
          onPress={onToggleCamera}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: isCameraEnabled ? 'rgba(255,255,255,0.15)' : '#ef4444',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name={isCameraEnabled ? 'video' : 'video-off'} size={22} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Leave / End */}
      <TouchableOpacity
        onPress={() =>
          Alert.alert(
            isHost ? 'End Class?' : 'Leave Class?',
            isHost
              ? 'Students will be disconnected when you end the class.'
              : 'You can rejoin if needed.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: isHost ? 'End Class' : 'Leave', style: 'destructive', onPress: onLeave },
            ]
          )
        }
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: '#dc2626',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name="phone-off" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function InnerRoom({ isHost, onLeave }: { isHost: boolean; onLeave: () => void }) {
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();

  const handleToggleMic = useCallback(async () => {
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }, [localParticipant, isMicrophoneEnabled]);

  const handleToggleCamera = useCallback(async () => {
    await localParticipant.setCameraEnabled(!isCameraEnabled);
  }, [localParticipant, isCameraEnabled]);

  const remoteParticipants = participants.filter((p) => !p.isLocal);

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Remote participant (teacher video fills screen for students) */}
      {remoteParticipants.length > 0 ? (
        <ParticipantVideoTile participant={remoteParticipants[0]} isSelf={false} />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="video-off" size={40} color="#4b5563" />
          <Text style={{ color: '#6b7280', marginTop: 12, fontSize: 14 }}>
            {isHost ? 'Waiting for students to join...' : 'Waiting for teacher to start...'}
          </Text>
        </View>
      )}

      {/* Self preview (picture-in-picture) */}
      <ParticipantVideoTile participant={localParticipant} isSelf />

      {/* Participant count pill */}
      <View
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 6,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Feather name="users" size={14} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{participants.length}</Text>
      </View>

      {/* Controls bar */}
      <MeetingControls
        isMicEnabled={isMicrophoneEnabled}
        isCameraEnabled={isCameraEnabled}
        isHost={isHost}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onLeave={onLeave}
      />
    </View>
  );
}

export function LiveKitMeetingRoom({
  wsUrl,
  token,
  roomName,
  displayName,
  isHost,
  onLeave,
}: MeetingRoomProps) {
  const [connecting, setConnecting] = useState(true);

  return (
    <LiveKitRoom
      serverUrl={wsUrl}
      token={token}
      connect
      audio={true}
      video={isHost}
      onConnected={() => setConnecting(false)}
      onDisconnected={onLeave}
      onError={(err) => {
        Alert.alert('Connection Error', err.message ?? 'Could not connect to the class room.');
        onLeave();
      }}
    >
      {connecting ? (
        <View style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={{ color: '#9ca3af', fontSize: 14 }}>Connecting to class...</Text>
        </View>
      ) : (
        <InnerRoom isHost={isHost} onLeave={onLeave} />
      )}
    </LiveKitRoom>
  );
}
