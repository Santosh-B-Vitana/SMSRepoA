import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { VITANA_COLORS, VITANA_SHADOWS } from '@/theme/tokens';

interface SubScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
}

export function SubScreenHeader({ title, subtitle, onBack, rightSlot }: SubScreenHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleBack}
        style={styles.backBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="arrow-left" size={22} color={VITANA_COLORS.text} />
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={styles.right}>
        {rightSlot ?? null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: VITANA_COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
    ...VITANA_SHADOWS.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: VITANA_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: VITANA_COLORS.text,
    fontFamily: 'Poppins',
  },
  subtitle: {
    fontSize: 12,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    marginTop: 1,
  },
  right: {
    marginLeft: 8,
  },
});
