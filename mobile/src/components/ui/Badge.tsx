import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { VITANA_COLORS, VITANA_BORDER_RADIUS, VITANA_FONT_SIZES } from '@/theme/tokens';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
  dot?: boolean;
}

const VARIANT_MAP: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  success: { bg: VITANA_COLORS.successLight, text: '#16a34a', border: '#bbf7d0' },
  warning: { bg: VITANA_COLORS.warningLight, text: '#b45309', border: '#fde68a' },
  error: { bg: VITANA_COLORS.errorLight, text: '#dc2626', border: '#fecaca' },
  info: { bg: VITANA_COLORS.infoLight, text: '#1d4ed8', border: '#bfdbfe' },
  neutral: { bg: '#f1f5f9', text: VITANA_COLORS.textSecondary, border: '#e2e8f0' },
  primary: { bg: '#dbeafe', text: VITANA_COLORS.primary, border: '#bfdbfe' },
};

export function Badge({ label, variant = 'neutral', size = 'md', style, dot = false }: BadgeProps) {
  const colors = VARIANT_MAP[variant];

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {dot && (
        <View style={[styles.dot, { backgroundColor: colors.text }]} />
      )}
      <Text
        style={[
          styles.label,
          size === 'sm' && styles.labelSm,
          { color: colors.text },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: VITANA_BORDER_RADIUS.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  label: {
    fontSize: VITANA_FONT_SIZES.xs,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 10,
  },
});
