import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReviewStore } from '@/stores/reviewService';

const PURPLE = '#8B5CF6';

interface ReviewDialogProps {
  visible: boolean;
  booking: any;
  userId: string;
  userName: string;
  onClose: () => void;
}

export const ReviewDialog: React.FC<ReviewDialogProps> = ({
  visible,
  booking,
  userId,
  userName,
  onClose,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const { createReview, isLoading, error, } = useReviewStore();

  const handleSubmit = async () => {
    if (rating === 0) return;
    await createReview({
      providerId: booking.providerId,
      userId,
      userName: booking.userName,
      rating,
      comment,
      serviceId: booking.serviceId,
    });
    if (!error) {
      onClose();
      setRating(0);
      setComment('');
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.dialog}>
              <Text style={styles.title}>Rate Your Experience</Text>
              <Text style={styles.subtitle}>How was your experience with the provider?</Text>

              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TouchableOpacity key={i} onPress={() => setRating(i)}>
                    <Ionicons
                      name={i <= rating ? 'star' : 'star-outline'}
                      size={36}
                      color="gold"
                      style={styles.star}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Share your experience (optional)"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, rating === 0 && styles.disabled]}
                  onPress={handleSubmit}
                  disabled={rating === 0 || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.submitText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: 'gray', marginBottom: 16, textAlign: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  star: { marginHorizontal: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    marginBottom: 16,
  },
  error: { color: 'red', marginBottom: 12, textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelBtn: { padding: 12, marginRight: 8 },
  cancelText: { color: 'gray', fontWeight: '600' },
  submitBtn: { backgroundColor: PURPLE, padding: 12, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  submitText: { color: 'white', fontWeight: 'bold' },
});