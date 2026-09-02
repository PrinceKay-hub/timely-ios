import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  isMine: boolean;
  onClose: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  colors: any;
}

export function MessageActionsSheet({
  visible,
  isMine,
  onClose,
  onDeleteForMe,
  onDeleteForEveryone,
  colors,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.background || '#fff' }]}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              onClose();
              onDeleteForMe();
            }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.text} />
            <Text style={[styles.rowText, { color: colors.text }]}>Delete for me</Text>
          </TouchableOpacity>

          {isMine && (
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                onClose();
                onDeleteForEveryone();
              }}
            >
              <Ionicons name="trash" size={20} color="#ef4444" />
              <Text style={[styles.rowText, { color: '#ef4444' }]}>Delete for everyone</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    margin: 12,
    borderRadius: 16,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  rowText: {
    fontSize: 15,
    fontWeight: '500',
  },
});