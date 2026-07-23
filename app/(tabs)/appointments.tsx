import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  FlatList,
  TouchableOpacity
} from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { useBookingStore } from '@/stores/bookingStore';
import { AppointmentCard } from '@/components/appointments/AppointmentCard';
import { StatBadge } from '@/components/appointments/StatBadge';
import { CancelDialog } from '@/components/appointments/CancelDialog';
import { ConfirmDialog } from '@/components/appointments/ConfirmDialog';
import { DeleteDialog } from '@/components/appointments/DeleteDialog';
import { RescheduleDialog } from '@/components/appointments/RescheduleDialog';
import { ReviewDialog } from '@/components/appointments/ReviewDialog';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { BookingEntity } from '@/types/booking';
import { useTheme } from '@/providers/ThemeProvider';

const { width } = Dimensions.get('window');

// Helper functions moved to the top
const getEmptyIcon = (status: string) => {
  switch (status) {
    case 'pending': return 'time-outline';
    case 'confirmed': return 'checkmark-circle-outline';
    case 'cancelled': return 'close-circle-outline';
    case 'completed': return 'checkmark-done-outline';
    default: return 'information-circle-outline';
  }
};

const getEmptyMessage = (status: string) => {
  switch (status) {
    case 'pending': return 'No pending appointments.';
    case 'confirmed': return 'No confirmed appointments.';
    case 'cancelled': return 'No cancelled appointments.';
    case 'completed': return 'No completed appointments.';
    default: return 'No appointments.';
  }
};

interface BookingListProps {
  bookings: BookingEntity[];
  status: string;
  user: any; // from auth store
  onCancel?: (booking: BookingEntity) => void;
  onConfirm?: (booking: BookingEntity) => void;
  onReschedule?: (booking: BookingEntity) => void;
  onDirections?: (booking: BookingEntity) => void;
  onRebook?: (booking: BookingEntity) => void;
  onDelete?: (booking: BookingEntity) => void;
  onWriteReview?: (booking: BookingEntity) => void;
  onBookAgain?: (booking: BookingEntity) => void;
}

