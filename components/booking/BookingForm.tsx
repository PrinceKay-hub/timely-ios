import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput,   KeyboardAvoidingView, Platform, } from 'react-native';
import { useBookingFormStore } from '@/stores/bookingFormStore';
import { ServiceSelection } from './ServiceSelection';
import { CalendarView } from './CalendarView';
import { TimeSlots } from './TimeSlots';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/auth';

export const BookingForm = () => {
  const {
    selectedDate,
    selectedTimeSlot,
    providerData,
    selectDate,
    setTimeSlot,
    phone,
    setPhone, 
  } = useBookingFormStore();
  const { theme } = useTheme();
  const colors = theme.colors;
  const { user, profile  } = useAuthStore();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const workingDays = providerData?.workingDays || [];
  const workingHours = providerData?.workingHours;

  // Check if phone exists in profile (Firestore) or fallback to user (if phone auth used)
  const existingPhone = profile?.phone || user?.phone;
  const showPhoneField = !existingPhone;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0} // adjust based on your header height
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Text style={styles.sectionTitle}>Select Service</Text>
        <ServiceSelection />

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Select Date</Text>
        <CalendarView
          selectedDate={selectedDate}
          onSelectDate={selectDate}
          workingDays={workingDays}
        />

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Select Time</Text>
        <TimeSlots
          selectedDate={selectedDate}
          selectedTime={selectedTimeSlot?.display ?? null}
          onSelectTime={(display, slot) => {
            setTimeSlot(slot);
          }}
          workingHours={workingHours}
        />

        {showPhoneField && (
          <View style={styles.phoneContainer}>
            <Text style={styles.phoneLabel}>Phone Number</Text>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="+233 244 123456"
              placeholderTextColor={ '#999'}
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={() => {
                // Dismiss keyboard if needed – you can also use a ref
                // Keyboard.dismiss();
              }}
            />
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              e.g., 244 123456 (automatically adds +233)
              </Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
      color: colors.text,
    },
    phoneContainer: {
      marginTop: 24,
      marginBottom: 8,
    },
    phoneLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 8,
    },
    phoneInput: {
      borderWidth: 1,
      borderColor: colors.border || '#ccc',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface || '#f9f9f9',
    },
    helperText: {
      fontSize: 12,
      marginTop: 4,
      marginLeft: 4,
    },
  });