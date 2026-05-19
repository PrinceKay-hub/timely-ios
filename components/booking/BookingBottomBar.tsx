import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useBookingStore } from '@/stores/bookingStore';
import { useBookingFormStore } from '@/stores/bookingFormStore';
import { useAuthStore } from '@/stores/auth';
import { BookingSummaryDialog } from './BookingSummaryDialog';
import { BookingEntity } from '@/types/booking';

const PURPLE = '#8B5CF6';

export const BookingBottomBar = () => {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { createBooking, isLoading } = useBookingStore();
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
    // Guard against missing time slot (should not happen, but safe)
    if (!selectedTimeSlot) {
      Alert.alert('Error', 'No time slot selected');
      return;
    }
    setSummaryVisible(false);

    const selectedService = services[selectedServiceIndex!];
    // Construct BookingEntity
    const bookingData: BookingEntity = {
      id: '', // Will be assigned by Firestore
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
      <View style={styles.container}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>₵{totalPrice}</Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleViewSummary}>
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

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: 'gray',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PURPLE,
  },
  button: {
    backgroundColor: PURPLE,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});