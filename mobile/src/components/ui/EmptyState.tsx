import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VITANA_COLORS, VITANA_FONT_SIZES } from '@/theme/tokens';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  iconColor?: string;
  style?: ViewStyle;
}

export function EmptyState({
  icon = 'inbox',
  title,
  subtitle,
  action,
  iconColor = VITANA_COLORS.textSecondary,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}12` }]}>
        <Feather name={icon} size={36} color={iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant="secondary"
          size="sm"
          fullWidth={false}
          style={styles.actionBtn}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: VITANA_FONT_SIZES.lg,
    fontWeight: '600',
    color: VITANA_COLORS.text,
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: VITANA_FONT_SIZES.sm,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionBtn: {
    marginTop: 20,
  },
});
