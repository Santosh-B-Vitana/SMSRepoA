import { useRef, useEffect, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { Feather } from '@expo/vector-icons';

export function ConnectionBanner() {
  const [netState, setNetState] = useState<NetInfoState | null>(null);
  const translateY = useRef(new Animated.Value(-48)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetState(state);
      const isOffline = !state.isConnected || !state.isInternetReachable;
      Animated.spring(translateY, {
        toValue: isOffline ? 0 : -48,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
    });
    return unsubscribe;
  }, [translateY]);

  if (!netState) return null;

  const isOffline = !netState.isConnected || !netState.isInternetReachable;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        transform: [{ translateY }],
      }}
    >
      <View
        style={{
          backgroundColor: isOffline ? '#d97706' : '#16a34a',
          paddingHorizontal: 16,
          paddingVertical: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Feather name={isOffline ? 'wifi-off' : 'wifi'} size={14} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '500' }}>
          {isOffline ? 'Offline — changes saved locally' : 'Back online — syncing...'}
        </Text>
      </View>
    </Animated.View>
  );
}
