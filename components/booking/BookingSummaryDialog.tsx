import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { useTheme } from '@/providers/ThemeProvider';

interface Props {
  visible: boolean;
  onClose: () => void;
  serviceName: string;
  date: Date;
  timeString: string;
  totalPrice: string;
  onConfirm: () => void;
}

export const BookingSummaryDialog = ({
  visible,
  onClose,
  serviceName,
  date,
  timeString,
  totalPrice,
  onConfirm,
}: Props) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.card || colors.background }]}>
          
          <View style={styles.row}>
            <Text style={[styles.title, { color: colors.text }]}>Booking Summary</Text>
            <TouchableOpacity
            onPress={onClose}
          >
           <Text style={[styles.value, { color: colors.error }]}>Cancel</Text>
          </TouchableOpacity>
            
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border || '#eee' }]} />

          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Service:</Text>
            <Text style={[styles.value, { color: colors.text }]}>{serviceName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Date:</Text>
            <Text style={[styles.value, { color: colors.text }]}>{format(date, 'MMMM d, yyyy')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Time:</Text>
            <Text style={[styles.value, { color: colors.text }]}>{timeString}</Text>
          </View>

          <View style={[styles.totalRow, { borderTopColor: colors.border || '#eee' }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total Amount</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>₵{totalPrice}</Text>
          </View>
          

          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: colors.primary }]}
            onPress={onConfirm}
          >
            <Text style={styles.confirmText}>Confirm Booking</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    content: {
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 400,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
      textAlign: 'center',
    },
    divider: {
      height: 1,
      marginBottom: 16,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    label: {
      // color now dynamic
    },
    value: {
      fontWeight: '500',
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      marginBottom: 24,
      paddingTop: 16,
      borderTopWidth: 1,
    },
    totalLabel: {
      fontSize: 16,
    },
    totalAmount: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    confirmButton: {
      borderRadius: 30,
      paddingVertical: 16,
      alignItems: 'center',
    },
    confirmText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });