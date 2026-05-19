import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';

const clientReasons = [
  'Schedule conflict',
  'Changed my mind',
  'There is an emergency',
  'Found another provider',
  'Other',
];

const providerReasons = [
  'Schedule conflict',
  'Unforeseen Emergency',
  'Overbooking',
  'Stylist not available',
  'Other',
];

interface CancelDialogProps {
  visible: boolean;
  booking: any;
  userId: string;
  onCancel: (reason: string) => void;
  onClose: () => void;
}

export const CancelDialog: React.FC<CancelDialogProps> = ({
  visible,
  booking,
  userId,
  onCancel,
  onClose,
}) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const reasons = userId === booking.providerId ? providerReasons : clientReasons;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Cancel Appointment</Text>
          <Text style={styles.subtitle}>Please tell us why you are cancelling:</Text>
          <FlatList
            data={reasons}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.reasonItem}
                onPress={() => setSelectedReason(item)}
              >
                <View style={styles.radio}>
                  {selectedReason === item && <View style={styles.radioSelected} />}
                </View>
                <Text style={styles.reasonText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>No, Keep It</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, !selectedReason && styles.disabled]}
              onPress={() => selectedReason && onCancel(selectedReason)}
              disabled={!selectedReason}
            >
              <Text style={styles.confirmText}>Yes, Cancel</Text>
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
  subtitle: { color: 'gray', marginBottom: 16 },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8B5CF6',
  },
  reasonText: { fontSize: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  cancelBtn: { padding: 12, marginRight: 8 },
  cancelText: { color: 'gray', fontWeight: '600' },
  confirmBtn: { backgroundColor: 'red', padding: 12, borderRadius: 8 },
  disabled: { opacity: 0.5 },
  confirmText: { color: 'white', fontWeight: 'bold' },
});