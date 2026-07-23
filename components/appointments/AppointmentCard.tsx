import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '@/providers/ThemeProvider';

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
  onCallClient?: () => void;
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
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const statusInfoMap = useMemo(() => getStatusInfoMap(theme), [theme]);

  const isProvider = user?.uid === booking.providerId;
  const statusInfo = statusInfoMap[booking.status] ?? statusInfoMap.default;
  const bookingId = booking.id.substring(0, 6).toUpperCase();
  const formattedDate = formatDate(booking.appointmentDate);
  const createdAtFormatted = formatShortDate(booking.createdAt);
  const formattedTime = booking.timeSlot?.displayTime || '';

  const handleCall = async () => {
      if (!booking.phone) {
        Alert.alert('Error', 'Phone number not available');
        return;
      }
      const url = `tel:${booking.phone}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot make a call');
      }
    };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.salonInfo}>
          <Text style={styles.salonName}>{booking.serviceName}</Text>
          {isProvider && (
            <View style={styles.bookedBy}>
              <Ionicons name="person-outline" size={14} color={theme.colors.textSecondary} />
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
          <Ionicons name="cut-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.serviceNameDetail}>{booking.serviceOption?.title}</Text>
          <Text style={styles.servicePrice}>₵{booking.serviceOption?.price}</Text>
        </View>
        <View style={styles.datetimeRow}>
          <View style={styles.datetimeItem}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.datetimeText}>{formattedDate}</Text>
          </View>
          <View style={styles.datetimeItem}>
            <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.datetimeText}>{formattedTime}</Text>
          </View>
        </View>
      </View>

      {/* Cancellation Reason */}
      {booking.cancelReason && (
        <View style={styles.cancelReason}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.error} />
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
              color={theme.colors.warning}
            />
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {booking.status === 'pending' && (
          <>
            <ActionButton title="Cancel" onPress={onCancel} color={theme.colors.error} />
            <Divider />
            {isProvider ? (
              <ActionButton title="Confirm" onPress={onConfirm} color={theme.colors.primary} />
            ) : (
              <ActionButton title="Reschedule" onPress={onReschedule} color={theme.colors.primary} />
            )}
            {isProvider && (
              <ActionButton title="Call Client" onPress={handleCall} color='#00f608' />
            )}
          </>
        )}

        {booking.status === 'confirmed' && (
          <>
            <ActionButton title="Cancel" onPress={onCancel} color={theme.colors.error} />
            <Divider />
            {!isProvider && (
              <ActionButton title="Directions" onPress={onDirections} color={theme.colors.primary} />
            )}
            {isProvider && (
              <ActionButton title="Call Client" onPress={handleCall} color='#00f608' />
            )}
          </>
        )}

        {booking.status === 'cancelled' && (
          <>
            {!isProvider && (
              <ActionButton title="Rebook" onPress={onRebook} color={theme.colors.primary} />
            )}
            <Divider />
            <ActionButton title="Delete" onPress={onDelete} color={theme.colors.textSecondary} />
          </>
        )}

        {booking.status === 'completed' && (
          <>
            {!isProvider && (
              <ActionButton title="Write Review" onPress={onWriteReview} color={theme.colors.primary} />
            )}
            <Divider />
            {!isProvider && (
              <ActionButton title="Book Again" onPress={onBookAgain} color={theme.colors.primary} />
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

const ActionButton: React.FC<ActionButtonProps> = ({ title, onPress, color }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <Text style={[styles.actionText, { color }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const Divider: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return <View style={styles.divider} />;
};

// Status colors are semantic (pending/confirmed/etc.) and pull their hue from
// the theme's status colors, with a tinted background derived from the same
// hue so they hold up in both light and dark mode.
const getStatusInfoMap = (theme: any) => ({
  pending: { color: theme.colors.warning, bgColor: `${theme.colors.warning}26`, text: 'Pending', icon: 'time-outline' },
  confirmed: { color: theme.colors.success, bgColor: `${theme.colors.success}26`, text: 'Confirmed', icon: 'checkmark-circle-outline' },
  cancelled: { color: theme.colors.error, bgColor: `${theme.colors.error}26`, text: 'Cancelled', icon: 'close-circle-outline' },
  completed: { color: theme.colors.secondary, bgColor: `${theme.colors.secondary}26`, text: 'Completed', icon: 'checkmark-done-outline' },
  default: { color: theme.colors.textSecondary, bgColor: theme.colors.gray100, text: 'Unknown', icon: 'help-outline' },
});

const getStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 15,
      marginBottom: 16,
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      overflow: 'hidden',
    },
    header: { padding: 16 },
    salonInfo: { marginBottom: 8 },
    salonName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
    bookedBy: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    bookedByText: { color: theme.colors.textSecondary, fontSize: 13, marginLeft: 4 },
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
    idText: { color: theme.colors.textSecondary, fontSize: 12 },
    details: { backgroundColor: theme.colors.surface, padding: 12, marginHorizontal: 16, marginBottom: 16, borderRadius: 12 },
    serviceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    serviceNameDetail: { flex: 1, marginLeft: 8, fontWeight: '600', color: theme.colors.text },
    servicePrice: { fontWeight: 'bold', color: theme.colors.primary },
    datetimeRow: { flexDirection: 'row', justifyContent: 'space-between' },
    datetimeItem: { flexDirection: 'row', alignItems: 'center' },
    datetimeText: { marginLeft: 4, color: theme.colors.textSecondary, fontSize: 13 },
    cancelReason: {
      flexDirection: 'row',
      backgroundColor: `${theme.colors.error}1A`,
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${theme.colors.error}40`,
    },
    cancelReasonText: { color: theme.colors.error, flex: 1, marginLeft: 8, fontSize: 13 },
    rating: {
      flexDirection: 'row',
      backgroundColor: `${theme.colors.warning}1A`,
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ratingLabel: { marginRight: 4, color: theme.colors.text },
    actions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
    },
    actionButton: { flex: 1, paddingVertical: 16, alignItems: 'center' },
    actionText: { fontWeight: 'bold' },
    divider: { width: 1, height: 40, backgroundColor: theme.colors.borderLight, alignSelf: 'center' },
  });
