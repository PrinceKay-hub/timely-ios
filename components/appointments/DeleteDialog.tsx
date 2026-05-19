import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface DeleteDialogProps {
  visible: boolean;
  onDelete: () => void;
  onClose: () => void;
}

export const DeleteDialog: React.FC<DeleteDialogProps> = ({ visible, onDelete, onClose }) => {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Delete Appointment</Text>
          <Text style={styles.message}>Are you sure you want to delete this appointment?</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>No, Keep It</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
              <Text style={styles.deleteText}>Yes, Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  message: { color: 'gray', marginBottom: 24 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelBtn: { padding: 12, marginRight: 8 },
  cancelText: { color: 'gray', fontWeight: '600' },
  deleteBtn: { backgroundColor: 'red', padding: 12, borderRadius: 8 },
  deleteText: { color: 'white', fontWeight: 'bold' },
});