import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';
import { useSelectedLocationStore } from '@/stores/selectedLocationStore';

const PURPLE = '#8B5CF6';

export const LocationStep = () => {
  const router = useRouter();
  const { currentService, updateServiceField } = useServiceRegistrationStore();
  const { selectedLocation } = useSelectedLocationStore();
  const [isLocating, setIsLocating] = useState(false);
  const [locationComplete, setLocationComplete] = useState(false);

  // When currentService changes, check if it has valid coordinates
  useEffect(() => {
    const hasCoordinates =
      currentService?.latitude != null &&
      currentService?.longitude != null &&
      (currentService.latitude !== 0 || currentService.longitude !== 0);
    setLocationComplete(hasCoordinates);
  }, [currentService]);

  const handleSelectRegion = async () => {
    router.push('/location/regions?isService=true');
  };

  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location permission is needed to get your current location.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      updateServiceField('latitude', loc.coords.latitude);
      updateServiceField('longitude', loc.coords.longitude);
      setLocationComplete(true);
    } catch (error) {
      Alert.alert('Error', 'Could not get current location');
    } finally {
      setIsLocating(false);
    }
  };

  // Parse selectedLocation into region and district
  useEffect(() => {
    if (selectedLocation && selectedLocation !== 'Select Location') {
      const parts = selectedLocation.split(' - ');
      if (parts.length === 2) {
        updateServiceField('region', parts[0]);
        updateServiceField('district', parts[1]);
      } else {
        updateServiceField('region', selectedLocation);
        updateServiceField('district', '');
      }
      updateServiceField('location', selectedLocation);
    }
  }, [selectedLocation]);

  const handlePhoneChange = (text: string) => {
    updateServiceField('number', text);
  };

  const handlePhoneBlur = () => {
    const currentNumber = currentService?.number || '';
    if (!currentNumber.trim()) {
      updateServiceField('number', '+233');
      return;
    }
    if (!currentNumber.startsWith('+233')) {
      const cleaned = currentNumber.replace(/[^0-9]/g, '');
      if (cleaned.length > 0) {
        updateServiceField('number', `+233${cleaned}`);
      } else {
        updateServiceField('number', '+233');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="location-outline" size={60} color={PURPLE} />
      <Text style={styles.title}>Business Location & Contact</Text>
      <Text style={styles.subtitle}>Where can customers find you?</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Shop Location</Text>
        <TouchableOpacity style={styles.locationPicker} onPress={handleSelectRegion}>
          <Ionicons name="location-outline" size={20} color={PURPLE} />
          <Text style={styles.locationText}>
            {currentService?.location || 'Select location'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity
            style={styles.currentLocButton}
            onPress={handleGetCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={PURPLE} />
            ) : (
              <>
                <Ionicons name="locate-outline" size={20} color={PURPLE} />
                <Text style={styles.currentLocText}>Set Shop Location</Text>
              </>
            )}
          </TouchableOpacity>
          {locationComplete && <Ionicons name="checkmark-circle" size={24} color="green" />}
        </View>

        <Text style={[styles.label, { marginTop: 24 }]}>Phone Number (Don't start with "0")</Text>
        <TextInput
          style={styles.input}
          value={currentService?.number}
          onChangeText={handlePhoneChange}
          onBlur={handlePhoneBlur}
          placeholder="+233 244 123456"
          keyboardType="phone-pad"
        />
        <Text style={styles.hintText}>e.g., 244 123456 (automatically adds +233)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  subtitle: { color: 'gray', fontSize: 16, marginBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 16 },
  label: { fontWeight: '600', fontSize: 14, marginBottom: 8 },
  locationPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  locationText: { flex: 1, marginLeft: 8, color: '#333' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  currentLocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  currentLocText: { marginLeft: 8, color: PURPLE, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginLeft: 4,
  },
});