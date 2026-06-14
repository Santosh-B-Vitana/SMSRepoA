import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VITANA_COLORS, VITANA_BORDER_RADIUS, VITANA_SHADOWS, VITANA_FONT_SIZES } from '@/theme/tokens';

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  onViewAll?: () => void;
  viewAllLabel?: string;
  icon?: keyof typeof Feather.glyphMap;
  iconColor?: string;
  style?: ViewStyle;
  padding?: number;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  children,
  onViewAll,
  viewAllLabel = 'View All',
  icon,
  iconColor = VITANA_COLORS.primary,
  style,
  padding = 16,
  noPadding = false,
}: SectionCardProps) {
  return (
    <View style={[styles.card, VITANA_SHADOWS.sm, style]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {icon ? (
            <View style={[styles.iconBadge, { backgroundColor: `${iconColor}15` }]}>
              <Feather name={icon} size={14} color={iconColor} />
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        {onViewAll ? (
          <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.viewAll, { color: iconColor }]}>{viewAllLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={[styles.divider]} />
      <View style={noPadding ? {} : { padding }}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: VITANA_COLORS.background,
    borderRadius: VITANA_BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: VITANA_COLORS.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: VITANA_FONT_SIZES.base,
    fontWeight: '600',
    color: VITANA_COLORS.text,
    fontFamily: 'Poppins',
  },
  viewAll: {
    fontSize: VITANA_FONT_SIZES.sm,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: VITANA_COLORS.border,
  },
});
