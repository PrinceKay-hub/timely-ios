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

type CoordinateSource = 'gps' | 'approximate' | null;

export const LocationStep = () => {
  const router = useRouter();
  const { currentService, updateServiceField } = useServiceRegistrationStore();
  const { selectedLocation } = useSelectedLocationStore();
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [coordinateSource, setCoordinateSource] = useState<CoordinateSource>(null);

  const hasCoordinates =
    currentService?.latitude != null &&
    currentService?.longitude != null &&
    (currentService.latitude !== 0 || currentService.longitude !== 0);

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
      setCoordinateSource('gps');
    } catch (error) {
      Alert.alert('Error', 'Could not get current location');
    } finally {
      setIsLocating(false);
    }
  };

  // Parse selectedLocation into region and district, then geocode it
  // as an approximate fallback so the provider doesn't have to be
  // physically at the premises to register.
  useEffect(() => {
    if (!selectedLocation || selectedLocation === 'Select Location') return;

    const parts = selectedLocation.split(' - ');
    if (parts.length === 2) {
      updateServiceField('region', parts[0]);
      updateServiceField('district', parts[1]);
    } else {
      updateServiceField('region', selectedLocation);
      updateServiceField('district', '');
    }
    updateServiceField('location', selectedLocation);

    // Only auto-geocode if the user hasn't already set a precise GPS pin —
    // don't clobber a real location with a rough estimate.
    if (coordinateSource === 'gps') return;

    const geocodeRegion = async () => {
      setIsGeocoding(true);
      try {
        const results = await Location.geocodeAsync(`${selectedLocation}, Ghana`);
        if (results.length > 0) {
          updateServiceField('latitude', results[0].latitude);
          updateServiceField('longitude', results[0].longitude);
          setCoordinateSource('approximate');
        }
      } catch (error) {
        // Geocoding can fail offline or for obscure district names —
        // not fatal, the user can still set a precise pin via GPS.
        console.warn('Geocoding failed for', selectedLocation, error);
      } finally {
        setIsGeocoding(false);
      }
    };
    geocodeRegion();
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
                <Text style={styles.currentLocText}>
                  {coordinateSource === 'gps' ? 'Update precise location' : "I'm at the premises now"}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {isGeocoding && <ActivityIndicator size="small" color={PURPLE} />}
          {!isGeocoding && hasCoordinates && (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={coordinateSource === 'gps' ? 'green' : '#F59E0B'}
            />
          )}
        </View>

        {hasCoordinates && coordinateSource === 'approximate' && (
          <View style={styles.approxNote}>
            <Ionicons name="information-circle-outline" size={16} color="#F59E0B" />
            <Text style={styles.approxNoteText}>
              We've set an approximate pin based on your selected area. Tap the
              button above if you're at the premises to set an exact location.
            </Text>
          </View>
        )}

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
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 },
  currentLocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  currentLocText: { marginLeft: 8, color: PURPLE, fontWeight: '600' },
  approxNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    gap: 6,
  },
  approxNoteText: { color: '#B45309', fontSize: 12, flex: 1, lineHeight: 16 },
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