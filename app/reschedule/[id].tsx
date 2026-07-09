import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBookingStore } from '@/stores/bookingStore';
import { useAuthStore } from '@/stores/auth';
import { CalendarView } from '@/components/booking/CalendarView';
import { TimeSlots } from '@/components/booking/TimeSlots';
import { format } from 'date-fns';
import { useTheme } from '@/providers/ThemeProvider';

export default function RescheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { userBookings, updateBooking, isLoading } = useBookingStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [booking, setBooking] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch the booking from the store
  useEffect(() => {
    const found = userBookings.find(b => b.id === id);
    if (found) {
      setBooking(found);
      setSelectedDate(found.appointmentDate ? new Date(found.appointmentDate) : new Date());
      setSelectedTime(found.timeSlot?.displayTime || null);
      setSelectedTimeSlot(found.timeSlot || null);
    }
    setLoading(false);
  }, [id, userBookings]);

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      Alert.alert('Missing selection', 'Please select a new date and time.');
      return;
    }

    try {
      await updateBooking(booking.id, selectedTimeSlot.time, selectedTimeSlot);
      Alert.alert('Success', 'Appointment rescheduled successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to reschedule appointment.');
    }
  };

  if (loading || !booking) {
    return (
      <View style={[styles.center, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reschedule Appointment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Current appointment info */}
        <View style={[
          styles.currentCard,
          {
            backgroundColor: colors.card || colors.background,
            shadowColor: '#000',
          }
        ]}>
          <Text style={[styles.currentLabel, { color: colors.textSecondary }]}>Current Appointment</Text>
          <Text style={[styles.currentText, { color: colors.text }]}>
            {booking.serviceName} – {format(new Date(booking.appointmentDate), 'MMMM d, yyyy')} at {booking.timeSlot?.displayTime}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Select New Date</Text>
        <CalendarView
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          workingDays={booking.workingDays || []}
        />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Select New Time</Text>
        <TimeSlots
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onSelectTime={(timeString, slot) => {
            setSelectedTime(timeString);
            setSelectedTimeSlot({
              displayTime: slot.display,
              time: slot.time,
            });
          }}
          workingHours={booking.workingHours}
        />

        <TouchableOpacity
          style={[
            styles.confirmButton,
            { backgroundColor: colors.primary },
            isLoading && styles.disabled,
          ]}
          onPress={handleConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.confirmText}>Confirm Reschedule</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      paddingTop: 50,
      paddingBottom: 20,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    content: {
      padding: 20,
    },
    currentCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    currentLabel: {
      fontSize: 14,
      marginBottom: 4,
    },
    currentText: {
      fontSize: 16,
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
      marginTop: 16,
    },
    confirmButton: {
      borderRadius: 30,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 32,
      marginBottom: 20,
    },
    disabled: {
      opacity: 0.5,
    },
    confirmText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });