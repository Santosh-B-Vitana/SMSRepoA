import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { VITANA_COLORS, VITANA_FONT_SIZES } from '@/theme/tokens';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
  primaryColor?: string;
  style?: ViewStyle;
  variant?: 'gradient' | 'solid' | 'transparent';
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightSlot,
  primaryColor = VITANA_COLORS.primary,
  style,
  variant = 'gradient',
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const content = (
    <View
      style={[
        styles.inner,
        { paddingTop: insets.top + 12 },
      ]}
    >
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="arrow-left" size={22} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>

        <View style={styles.rightSlot}>
          {rightSlot ?? null}
        </View>
      </View>
    </View>
  );

  if (variant === 'transparent') {
    return (
      <View style={[styles.transparentContainer, { paddingTop: insets.top }, style]}>
        {content}
      </View>
    );
  }

  if (variant === 'solid') {
    return (
      <View style={[{ backgroundColor: primaryColor }, style]}>
        {content}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[primaryColor, darkenHex(primaryColor, 0.2)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={style}
    >
      {content}
    </LinearGradient>
  );
}

function darkenHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgb(${Math.round(r * (1 - amount))}, ${Math.round(g * (1 - amount))}, ${Math.round(b * (1 - amount))})`;
}

const styles = StyleSheet.create({
  inner: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  transparentContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 36,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: VITANA_FONT_SIZES.lg,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: VITANA_FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter',
    marginTop: 1,
    textAlign: 'center',
  },
  rightSlot: {
    width: 36,
    alignItems: 'flex-end',
  },
});
