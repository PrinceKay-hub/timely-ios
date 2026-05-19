import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { addMinutes, format, isToday } from 'date-fns';

const PURPLE = '#8B5CF6';

export interface TimeSlot {
  display: string;
  time: Date;
}

interface TimeSlotsProps {
  /** The date for which to generate time slots */
  selectedDate: Date | null;
  /** Currently selected time string (for highlighting) */
  selectedTime: string | null;
  /** Callback when a time slot is selected – receives the time string and the full slot object */
  onSelectTime: (timeString: string, slot: TimeSlot) => void;
  /** Working hours object (optional – if not provided, a default 9‑17 will be used) */
  workingHours?: {
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
  };
}

export const TimeSlots: React.FC<TimeSlotsProps> = ({
  selectedDate,
  selectedTime,
  onSelectTime,
  workingHours = { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
}) => {
  if (!selectedDate) {
    return null; // or a placeholder
  }

  // Generate time slots based on working hours and selected date
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    let start = new Date(selectedDate);
    start.setHours(workingHours.startHour, workingHours.startMinute, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(workingHours.endHour, workingHours.endMinute, 0, 0);

    const now = new Date();
    const isTodaySelected = isToday(selectedDate);

    while (start < end) {
      if (!isTodaySelected || start > now) {
        slots.push({
          display: format(start, 'h:mm aa'),
          time: new Date(start),
        });
      }
      start = addMinutes(start, 60);
    }
    return slots;
  };

  const slots = generateTimeSlots();

  return (
    <View style={styles.container}>
      {slots.map((slot, index) => {
        const isSelected = slot.display === selectedTime;
        return (
          <TouchableOpacity
            key={index}
            style={[styles.slot, isSelected && styles.selectedSlot]}
            onPress={() => onSelectTime(slot.display, slot)}
          >
            <Text style={[styles.slotText, isSelected && styles.selectedSlotText]}>
              {slot.display}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Keep the same styles
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  slot: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    minWidth: 80,
    alignItems: 'center',
  },
  selectedSlot: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  slotText: {
    color: 'gray',
    fontWeight: '500',
  },
  selectedSlotText: {
    color: 'white',
  },
});