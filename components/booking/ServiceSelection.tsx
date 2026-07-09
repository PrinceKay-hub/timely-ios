import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useBookingFormStore } from '@/stores/bookingFormStore';
import { useTheme } from '@/providers/ThemeProvider';

export const ServiceSelection = () => {
  const { services, selectedServiceIndex, selectService } = useBookingFormStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View>
      {services.map((service, index) => {
        const isSelected = selectedServiceIndex === index;
        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.serviceItem,
              isSelected && styles.selectedItem,
            ]}
            onPress={() => selectService(index)}
          >
            <View style={[styles.radio, isSelected && styles.radioSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDuration}>{service.duration} mins</Text>
            </View>
            <Text style={styles.servicePrice}>₵{service.price}</Text>
          </TouchableOpacity>
        );
      })}
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
    radio: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.textSecondary || '#ccc',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    radioSelected: {
      borderColor: colors.primary,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
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
  });