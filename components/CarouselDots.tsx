// components/CarouselDots.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';

interface CarouselDotsProps {
  progress: SharedValue<number>;
  length: number;
}

const Dot: React.FC<{ progress: SharedValue<number>; index: number }> = ({
  progress,
  index,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      progress.value,
      [index - 1, index, index + 1],
      [1, 1.4, 1],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      progress.value,
      [index - 1, index, index + 1],
      [0.4, 1, 0.4],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }], opacity };
  });
  return <View style={{ width: 7, height: 7, borderRadius: 100, backgroundColor: '#8B5CF6' }} />;
  //return <Animated.View style={[styles.dot, animatedStyle]} />;
};

export const CarouselDots: React.FC<CarouselDotsProps> = ({ progress, length }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, i) => (
        <Dot key={i} progress={progress} index={i} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 100,
    backgroundColor: '#333333',
  },
});