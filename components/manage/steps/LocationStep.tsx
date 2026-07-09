import React, { useState, useEffect, useMemo } from 'react';
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
import { useTheme } from '@/providers/ThemeProvider';

type CoordinateSource = 'gps' | 'approximate' | null;

export const LocationStep = () => {
  const router = useRouter();
  const { currentService, updateServiceField } = useServiceRegistrationStore();
  const { selectedLocation } = useSelectedLocationStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

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
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Ionicons name="location-outline" size={60} color={colors.primary} />
      <Text style={[styles.title, { color: colors.text }]}>Business Location & Contact</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Where can customers find you?
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card || colors.background }]}>
        <Text style={[styles.label, { color: colors.text }]}>Shop Location</Text>
        <TouchableOpacity
          style={[
            styles.locationPicker,
            {
              borderColor: colors.border || '#ddd',
              backgroundColor: colors.surface,
            }
          ]}
          onPress={handleSelectRegion}
        >
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <Text style={[styles.locationText, { color: colors.text }]}>
            {currentService?.location || 'Select location'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.currentLocButton,
              {
                borderColor: colors.primary,
                backgroundColor: colors.surface,
              }
            ]}
            onPress={handleGetCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="locate-outline" size={20} color={colors.primary} />
                <Text style={[styles.currentLocText, { color: colors.primary }]}>
                  {coordinateSource === 'gps' ? 'Update precise location' : "I'm at the premises now"}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {isGeocoding && <ActivityIndicator size="small" color={colors.primary} />}
          {!isGeocoding && hasCoordinates && (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={coordinateSource === 'gps' ? colors.success || 'green' : colors.warning || '#F59E0B'}
            />
          )}
        </View>

        {hasCoordinates && coordinateSource === 'approximate' && (
          <View style={[
            styles.approxNote,
            {
              backgroundColor: colors.warningLight || '#FFFBEB',
            }
          ]}>
            <Ionicons name="information-circle-outline" size={16} color={'#000'} />
            <Text style={[styles.approxNoteText, { color: '#000' }]}>
              We've set an approximate pin based on your selected area. Tap the
              button above if you're at the premises to set an exact location.
            </Text>
          </View>
        )}

        <Text style={[styles.label, { color: colors.text, marginTop: 24 }]}>
          Phone Number (Don't start with "0")
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.border || '#ddd',
              color: colors.text,
              backgroundColor: colors.surface,
            }
          ]}
          value={currentService?.number}
          onChangeText={handlePhoneChange}
          onBlur={handlePhoneBlur}
          placeholder="+233 244 123456"
          placeholderTextColor={colors.textSecondary || '#999'}
          keyboardType="phone-pad"
        />
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>
          e.g., 244 123456 (automatically adds +233)
        </Text>
      </View>
    </View>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 20 },
    title: { fontSize: 28, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
    subtitle: { fontSize: 16, marginBottom: 24 },
    card: { borderRadius: 15, padding: 16 },
    label: { fontWeight: '600', fontSize: 14, marginBottom: 8 },
    locationPicker: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    locationText: { flex: 1, marginLeft: 8 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 },
    currentLocButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    currentLocText: { marginLeft: 8, fontWeight: '600' },
    approxNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: 10,
      padding: 10,
      marginBottom: 16,
      gap: 6,
    },
    approxNoteText: { fontSize: 12, flex: 1, lineHeight: 16 },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
    },
    hintText: {
      fontSize: 12,
      marginTop: 4,
      marginLeft: 4,
    },
  });