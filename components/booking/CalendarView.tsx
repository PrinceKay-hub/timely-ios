import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isBefore,
  startOfDay,
} from 'date-fns';

const PURPLE = '#8B5CF6';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarViewProps {
  /** Currently selected date (or null) */
  selectedDate: Date | null;
  /** Callback when a date is selected */
  onSelectDate: (date: Date) => void;
  /** Array of working day strings (e.g. ['Mon', 'Tue', ...]) */
  workingDays?: string[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  selectedDate,
  onSelectDate,
  workingDays = [],
}) => {
  // Internal state for the displayed month
  const [currentMonth, setCurrentMonth] = useState(() => selectedDate || new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Weekday offset (Monday = 0)
  const firstDayIndex = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1;

  // Convert working day strings to numbers (1=Monday ... 7=Sunday)
  const dayMap: Record<string, number> = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6, Sun:7 };
  const workingDayNumbers = workingDays.map((d) => dayMap[d]);

  const isWorkingDay = (date: Date) => {
    const day = date.getDay() === 0 ? 7 : date.getDay();
    return workingDayNumbers.includes(day);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const renderDay = (date: Date) => {
    const isToday = isSameDay(date, new Date());
    const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
    const isPast = isBefore(date, startOfDay(new Date()));
    const working = isWorkingDay(date);
    const disabled = isPast || !working;

    return (
      <TouchableOpacity
        key={date.toString()}
        style={styles.dayCell}
        onPress={disabled ? undefined : () => onSelectDate(date)}
        disabled={disabled}
      >
        <View
          style={[
            styles.dayInner,
            isSelected && styles.selectedDay,
            isToday && !isSelected && styles.todayBorder,
          ]}
        >
          <Text
            style={[
              styles.dayText,
              disabled && styles.disabledText,
              isSelected && styles.selectedText,
              isToday && !isSelected && styles.todayText,
            ]}
          >
            {format(date, 'd')}
          </Text>
          {!working && !isPast && <View style={styles.closedDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Month navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={handlePrevMonth}>
          <Ionicons name="chevron-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy')}</Text>
        <TouchableOpacity onPress={handleNextMonth}>
          <Ionicons name="chevron-forward" size={24} color="black" />
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {DAYS.map((day) => (
          <Text key={day} style={styles.weekDay}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {/* Empty cells for days before month start */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.dayCell} />
        ))}
        {daysInMonth.map((date) => renderDay(date))}
      </View>
    </View>
  );
};

// Keep the same styles as before (no changes needed)
const styles = StyleSheet.create({
  container: { backgroundColor: 'white', borderRadius: 15, padding: 16 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  monthTitle: { fontSize: 16, fontWeight: 'bold' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  weekDay: { fontWeight: 'bold', color: 'gray', fontSize: 12, width: 32, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  dayInner: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  selectedDay: { backgroundColor: PURPLE },
  todayBorder: { borderWidth: 1, borderColor: PURPLE },
  dayText: { fontSize: 14, color: '#333' },
  selectedText: { color: 'white', fontWeight: 'bold' },
  todayText: { color: PURPLE, fontWeight: 'bold' },
  disabledText: { color: '#ccc' },
  closedDot: { position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: 3, backgroundColor: 'red' },
});