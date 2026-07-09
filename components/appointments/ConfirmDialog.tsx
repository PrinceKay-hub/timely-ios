import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface ConfirmDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ visible, onConfirm, onClose }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Confirm Appointment</Text>
          <Text style={styles.message}>Would you like to confirm this appointment?</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>Confirm</Text>
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
    confirmBtn: { backgroundColor: theme.colors.primary, padding: 12, borderRadius: 8 },
    confirmText: { color: theme.colors.white, fontWeight: 'bold' },
  });
