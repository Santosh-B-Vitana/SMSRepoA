import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { VITANA_COLORS } from '@/theme/tokens';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name?: string;
  uri?: string | null;
  size?: AvatarSize;
  style?: ViewStyle;
  backgroundColor?: string;
}

const SIZE_MAP: Record<AvatarSize, { container: number; font: number }> = {
  xs: { container: 28, font: 11 },
  sm: { container: 36, font: 14 },
  md: { container: 44, font: 17 },
  lg: { container: 56, font: 20 },
  xl: { container: 72, font: 26 },
};

function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function getColorFromName(name?: string): string {
  const colors = [
    '#1a6fd8', '#7c3aed', '#db2777', '#059669',
    '#d97706', '#dc2626', '#0891b2', '#4f46e5',
  ];
  if (!name) return colors[0]!;
  const index = name.charCodeAt(0) % colors.length;
  return colors[index]!;
}

export function Avatar({ name, uri, size = 'md', style, backgroundColor }: AvatarProps) {
  const { container, font } = SIZE_MAP[size];
  const initials = getInitials(name);
  const bgColor = backgroundColor ?? getColorFromName(name);

  return (
    <View
      style={[
        styles.container,
        { width: container, height: container, borderRadius: container / 2, backgroundColor: bgColor },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: container, height: container, borderRadius: container / 2 }}
          contentFit="cover"
          accessibilityLabel={`${name ?? 'User'} avatar`}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: font }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: '#ffffff',
    fontFamily: 'Inter',
    fontWeight: '700',
  },
});
