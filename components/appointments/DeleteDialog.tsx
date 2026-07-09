import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface DeleteDialogProps {
  visible: boolean;
  onDelete: () => void;
  onClose: () => void;
}

export const DeleteDialog: React.FC<DeleteDialogProps> = ({ visible, onDelete, onClose }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
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

const getStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    dialog: {
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 400,
    },
    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: theme.colors.text },
    message: { color: theme.colors.textSecondary, marginBottom: 24 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end' },
    cancelBtn: { padding: 12, marginRight: 8 },
    cancelText: { color: theme.colors.textSecondary, fontWeight: '600' },
    deleteBtn: { backgroundColor: theme.colors.error, padding: 12, borderRadius: 8 },
    deleteText: { color: theme.colors.white, fontWeight: 'bold' },
  });
