import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { VITANA_COLORS, VITANA_BORDER_RADIUS, VITANA_FONT_SIZES } from '@/theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  primaryColor?: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; border: string; text: string }> = {
  primary: {
    bg: VITANA_COLORS.primary,
    border: VITANA_COLORS.primary,
    text: '#ffffff',
  },
  secondary: {
    bg: VITANA_COLORS.surface,
    border: VITANA_COLORS.border,
    text: VITANA_COLORS.text,
  },
  ghost: {
    bg: 'transparent',
    border: 'transparent',
    text: VITANA_COLORS.primary,
  },
  danger: {
    bg: VITANA_COLORS.error,
    border: VITANA_COLORS.error,
    text: '#ffffff',
  },
  success: {
    bg: VITANA_COLORS.success,
    border: VITANA_COLORS.success,
    text: '#ffffff',
  },
};

const SIZE_STYLES: Record<ButtonSize, { paddingV: number; paddingH: number; fontSize: number; iconSize: number }> = {
  sm: { paddingV: 8, paddingH: 16, fontSize: VITANA_FONT_SIZES.sm, iconSize: 14 },
  md: { paddingV: 14, paddingH: 20, fontSize: VITANA_FONT_SIZES.base, iconSize: 16 },
  lg: { paddingV: 16, paddingH: 24, fontSize: VITANA_FONT_SIZES.lg, iconSize: 18 },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  style,
  textStyle,
  primaryColor,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const colors = VARIANT_STYLES[variant];
  const sizes = SIZE_STYLES[size];
  const effectiveBg = variant === 'primary' && primaryColor ? primaryColor : colors.bg;

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        animatedStyle,
        styles.base,
        {
          backgroundColor: effectiveBg,
          borderColor: variant === 'primary' && primaryColor ? primaryColor : colors.border,
          paddingVertical: sizes.paddingV,
          paddingHorizontal: sizes.paddingH,
          opacity: disabled && !loading ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text
            style={[
              styles.label,
              { color: colors.text, fontSize: sizes.fontSize },
              textStyle,
            ]}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: VITANA_BORDER_RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Inter',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
