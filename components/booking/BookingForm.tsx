import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useBookingFormStore } from '@/stores/bookingFormStore';
import { ServiceSelection } from './ServiceSelection';
import { CalendarView } from './CalendarView';
import { TimeSlots } from './TimeSlots';
import { useTheme } from '@/providers/ThemeProvider';

export const BookingForm = () => {
  const {
    selectedDate,
    selectedTimeSlot,
    providerData,
    selectDate,
    setTimeSlot,
  } = useBookingFormStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const workingDays = providerData?.workingDays || [];
  const workingHours = providerData?.workingHours;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
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
      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
      color: colors.text,
    },
  });