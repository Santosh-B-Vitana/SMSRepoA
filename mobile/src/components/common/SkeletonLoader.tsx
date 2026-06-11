import { useRef, useEffect } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';

interface Props {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({ width = '100%', height = 16, borderRadius = 8, style }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: '#e2e8f0', opacity }, style]}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10 }}>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLoader key={i} height={14} width={i === 0 ? '70%' : i === lines - 1 ? '45%' : '90%'} />
      ))}
    </View>
  );
}
