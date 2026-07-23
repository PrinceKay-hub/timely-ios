import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useBookingStore } from '@/stores/bookingStore';
import { useBookingFormStore } from '@/stores/bookingFormStore';
import { useAuthStore } from '@/stores/auth';
import { BookingSummaryDialog } from './BookingSummaryDialog';
import { BookingEntity } from '@/types/booking';
import { useTheme } from '@/providers/ThemeProvider';

export const BookingBottomBar = () => {
  const { user, profile, updateUserProfile } = useAuthStore();
  const { createBooking, isLoading } = useBookingStore();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    providerData,
    services,
    selectedServiceIndices, 
    selectedDate,
    isDateWorkingDay,
    selectedTimeSlot,
    phone,
  } = useBookingFormStore();

  const [summaryVisible, setSummaryVisible] = useState(false);

  // Compute selected services and total price
  const selectedServices = useMemo(() => {
    return services.filter((_, index) => selectedServiceIndices.includes(index));
  }, [services, selectedServiceIndices]);

  const totalPrice = useMemo(() => {
    let sum = 0;
    selectedServices.forEach((s) => {
      const price = parseFloat(s.price);
      if (!isNaN(price)) sum += price;
    });
    return sum.toFixed(2);
  }, [selectedServices]);

  // User info (unchanged)
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
    // ✅ check if any service selected
    if (selectedServiceIndices.length === 0) {
      Alert.alert('Missing selection', 'Please select at least one service');
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

    // Build a combined service description for the single `serviceOption` field
    // (if your BookingEntity supports an array, you can adapt accordingly)
    const combinedName = selectedServices.map(s => s.name).join(' + ');
    const combinedDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
    const combinedPrice = parseFloat(totalPrice);

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
      // ✅ store combined service info (or you could store an array if your type allows)
      serviceOption: {
        price: combinedPrice.toString(),
        title: combinedName,
        durationMinutes: combinedDuration,
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
      phone: phone,
    };

    try {
      await createBooking(bookingData);

      if (phone && !user?.phone) {
        await updateUserProfile({ phone });
      }
    } catch (error) {
      console.error('Booking or profile update failed:', error);
      Alert.alert('Error', 'Failed to complete booking. Please try again.');
    }
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
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>View Summary</Text>
        </TouchableOpacity>
      </View>

      <BookingSummaryDialog
        visible={summaryVisible}
        onClose={() => setSummaryVisible(false)}
        serviceName={selectedServices.map(s => s.name).join(' + ')} // ✅ show combined
        date={selectedDate}
        timeString={selectedTimeSlot?.display ?? ''}
        totalPrice={totalPrice}
        onConfirm={handleConfirmBooking}
      />
    </>
  );
};

// ─── Styles (unchanged) ──────────────────────────────────────────────────────────
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