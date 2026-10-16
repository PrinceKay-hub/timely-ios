import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Check badge overlaid on the bottom-right of a selected row's avatar/icon. */
export const SelectBadge = ({ color, ring = '#fff' }: { color: string; ring?: string }) => (
  <View style={[styles.badge, { backgroundColor: color, borderColor: ring }]}>
    <Ionicons name="checkmark" size={12} color="#fff" />
  </View>
);

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});