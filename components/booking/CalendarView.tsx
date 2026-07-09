import React, { useState, useMemo } from 'react';
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
import { useTheme } from '@/providers/ThemeProvider';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarViewProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  workingDays?: string[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  selectedDate,
  onSelectDate,
  workingDays = [],
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [currentMonth, setCurrentMonth] = useState(() => selectedDate || new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayIndex = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1;

  const dayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
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
    <View style={[styles.container, { backgroundColor: colors.card || colors.background }]}>
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={handlePrevMonth}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {format(currentMonth, 'MMMM yyyy')}
        </Text>
        <TouchableOpacity onPress={handleNextMonth}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {DAYS.map((day) => (
          <Text key={day} style={[styles.weekDay, { color: colors.textSecondary }]}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.dayCell} />
        ))}
        {daysInMonth.map((date) => renderDay(date))}
      </View>
    </View>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      borderRadius: 15,
      padding: 16,
    },
    monthNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    monthTitle: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 12,
    },
    weekDay: {
      fontWeight: 'bold',
      fontSize: 12,
      width: 32,
      textAlign: 'center',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      padding: 2,
    },
    dayInner: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
    },
    selectedDay: {
      backgroundColor: colors.primary,
    },
    todayBorder: {
      borderWidth: 1,
      borderColor: colors.primary,
    },
    dayText: {
      fontSize: 14,
      color: colors.text,
    },
    selectedText: {
      color: '#fff',
      fontWeight: 'bold',
    },
    todayText: {
      color: colors.primary,
      fontWeight: 'bold',
    },
    disabledText: {
      color: colors.textSecondary || '#ccc',
    },
    closedDot: {
      position: 'absolute',
      top: 2,
      right: 2,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.error || 'red',
    },
  });