import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useBookingFormStore } from '@/stores/bookingFormStore';

const PURPLE = '#8B5CF6';

export const ServiceSelection = () => {
  const { services, selectedServiceIndex, selectService } = useBookingFormStore();

  return (
    <View>
      {services.map((service, index) => {
        const isSelected = selectedServiceIndex === index;
        return (
          <TouchableOpacity
            key={index}
            style={[styles.serviceItem, isSelected && styles.selectedItem]}
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

const styles = StyleSheet.create({
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedItem: {
    borderColor: PURPLE,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioSelected: {
    borderColor: PURPLE,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PURPLE,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  serviceDuration: {
    color: 'gray',
    fontSize: 12,
    marginTop: 4,
  },
  servicePrice: {
    fontWeight: 'bold',
    fontSize: 16,
    color: PURPLE,
  },
});