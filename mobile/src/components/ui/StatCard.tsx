import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VITANA_COLORS, VITANA_BORDER_RADIUS, VITANA_SHADOWS, VITANA_FONT_SIZES } from '@/theme/tokens';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; isPositive: boolean };
  style?: ViewStyle;
  onPress?: () => void;
}

export function StatCard({
  label,
  value,
  icon,
  iconColor,
  iconBg,
  trend,
  style,
}: StatCardProps) {
  const tintColor = iconColor ?? VITANA_COLORS.primary;
  const bgColor = iconBg ?? `${tintColor}18`;

  return (
    <View style={[styles.card, VITANA_SHADOWS.md, style]}>
      <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
        <Feather name={icon} size={20} color={tintColor} />
      </View>
      <Text style={styles.value} numberOfLines={1}>{String(value)}</Text>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
      {trend ? (
        <View style={styles.trendRow}>
          <Feather
            name={trend.isPositive ? 'trending-up' : 'trending-down'}
            size={11}
            color={trend.isPositive ? VITANA_COLORS.success : VITANA_COLORS.error}
          />
          <Text
            style={[
              styles.trendText,
              { color: trend.isPositive ? VITANA_COLORS.success : VITANA_COLORS.error },
            ]}
          >
            {trend.value}%
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: VITANA_COLORS.background,
    borderRadius: VITANA_BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    padding: 16,
    minWidth: 130,
    maxWidth: 160,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: VITANA_BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: VITANA_FONT_SIZES['2xl'],
    fontWeight: '700',
    color: VITANA_COLORS.text,
    fontFamily: 'Poppins',
    lineHeight: 28,
  },
  label: {
    fontSize: VITANA_FONT_SIZES.xs,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    marginTop: 3,
    lineHeight: 15,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  trendText: {
    fontSize: VITANA_FONT_SIZES.xs,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
});
