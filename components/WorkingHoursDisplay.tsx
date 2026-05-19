import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WorkingHoursDisplayProps {
  service: {
    workingDays?: string[];
    workingHours?: {
      startHour: number;
      startMinute: number;
      endHour: number;
      endMinute: number;
    };
  };
}

const WorkingHoursDisplay: React.FC<WorkingHoursDisplayProps> = ({ service }) => {
  const days = service.workingDays || [];
  const hours = service.workingHours || { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 };

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const getDaysDisplay = () => {
    if (days.length === 0) return 'No working days specified';

    const dayOrder: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    const sorted = [...days].sort((a, b) => (dayOrder[a] || 8) - (dayOrder[b] || 8));

    if (sorted.length === 7) return 'Open everyday';
    if (sorted.length === 5 && ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].every(d => sorted.includes(d))) {
      return 'Weekdays only';
    }
    if (sorted.length === 2 && ['Sat', 'Sun'].every(d => sorted.includes(d))) {
      return 'Weekends only';
    }

    // Check consecutive
    const isConsecutive = sorted.every((day, i) => {
      if (i === 0) return true;
      return (dayOrder[day] || 0) === (dayOrder[sorted[i - 1]] || 0) + 1;
    });
    if (isConsecutive && sorted.length > 1) {
      return `${sorted[0]} - ${sorted[sorted.length - 1]}`;
    }
    return sorted.join(', ');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.daysText}>{getDaysDisplay()}</Text>
      <View style={styles.hoursRow}>
        <Ionicons name="time-outline" size={16} color="gray" />
        <Text style={styles.hoursText}>
          {formatTime(hours.startHour, hours.startMinute)} - {formatTime(hours.endHour, hours.endMinute)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'flex-start' },
  daysText: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  hoursRow: { flexDirection: 'row', alignItems: 'center' },
  hoursText: { fontSize: 14, color: 'gray', marginLeft: 4 },
});

export default WorkingHoursDisplay;