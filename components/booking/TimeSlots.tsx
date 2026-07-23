import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { addMinutes, format, isToday } from 'date-fns';
import { useTheme } from '@/providers/ThemeProvider';

export interface TimeSlot {
  display: string;
  time: Date;
}

interface TimeSlotsProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  onSelectTime: (timeString: string, slot: TimeSlot) => void;
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
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!selectedDate) {
    return null;
  }

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
      start = addMinutes(start, 30);
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

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    slot: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: colors.card || colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border || '#eee',
      minWidth: 80,
      alignItems: 'center',
    },
    selectedSlot: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    slotText: {
      color: colors.textSecondary || 'gray',
      fontWeight: '500',
    },
    selectedSlotText: {
      color: '#fff',
    },
  });