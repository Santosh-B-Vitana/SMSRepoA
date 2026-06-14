import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { VITANA_COLORS, VITANA_BORDER_RADIUS, VITANA_FONT_SIZES } from '@/theme/tokens';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: keyof typeof Feather.glyphMap;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  primaryColor?: string;
}

export function Input({
  label,
  error,
  hint,
  icon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  primaryColor = VITANA_COLORS.primary,
  ...textInputProps
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const borderAnim = useSharedValue(0);

  const animatedBorder = useAnimatedStyle(() => ({
    borderColor: withTiming(
      error
        ? VITANA_COLORS.error
        : borderAnim.value === 1
          ? primaryColor
          : VITANA_COLORS.border,
      { duration: 180 },
    ),
  }));

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
      setIsFocused(true);
      borderAnim.value = 1;
      textInputProps.onFocus?.(e);
    },
    [borderAnim, textInputProps],
  );

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
      setIsFocused(false);
      borderAnim.value = 0;
      textInputProps.onBlur?.(e);
    },
    [borderAnim, textInputProps],
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Animated.View
        style={[
          styles.inputWrapper,
          animatedBorder,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      >
        {icon ? (
          <Feather
            name={icon}
            size={18}
            color={isFocused ? primaryColor : VITANA_COLORS.textSecondary}
            style={styles.leftIcon}
          />
        ) : null}
        <TextInput
          ref={inputRef}
          {...textInputProps}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={VITANA_COLORS.textSecondary}
          style={[
            styles.input,
            icon ? styles.inputWithLeftIcon : null,
            rightIcon ? styles.inputWithRightIcon : null,
          ]}
        />
        {rightIcon ? (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather
              name={rightIcon}
              size={18}
              color={VITANA_COLORS.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </Animated.View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  label: {
    fontSize: VITANA_FONT_SIZES.sm,
    fontWeight: '500',
    color: VITANA_COLORS.text,
    fontFamily: 'Inter',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: VITANA_COLORS.border,
    borderRadius: VITANA_BORDER_RADIUS.lg,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  inputFocused: {
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: VITANA_COLORS.error,
    backgroundColor: '#fff5f5',
  },
  input: {
    flex: 1,
    fontSize: VITANA_FONT_SIZES.base,
    color: VITANA_COLORS.text,
    fontFamily: 'Inter',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  inputWithLeftIcon: {
    paddingLeft: 4,
  },
  inputWithRightIcon: {
    paddingRight: 4,
  },
  leftIcon: {
    marginLeft: 14,
  },
  rightIconBtn: {
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  errorText: {
    fontSize: VITANA_FONT_SIZES.xs,
    color: VITANA_COLORS.error,
    fontFamily: 'Inter',
    marginTop: 5,
    marginLeft: 2,
  },
  hintText: {
    fontSize: VITANA_FONT_SIZES.xs,
    color: VITANA_COLORS.textSecondary,
    fontFamily: 'Inter',
    marginTop: 5,
    marginLeft: 2,
  },
});
