import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useBookingFormStore } from '@/stores/bookingFormStore';
import { ServiceSelection } from './ServiceSelection';
import { CalendarView } from './CalendarView';
import { TimeSlots } from './TimeSlots';

export const BookingForm = () => {
  const {
    selectedDate,
    selectedTimeSlot,
    providerData,
    selectDate,
    setTimeSlot,
  } = useBookingFormStore();

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
          setTimeSlot(slot); // store the full slot object
        }}
        workingHours={workingHours}
      />
      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
});