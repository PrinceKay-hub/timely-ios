import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useBookingStore } from '@/stores/bookingStore';
import { useBookingFormStore } from '@/stores/bookingFormStore';
import { useAuthStore } from '@/stores/auth';
import { BookingSummaryDialog } from './BookingSummaryDialog';
import { BookingEntity } from '@/types/booking';
import { useTheme } from '@/providers/ThemeProvider';

export const BookingBottomBar = () => {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { createBooking, isLoading } = useBookingStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    providerData,
    services,
    selectedServiceIndex,
    selectedDate,
    totalPrice,
    isDateWorkingDay,
    selectedTimeSlot,
  } = useBookingFormStore();

  const [summaryVisible, setSummaryVisible] = useState(false);

  const userInfo = {
    ...user,
    id: profile?.id || user?.id,
    displayName: profile?.displayName || user?.displayName,
    photoURL: profile?.photoURL || user?.photoURL,
    email: profile?.email || user?.email,
    fcmToken: profile?.fcmToken || user?.fcmToken,
    expoPushToken: profile?.expoPushToken || user?.expoPushToken,
    isEmailVerified: profile?.isEmailVerified || user?.isEmailVerified,
  };

  const handleViewSummary = () => {
    if (selectedServiceIndex === null) {
      Alert.alert('Missing selection', 'Please select a service');
      return;
    }
    if (!isDateWorkingDay) {
      Alert.alert('Closed', 'Shop is closed on the selected date');
      return;
    }
    if (!selectedTimeSlot) {
      Alert.alert('Missing selection', 'Please select a time slot');
      return;
    }
    setSummaryVisible(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedTimeSlot) {
      Alert.alert('Error', 'No time slot selected');
      return;
    }
    setSummaryVisible(false);

    const selectedService = services[selectedServiceIndex!];
    const bookingData: BookingEntity = {
      id: '',
      serviceId: providerData.id,
      serviceName: providerData.name,
      providerId: providerData.providerId,
      userId: user.uid,
      appointmentDate: selectedTimeSlot.time,
      timeSlot: {
        displayTime: selectedTimeSlot.display,
        time: selectedTimeSlot.time,
      },
      serviceOption: {
        price: selectedService.price,
        title: selectedService.name,
        durationMinutes: selectedService.duration,
      },
      totalAmount: totalPrice,
      createdAt: new Date(),
      userName: userInfo.displayName || 'User',
      participants: [providerData.providerId, user.uid],
      status: 'pending',
      latitude: providerData.latitude,
      longitude: providerData.longitude,
      workingDays: providerData.workingDays,
      workingHours: providerData.workingHours,
      services: services,
      reminderSent: false,
    };

    await createBooking(bookingData);
    router.back();
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.card || colors.background }]}>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
            Total Amount
          </Text>
          <Text style={[styles.totalAmount, { color: colors.primary }]}>
            ₵{totalPrice}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleViewSummary}
        >
          <Text style={styles.buttonText}>View Summary</Text>
        </TouchableOpacity>
      </View>

      <BookingSummaryDialog
        visible={summaryVisible}
        onClose={() => setSummaryVisible(false)}
        serviceName={selectedServiceIndex !== null ? services[selectedServiceIndex].name : ''}
        date={selectedDate}
        timeString={selectedTimeSlot?.display ?? ''}
        totalPrice={totalPrice}
        onConfirm={handleConfirmBooking}
      />
    </>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border || '#eee',
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    totalLabel: {
      fontSize: 16,
    },
    totalAmount: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    button: {
      borderRadius: 30,
      paddingVertical: 16,
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });