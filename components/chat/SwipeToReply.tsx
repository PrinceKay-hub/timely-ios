import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Same constants as the Flutter _SwipeToReply
const TRIGGER_THRESHOLD = 60;
const MAX_DRAG = 80;

interface Props {
  children: React.ReactNode;
  onReply: () => void;
}

// Drag-and-snap-back gesture, same as the Flutter version — deliberately
// not swipeable-to-dismiss, just a reveal-and-release reply affordance
// like WhatsApp/Telegram.
export function SwipeToReply({ children, onReply }: Props) {
  const dragX = useSharedValue(0);
  const triggered = useSharedValue(false);

  const fireHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const fireReply = useCallback(() => {
    onReply();
  }, [onReply]);

  const pan = Gesture.Pan()
    // Only claim the gesture once there's clear rightward horizontal intent,
    // so vertical list scrolling and long-press still work normally.
    .activeOffsetX(15)
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      const next = Math.min(Math.max(e.translationX, 0), MAX_DRAG);
      dragX.value = next;
      if (next >= TRIGGER_THRESHOLD && !triggered.value) {
        triggered.value = true;
        runOnJS(fireHaptic)();
      } else if (next < TRIGGER_THRESHOLD && triggered.value) {
        triggered.value = false;
      }
    })
    .onEnd(() => {
      if (dragX.value >= TRIGGER_THRESHOLD) {
        runOnJS(fireReply)();
      }
      dragX.value = withSpring(0, { damping: 20, stiffness: 300 });
      triggered.value = false;
    });

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragX.value, [0, TRIGGER_THRESHOLD], [0, 1], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(dragX.value, [0, TRIGGER_THRESHOLD], [0.6, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.container}>
        <Animated.View style={[styles.replyIconWrap, iconStyle]} pointerEvents="none">
          <Ionicons name="arrow-undo" size={20} color="#9ca3af" />
        </Animated.View>
        <Animated.View style={contentStyle}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center' },
  replyIconWrap: { position: 'absolute', left: 8 },
});