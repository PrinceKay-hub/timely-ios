import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

const PURPLE = '#8B5CF6';

interface AppointmentCardProps {
  booking: any;
  user: any;
  onCancel?: () => void;
  onConfirm?: () => void;
  onReschedule?: () => void;
  onDirections?: () => void;
  onRebook?: () => void;
  onDelete?: () => void;
  onWriteReview?: () => void;
  onBookAgain?: () => void;
}

// Helper functions inside component file
const formatDate = (date: any): string => {
  if (!date) return '';
  // Firestore Timestamp
  if (date && typeof date.toDate === 'function') {
    return format(date.toDate(), 'MMMM d, yyyy');
  }
  // Date object or string
  const d = new Date(date);
  if (!isNaN(d.getTime())) {
    return format(d, 'MMMM d, yyyy');
  }
  return '';
};

const formatShortDate = (date: any): string => {
  if (!date) return '';
  if (date && typeof date.toDate === 'function') {
    return format(date.toDate(), 'MMM d, yyyy');
  }
  const d = new Date(date);
  if (!isNaN(d.getTime())) {
    return format(d, 'MMM d, yyyy');
  }
  return '';
};

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  booking,
  user,
  onCancel,
  onConfirm,
  onReschedule,
  onDirections,
  onRebook,
  onDelete,
  onWriteReview,
  onBookAgain,
}) => {
  const isProvider = user?.uid === booking.providerId;
  const statusInfo = getStatusInfo(booking.status);
  const bookingId = booking.id.substring(0, 6).toUpperCase();
  const formattedDate = formatDate(booking.appointmentDate);
  const createdAtFormatted = formatShortDate(booking.createdAt);
  const formattedTime = booking.timeSlot?.displayTime || '';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.salonInfo}>
          <Text style={styles.salonName}>{booking.serviceName}</Text>
          {isProvider && (
            <View style={styles.bookedBy}>
              <Ionicons name="person-outline" size={14} color="gray" />
              <Text style={styles.bookedByText}>Booked by {booking.userName}</Text>
            </View>
          )}
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
              <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.text}
              </Text>
            </View>
            <View style={styles.ids}>
              <Text style={styles.idText}>ID: {bookingId}</Text>
              <Text style={styles.idText}>Created: {createdAtFormatted}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.serviceRow}>
          <Ionicons name="cut-outline" size={18} color={PURPLE} />
          <Text style={styles.serviceNameDetail}>{booking.serviceOption?.title}</Text>
          <Text style={styles.servicePrice}>₵{booking.serviceOption?.price}</Text>
        </View>
        <View style={styles.datetimeRow}>
          <View style={styles.datetimeItem}>
            <Ionicons name="calendar-outline" size={16} color="gray" />
            <Text style={styles.datetimeText}>{formattedDate}</Text>
          </View>
          <View style={styles.datetimeItem}>
            <Ionicons name="time-outline" size={16} color="gray" />
            <Text style={styles.datetimeText}>{formattedTime}</Text>
          </View>
        </View>
      </View>

      {/* Cancellation Reason */}
      {booking.cancelReason && (
        <View style={styles.cancelReason}>
          <Ionicons name="information-circle-outline" size={18} color="red" />
          <Text style={styles.cancelReasonText}>{booking.cancelReason}</Text>
        </View>
      )}

      {/* Rating */}
      {booking.rating && (
        <View style={styles.rating}>
          <Text style={styles.ratingLabel}>Your rating: </Text>
          {[1,2,3,4,5].map(i => (
            <Ionicons
              key={i}
              name={i <= booking.rating ? 'star' : 'star-outline'}
              size={16}
              color="gold"
            />
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {booking.status === 'pending' && (
          <>
            <ActionButton title="Cancel" onPress={onCancel} color="red" />
            <Divider />
            {isProvider ? (
              <ActionButton title="Confirm" onPress={onConfirm} color={PURPLE} />
            ) : (
              <ActionButton title="Reschedule" onPress={onReschedule} color={PURPLE} />
            )}
          </>
        )}

        {booking.status === 'confirmed' && (
          <>
            <ActionButton title="Cancel" onPress={onCancel} color="red" />
            <Divider />
            {!isProvider && (
              <ActionButton title="Directions" onPress={onDirections} color={PURPLE} />
            )}
          </>
        )}

        {booking.status === 'cancelled' && (
          <>
            {!isProvider && (
              <ActionButton title="Rebook" onPress={onRebook} color={PURPLE} />
            )}
            <Divider />
            <ActionButton title="Delete" onPress={onDelete} color="gray" />
          </>
        )}

        {booking.status === 'completed' && (
          <>
            {!isProvider && (
              <ActionButton title="Write Review" onPress={onWriteReview} color={PURPLE} />
            )}
            <Divider />
            {!isProvider && (
              <ActionButton title="Book Again" onPress={onBookAgain} color={PURPLE} />
            )}
          </>
        )}
      </View>
    </View>
  );
};

// Define props for ActionButton
interface ActionButtonProps {
  title: string;
  onPress?: () => void;
  color: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ title, onPress, color }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <Text style={[styles.actionText, { color }]}>{title}</Text>
  </TouchableOpacity>
);

const Divider: React.FC = () => <View style={styles.divider} />;

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'pending':
      return { color: '#ff9800', bgColor: '#fff3e0', text: 'Pending', icon: 'time-outline' };
    case 'confirmed':
      return { color: '#4caf50', bgColor: '#e8f5e8', text: 'Confirmed', icon: 'checkmark-circle-outline' };
    case 'cancelled':
      return { color: '#f44336', bgColor: '#ffebee', text: 'Cancelled', icon: 'close-circle-outline' };
    case 'completed':
      return { color: '#2196f3', bgColor: '#e3f2fd', text: 'Completed', icon: 'checkmark-done-outline' };
    default:
      return { color: '#9e9e9e', bgColor: '#f5f5f5', text: 'Unknown', icon: 'help-outline' };
  }
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  header: { padding: 16 },
  salonInfo: { marginBottom: 8 },
  salonName: { fontSize: 16, fontWeight: 'bold' },
  bookedBy: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  bookedByText: { color: 'gray', fontSize: 13, marginLeft: 4 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  ids: { alignItems: 'flex-end' },
  idText: { color: 'gray', fontSize: 12 },
  details: { backgroundColor: '#f9f9f9', padding: 12, marginHorizontal: 16, marginBottom: 16, borderRadius: 12 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  serviceNameDetail: { flex: 1, marginLeft: 8, fontWeight: '600' },
  servicePrice: { fontWeight: 'bold', color: PURPLE },
  datetimeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  datetimeItem: { flexDirection: 'row', alignItems: 'center' },
  datetimeText: { marginLeft: 4, color: 'gray', fontSize: 13 },
  cancelReason: {
    flexDirection: 'row',
    backgroundColor: '#ffebee',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  cancelReasonText: { color: 'red', flex: 1, marginLeft: 8, fontSize: 13 },
  rating: {
    flexDirection: 'row',
    backgroundColor: '#fff8e1',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingLabel: { marginRight: 4 },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  actionText: { fontWeight: 'bold' },
  divider: { width: 1, height: 40, backgroundColor: '#f0f0f0', alignSelf: 'center' },
});