const BookingList: React.FC<BookingListProps> = ({
  bookings,
  status,
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

  if (bookings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={getEmptyIcon(status)} size={48} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>{getEmptyMessage(status)}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={bookings}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <AppointmentCard
          booking={item}
          user={user}
          onCancel={() => onCancel?.(item)}
          onConfirm={() => onConfirm?.(item)}
          onReschedule={() => onReschedule?.(item)}
          onDirections={() => onDirections?.(item)}
          onRebook={() => onRebook?.(item)}
          onDelete={() => onDelete?.(item)}
          onWriteReview={() => onWriteReview?.(item)}
          onBookAgain={() => onBookAgain?.(item)}
        />
      )}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default function AppointmentsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    userBookings,
    isLoading,
    error,
    successMessage,
    clearMessages,
    startListening,
    stopListening,
    cancelBooking,
    confirmBooking,
    deleteBooking,
  } = useBookingStore();

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'pending', title: 'Pending' },
    { key: 'confirmed', title: 'Upcoming' },
    { key: 'cancelled', title: 'Cancelled' },
    { key: 'completed', title: 'Completed' },
  ]);

  const [isDirectionsLoading, setIsDirectionsLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingEntity | null>(null);
  const [dialogType, setDialogType] = useState<string | null>(null);

  // Filter bookings by status
  const pending = userBookings.filter(b => b.status === 'pending');
  const confirmed = userBookings.filter(b => b.status === 'confirmed');
  const cancelled = userBookings.filter(b => b.status === 'cancelled');
  const completed = userBookings.filter(b => b.status === 'completed');

  useEffect(() => {
    if (user?.uid) {
      startListening(user.uid);
    } else {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [user]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      Alert.alert('Success', successMessage, [
        { text: 'OK' },
      ]);
      clearMessages();
    }
  }, [successMessage]);

  const handleDirections = async (lat: number, lng: number) => {
    setIsDirectionsLoading(true);
    try {
      const url = Platform.select({
        ios: `maps://app?daddr=${lat},${lng}`,
        android: `google.navigation:q=${lat},${lng}`,
      });
      if (url) {
        const supported = await Linking.canOpenURL(url);
        if (supported) await Linking.openURL(url);
        else Alert.alert('Error', 'Cannot open maps');
      }
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setIsDirectionsLoading(false);
    }
  };

  const closeDialog = () => {
    setDialogType(null);
    setSelectedBooking(null);
  };

  const renderScene = SceneMap({
    pending: () => (
      <BookingList
        bookings={pending}
        status="pending"
        user={user}
        onCancel={(booking) => {
          setSelectedBooking(booking);
          setDialogType('cancel');
        }}
        onConfirm={(booking) => {
          setSelectedBooking(booking);
          setDialogType('confirm');
        }}
        onReschedule={(booking) => {
          setSelectedBooking(booking);
          setDialogType('reschedule');
        }}
        onDirections={(booking) => handleDirections(booking.latitude, booking.longitude)}
        onRebook={(booking) => {
          router.push({
            pathname: '/rebook/[id]',
            params: { id: booking.id }
          })
        }}
        onDelete={(booking) => {
          setSelectedBooking(booking);
          setDialogType('delete');
        }}
        onWriteReview={(booking) => {
          setSelectedBooking(booking);
          setDialogType('review');
        }}
        onBookAgain={(booking) => {
          router.push({
            pathname: '/booking/[id]',
            params: { id: booking.id }
          })
        }}
      />
    ),
    confirmed: () => (
      <BookingList
        bookings={confirmed}
        status="confirmed"
        user={user}
        onCancel={(booking) => {
          setSelectedBooking(booking);
          setDialogType('cancel');
        }}
        onDirections={(booking) => handleDirections(booking.latitude, booking.longitude)}
      />
    ),
    cancelled: () => (
      <BookingList
        bookings={cancelled}
        status="cancelled"
        user={user}
        onRebook={(booking) => router.push({
          pathname: '/rebook/[id]',
          params: { id: booking.id }
        })}
        onDelete={(booking) => {
          setSelectedBooking(booking);
          setDialogType('delete');
        }}
      />
    ),
    completed: () => (
      <BookingList
        bookings={completed}
        status="completed"
        user={user}
        onWriteReview={(booking) => {
          setSelectedBooking(booking);
          setDialogType('review');
        }}
        onBookAgain={(booking) => {
          router.push({
            pathname: '/booking/[id]',
            params: { id: booking.id }
          })
        }}
      />
    ),
  });

  if (isLoading && userBookings.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Appointments</Text>
        <View style={styles.statsRow}>
          <StatBadge count={pending.length} label="Pending" />
          <StatBadge count={confirmed.length} label="Upcoming" />
          <StatBadge count={cancelled.length} label="Cancelled" />
        </View>
      </View>

      {/* Tab Bar */}
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width }}
        renderTabBar={(props) => (
          <View style={styles.customTabBar}>
            {props.navigationState.routes.map((route) => {
              const isActive = route.key === props.navigationState.routes[props.navigationState.index].key;
              return (
                <TouchableOpacity
                  key={route.key}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                  onPress={() => props.jumpTo(route.key)} 
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      isActive && styles.tabLabelActive,
                    ]}
                  >
                    {route.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      />

      {/* Dialogs */}
      {dialogType === 'cancel' && selectedBooking && (
        <CancelDialog
          visible
          booking={selectedBooking}
          userId={user?.uid}
          onCancel={(reason) => {
            const targetId = user?.uid === selectedBooking.providerId ? selectedBooking.userId : selectedBooking.providerId;
            cancelBooking(selectedBooking.id, targetId, reason);
            closeDialog();
          }}
          onClose={closeDialog}
        />
      )}
      {dialogType === 'confirm' && selectedBooking && (
        <ConfirmDialog
          visible
          onConfirm={() => {
            confirmBooking(selectedBooking.id, selectedBooking.userId);
            closeDialog();
          }}
          onClose={closeDialog}
        />
      )}
      {dialogType === 'delete' && selectedBooking && (
        <DeleteDialog
          visible
          onDelete={() => {
            deleteBooking(selectedBooking.id);
            closeDialog();
          }}
          onClose={closeDialog}
        />
      )}
      {dialogType === 'reschedule' && selectedBooking && (
        <RescheduleDialog
          visible
          booking={selectedBooking}
          onReschedule={() => {
            router.push({
              pathname: '/reschedule/[id]',
              params: { id: selectedBooking.id }
            })
            closeDialog();
          }}
          onClose={closeDialog}
        />
      )}
      {dialogType === 'review' && selectedBooking && (
        <ReviewDialog
          visible
          booking={selectedBooking}
          userId={user?.uid}
          userName={user?.displayName || 'User'}
          onClose={closeDialog}
        />
      )}

      {/* Directions Loading Overlay */}
      {isDirectionsLoading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={theme.colors.white} />
        </View>
      )}
    </View>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.surface, paddingBottom: 100, },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      backgroundColor: theme.colors.primary,
      paddingTop: 50,
      paddingBottom: 30,
      paddingHorizontal: 20,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
    headerTitle: {
      color: theme.colors.white,
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    tabBar: {
      backgroundColor: theme.colors.card,
      marginHorizontal: 10,
      marginTop: 20,
      borderRadius: 15,
      elevation: 2,
    },
    listContainer: {
      padding: 20,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      marginTop: 12,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    customTabBar: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      marginHorizontal: 10,
      marginTop: 20,
      borderRadius: 15,
      elevation: 2,
      paddingVertical: 4,
    },
    tabItem: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 12,
    },
    tabItemActive: {
      backgroundColor: theme.colors.primary + '20', 
    },
    tabLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    tabLabelActive: {
      color: theme.colors.primary,
    },
  });
