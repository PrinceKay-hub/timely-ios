import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function DeletedBubble({ isMine, colors }: { isMine: boolean; colors: any }) {
  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, { backgroundColor: colors.surface || '#f3f4f6' }]}>
        <Ionicons name="ban-outline" size={13} color="#9ca3af" />
        <Text style={styles.text}>This message was deleted</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: 4, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: { fontSize: 13, fontStyle: 'italic', color: '#9ca3af' },
});