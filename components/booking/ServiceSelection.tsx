import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useBookingFormStore } from '@/stores/bookingFormStore';
import { useTheme } from '@/providers/ThemeProvider';

export const ServiceSelection = () => {
  const { services, selectedServiceIndices, toggleService } = useBookingFormStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  const styles = useMemo(() => createStyles(colors), [colors]);

  const formatDuration = (minutes: number) => {
    if (minutes >= 60 && minutes % 60 === 0) {
      return `${minutes / 60} hr`;
    } else if (minutes > 60) {
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hrs}h ${mins}m`;
    }
    return `${minutes} mins`;
  };

  // Compute total price
  const totalPrice = useMemo(() => {
    let sum = 0;
    selectedServiceIndices.forEach(idx => {
      const price = parseFloat(services[idx]?.price || '0');
      sum += price;
    });
    return sum.toFixed(2);
  }, [selectedServiceIndices, services]);

  return (
    <View>
      {services.map((service, index) => {
        const isSelected = selectedServiceIndices.includes(index);
        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.serviceItem,
              isSelected && styles.selectedItem,
            ]}
            onPress={() => toggleService(index)}
          >
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <View style={styles.checkboxInner} />}
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDuration}>{formatDuration(service.duration)}</Text>
            </View>
            <Text style={styles.servicePrice}>₵{service.price}</Text>
          </TouchableOpacity>
        );
      })}
      {selectedServiceIndices.length > 0 && (
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalPrice}>₵{totalPrice}</Text>
        </View>
      )}
    </View>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    serviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card || colors.background,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedItem: {
      borderColor: colors.primary,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 4,   // square for checkbox
      borderWidth: 2,
      borderColor: colors.textSecondary || '#ccc',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    checkboxSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    checkboxInner: {
      width: 12,
      height: 12,
      backgroundColor: colors.white || '#fff',
    },
    serviceInfo: {
      flex: 1,
    },
    serviceName: {
      fontWeight: 'bold',
      fontSize: 15,
      color: colors.text,
    },
    serviceDuration: {
      color: colors.textSecondary || 'gray',
      fontSize: 12,
      marginTop: 4,
    },
    servicePrice: {
      fontWeight: 'bold',
      fontSize: 16,
      color: colors.primary,
    },
    totalContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border || '#e0e0e0',
      marginTop: 8,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    totalPrice: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
    },
  });