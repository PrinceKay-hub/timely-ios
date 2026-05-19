import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatBadgeProps {
  count: number;
  label: string;
}

export const StatBadge: React.FC<StatBadgeProps> = ({ count, label }) => {
  return (
    <View style={styles.badge}>
      <Text style={styles.count}>{count}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    width: 100,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    alignItems: 'center',
  },
  count: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
  },
});