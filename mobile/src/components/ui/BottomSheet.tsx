import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ViewStyle,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VITANA_COLORS, VITANA_BORDER_RADIUS, VITANA_SHADOWS } from '@/theme/tokens';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  snapPoint?: number;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  contentStyle,
  snapPoint = SCREEN_HEIGHT * 0.5,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(snapPoint);
  const opacity = useSharedValue(0);

  const open = useCallback(() => {
    opacity.value = withTiming(1, { duration: 200 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
  }, [opacity, translateY]);

  const close = useCallback(() => {
    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withSpring(snapPoint, { damping: 20, stiffness: 200 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  }, [opacity, translateY, snapPoint, onClose]);

  useEffect(() => {
    if (visible) {
      open();
    } else {
      translateY.value = snapPoint;
      opacity.value = 0;
    }
  }, [visible, open, translateY, opacity, snapPoint]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={close} animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        <Animated.View style={[styles.sheet, sheetStyle, VITANA_SHADOWS.lg]}>
          <View style={styles.handle} />
          {title ? (
            <View style={styles.titleRow}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={[styles.content, { paddingBottom: insets.bottom + 16 }, contentStyle]}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: VITANA_COLORS.background,
    borderTopLeftRadius: VITANA_BORDER_RADIUS.xl,
    borderTopRightRadius: VITANA_BORDER_RADIUS.xl,
    maxHeight: SCREEN_HEIGHT * 0.92,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: VITANA_COLORS.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: VITANA_COLORS.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: VITANA_COLORS.text,
    fontFamily: 'Poppins',
  },
  closeText: {
    fontSize: 16,
    color: VITANA_COLORS.textSecondary,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
