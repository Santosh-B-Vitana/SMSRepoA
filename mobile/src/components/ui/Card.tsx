import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { VITANA_COLORS, VITANA_BORDER_RADIUS, VITANA_SHADOWS } from '@/theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'card';
  padding?: number;
  onPress?: () => void;
  borderRadius?: number;
}

export function Card({
  children,
  style,
  shadow = 'sm',
  padding = 16,
  onPress,
  borderRadius = VITANA_BORDER_RADIUS.lg,
}: CardProps) {
  const shadowStyle = shadow !== 'none' ? VITANA_SHADOWS[shadow] : {};

  const content = (
    <View
      style={[
        styles.card,
        shadowStyle,
        { padding, borderRadius },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: VITANA_COLORS.background,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    overflow: 'hidden',
  },
});
