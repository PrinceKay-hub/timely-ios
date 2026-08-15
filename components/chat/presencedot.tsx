import React from 'react';
import { View, StyleSheet } from 'react-native';

interface PresenceDotProps {
  online: boolean;
  size?: number;
  ringColor?: string; // should match whatever background the dot sits on top of
}

// Small green dot for "online now", meant to sit on the bottom-right
// corner of an avatar. The ring (border) color should match the
// surrounding background so the dot looks cut out of it rather than
// just stacked on top.
export function PresenceDot({ online, size = 14, ringColor = '#fff' }: PresenceDotProps) {
  if (!online) return null;

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: Math.max(2, size * 0.15),
          borderColor: ringColor,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#22c55e',
  },
});