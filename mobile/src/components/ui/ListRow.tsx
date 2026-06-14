import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VITANA_COLORS, VITANA_FONT_SIZES } from '@/theme/tokens';

interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Feather.glyphMap;
  iconColor?: string;
  iconBg?: string;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  badge?: number;
  destructive?: boolean;
  disabled?: boolean;
}

export function ListRow({
  title,
  subtitle,
  icon,
  iconColor = VITANA_COLORS.primary,
  iconBg,
  rightElement,
  showChevron = true,
  onPress,
  style,
  badge,
  destructive = false,
  disabled = false,
}: ListRowProps) {
  const effectiveIconColor = destructive ? VITANA_COLORS.error : iconColor;
  const effectiveIconBg = iconBg ?? `${effectiveIconColor}15`;
  const effectiveTitleColor = destructive ? VITANA_COLORS.error : VITANA_COLORS.text;

  const inner = (
    <View style={[styles.row, style, disabled && styles.disabled]}>
      {icon ? (
        <View style={[styles.iconContainer, { backgroundColor: effectiveIconBg }]}>
          <Feather name={icon} size={18} color={effectiveIconColor} />
        </View>
      ) : null}
      <View style={styles.content}>
        <Text style={[styles.title, { color: effectiveTitleColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>
      <View style={styles.right}>
        {badge !== undefined && badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : String(badge)}</Text>
          </View>
        ) : null}
        {rightElement ?? null}
        {showChevron && onPress ? (
          <Feather name="chevron-right" size={16} color={VITANA_COLORS.textSecondary} style={styles.chevron} />
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} disabled={disabled}>
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: VITANA_COLORS.background,
    minHeight: 56,
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: VITANA_FONT_SIZES.base,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: VITANA_COLORS.text,
  },
  subtitle: {
    fontSize: VITANA_FONT_SIZES.sm,
    fontFamily: 'Inter',
    color: VITANA_COLORS.textSecondary,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    backgroundColor: VITANA_COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  chevron: {
    marginLeft: 4,
  },
});
