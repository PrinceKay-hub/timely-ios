import React from 'react';
import { StyleSheet, View } from 'react-native';

interface CarouselDotsProps {
  activeIndex: number;
  length: number;
}

export const CarouselDots: React.FC<CarouselDotsProps> = ({ activeIndex, length }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i === activeIndex && styles.activeDot]}
        />
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
    height: 12,
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 100,
    backgroundColor: '#D9D9D9',
    opacity: 0.5,
  },
  activeDot: {
    backgroundColor: '#8B5CF6',
    opacity: 1,
    transform: [{ scale: 1.3 }],
  },
});